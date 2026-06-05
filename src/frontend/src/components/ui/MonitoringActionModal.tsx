import { useState } from 'react';
import { motion } from 'framer-motion';
import { FormOverlay } from './FormOverlay.js';
import { updateMonitoring, deleteMonitoring } from '../../services/api.js';
import type { MonitoringResponse, MonitoringStatus } from '../../types/Monitoring.js';

const READING_LABELS: Record<string, string> = {
  temperature: 'Temperatura',
  pressure:    'Presión',
  vibration:   'Vibración',
  flow:        'Flujo',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  paused: 'Pausado',
};

// ── Edit Modal ────────────────────────────────────────────────────────────────

type EditProps = {
  monitorings: MonitoringResponse[];
  onSuccess: () => Promise<void>;
  onClose: () => void;
  showToast: (msg: string, variant: 'success' | 'error') => void;
};

export function MonitoringEditModal({ monitorings, onSuccess, onClose, showToast }: EditProps) {
  const [selectedId, setSelectedId] = useState(monitorings[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMonitoring = monitorings.find((m) => m.id === selectedId) ?? monitorings[0];

  async function handleConfirm(threshold: string, currentVal: string, status: MonitoringStatus) {
    const thr = parseFloat(threshold);
    if (!threshold || isNaN(thr) || thr <= 0) {
      setError('El umbral debe ser un número mayor que cero');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateMonitoring(selectedId, {
        threshold_value: thr,
        current_value: currentVal !== '' ? parseFloat(currentVal) : undefined,
        status,
      });
      showToast('Monitoreo actualizado', 'success');
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormOverlay isOpen onClose={onClose} title="Editar monitoreo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Grilla de selección — solo si hay más de un monitoreo */}
        {monitorings.length > 1 && (
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Selecciona el monitoreo a editar
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {monitorings.map((m) => (
                <MonitoringRow
                  key={m.id}
                  monitoring={m}
                  selected={m.id === selectedId}
                  onClick={() => setSelectedId(m.id)}
                  selectable
                />
              ))}
            </div>
          </div>
        )}

        {/* Contexto cuando solo hay un monitoreo */}
        {monitorings.length === 1 && selectedMonitoring && (
          <MonitoringRow monitoring={selectedMonitoring} selected={false} />
        )}

        {/* Campos de edición — key fuerza re-mount al cambiar selección, evitando useEffect */}
        {selectedMonitoring && (
          <EditFormBody
            key={selectedMonitoring.id}
            monitoring={selectedMonitoring}
            loading={loading}
            error={error}
            onConfirm={handleConfirm}
            onCancel={onClose}
          />
        )}
      </div>
    </FormOverlay>
  );
}

// EditFormBody inicializa estado desde props directamente; el key externo reinicia el componente
function EditFormBody({
  monitoring,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  monitoring: MonitoringResponse;
  loading: boolean;
  error: string | null;
  onConfirm: (threshold: string, currentVal: string, status: MonitoringStatus) => Promise<void>;
  onCancel: () => void;
}) {
  const [threshold, setThreshold]   = useState(monitoring.threshold_value.toString());
  const [currentVal, setCurrentVal] = useState(monitoring.current_value?.toString() ?? '');
  const [status, setStatus]         = useState<MonitoringStatus>(monitoring.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Datos
      </p>

      <FormField label="Valor umbral">
        <input
          type="number" min="0.01" step="0.01" placeholder="Ej: 85.00"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          style={inputStyle}
        />
      </FormField>

      <FormField label="Valor actual (opcional)">
        <input
          type="number" min="0" step="0.01" placeholder="Ej: 72.50"
          value={currentVal}
          onChange={(e) => setCurrentVal(e.target.value)}
          style={inputStyle}
        />
      </FormField>

      <FormField label="Estado">
        <select value={status} onChange={(e) => setStatus(e.target.value as MonitoringStatus)} style={inputStyle}>
          <option value="active">Activo</option>
          <option value="paused">Pausado</option>
        </select>
      </FormField>

      {error && (
        <p style={{ margin: 0, color: 'var(--sensor-alert)', fontSize: '0.75rem' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} disabled={loading} style={secondaryBtn}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => { void onConfirm(threshold, currentVal, status); }}
          disabled={loading}
          style={primaryBtn}
        >
          {loading ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

type DeleteProps = {
  monitorings: MonitoringResponse[];
  onSuccess: () => Promise<void>;
  onClose: () => void;
  showToast: (msg: string, variant: 'success' | 'error') => void;
};

export function MonitoringDeleteModal({ monitorings, onSuccess, onClose, showToast }: DeleteProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(monitorings.map((m) => m.id)));
  const [loading, setLoading]   = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await Promise.all([...selected].map((id) => deleteMonitoring(id)));
      const count = selected.size;
      showToast(count === 1 ? 'Monitoreo eliminado' : `${count} monitoreos eliminados`, 'success');
      await onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormOverlay isOpen onClose={onClose} title="Eliminar monitoreo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Selecciona los monitoreos a eliminar. Esta acción no se puede deshacer.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {monitorings.map((m) => (
            <MonitoringRow
              key={m.id}
              monitoring={m}
              selected={selected.has(m.id)}
              onClick={() => toggle(m.id)}
              selectable
              checkable
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} style={secondaryBtn}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { void handleConfirm(); }}
            disabled={loading || selected.size === 0}
            style={dangerBtn}
          >
            {loading ? 'Eliminando…' : `Confirmar (${selected.size})`}
          </button>
        </div>
      </div>
    </FormOverlay>
  );
}

// ── Fila de monitoreo ─────────────────────────────────────────────────────────

function MonitoringRow({
  monitoring: m,
  selected,
  onClick,
  selectable = false,
  checkable = false,
}: {
  monitoring: MonitoringResponse;
  selected: boolean;
  onClick?: () => void;
  selectable?: boolean;
  checkable?: boolean;
}) {
  const isAlert =
    m.current_value !== null &&
    m.current_value !== undefined &&
    m.current_value > m.threshold_value;

  return (
    <motion.div
      layout
      onClick={selectable ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 8,
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-ui)'}`,
        backgroundColor: selected ? 'var(--accent-subtle)' : 'var(--bg-surface)',
        cursor: selectable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {checkable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onClick?.()}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 15, height: 15, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.zone.name}
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: 4, flexShrink: 0, backgroundColor: 'var(--border-ui)', color: 'var(--text-muted)' }}>
            {READING_LABELS[m.reading_type] ?? m.reading_type}
          </span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
            backgroundColor: m.status === 'active' ? 'rgba(34,197,94,0.15)' : 'var(--border-ui)',
            color: m.status === 'active' ? 'rgb(34,197,94)' : 'var(--text-muted)',
          }}>
            {STATUS_LABELS[m.status] ?? m.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>Actual: <strong style={{ color: isAlert ? 'var(--sensor-alert)' : 'var(--text-secondary)' }}>{m.current_value ?? '—'}</strong></span>
          <span>Umbral: <strong style={{ color: 'var(--text-secondary)' }}>{m.threshold_value}</strong></span>
        </div>
      </div>

      {selectable && !checkable && (
        <div style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-ui)'}`,
          backgroundColor: selected ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Helpers de formulario ──────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem', borderRadius: '0.35rem',
  border: '1px solid var(--border-ui)',
  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
  fontSize: '0.8rem', outline: 'none', width: '100%',
};

const primaryBtn: React.CSSProperties = {
  backgroundColor: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: '0.4rem',
  padding: '0.5rem 1.25rem', cursor: 'pointer',
  fontSize: '0.8rem', fontWeight: 600,
};

const dangerBtn: React.CSSProperties = {
  backgroundColor: 'var(--sensor-alert)', color: '#fff',
  border: 'none', borderRadius: '0.4rem',
  padding: '0.5rem 1.25rem', cursor: 'pointer',
  fontSize: '0.8rem', fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
  border: '1px solid var(--border-ui)', borderRadius: '0.4rem',
  padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem',
};
