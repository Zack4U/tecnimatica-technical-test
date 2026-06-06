import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZoneResponse } from '../../types/Zone.js';
import type { SensorResponse } from '../../types/Sensor.js';
import type { MonitoringResponse } from '../../types/Monitoring.js';
import type { FilterType } from '../../hooks/useFactory.js';
import type { Reading } from '../../types/Reading.js';
import { Badge } from '../ui/Badge.js';
import { updateMonitoring } from '../../services/api.js';
import { MonitoringEditModal, MonitoringDeleteModal } from '../ui/MonitoringActionModal.js';
import { timeAgo } from '../../utils/time.js';

type ActionModal = 'edit' | 'delete' | null;

const SENSOR_UNITS: Record<string, string> = {
  temperature: '°C',
  pressure:    ' bar',
  vibration:   ' mm/s',
  flow:        ' L/min',
};


type Props = {
  selectedZone: ZoneResponse | null;
  selectedSensor: SensorResponse | null;
  selectedMonitorings: MonitoringResponse[];
  activeFilters: Set<FilterType>;
  latestReadings: Record<string, Reading>;
  onToggleFilter: (type: FilterType) => void;
  onAddSensor: () => void;
  onCreateSensor: () => void;
  onRefresh: () => Promise<void>;
  onViewHistory: (monitoringId: string) => void;
  showToast: (msg: string, variant: 'success' | 'error') => void;
  isOpen: boolean;
  onToggleOpen: () => void;
};

const READING_LABELS: Record<string, string> = {
  temperature: 'Temperatura',
  pressure:    'Presión',
  vibration:   'Vibración',
  flow:        'Flujo',
};

const SENSOR_TYPE_LABELS: Record<string, string> = {
  temperature: 'Temperatura',
  vibration:   'Vibración',
  flow:        'Flujo',
  pressure:    'Presión',
};

const FILTERS: { type: FilterType; label: string; color: string }[] = [
  { type: 'temperature', label: 'Temperatura', color: 'var(--sensor-temp)' },
  { type: 'vibration',   label: 'Vibración',   color: 'var(--sensor-vib)' },
  { type: 'flow',        label: 'Flujo',        color: 'var(--sensor-flow)' },
  { type: 'pressure',    label: 'Presión',      color: 'var(--sensor-pres)' },
  { type: 'paused',      label: 'Pausados',     color: 'var(--sensor-paused)' },
  { type: 'alert',       label: 'En alerta',    color: 'var(--sensor-alert)' },
];

export function DetailPanel({
  selectedZone,
  selectedSensor,
  selectedMonitorings,
  activeFilters,
  latestReadings,
  onToggleFilter,
  onAddSensor,
  onCreateSensor,
  onRefresh,
  onViewHistory,
  showToast,
  isOpen,
  onToggleOpen,
}: Props) {
  const [detailOpen, setDetailOpen]   = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [legendOpen, setLegendOpen]   = useState(true);
  const [actionModal, setActionModal] = useState<ActionModal>(null);

  const anyAlert = selectedMonitorings.some(
    (m) => m.current_value !== null && m.current_value !== undefined &&
           m.current_value > m.threshold_value,
  );

  const hasMonitorings = selectedMonitorings.length > 0;

  async function handleToggleStatus(m: MonitoringResponse) {
    try {
      await updateMonitoring(m.id, {
        status: m.status === 'active' ? 'paused' : 'active',
      });
      await onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar estado', 'error');
    }
  }

  return (
    <>
      <aside
        style={{
          width: '100%', height: '100%',
          backgroundColor: 'var(--bg-panel)',
          borderLeft: '1px solid var(--border-ui)',
          display: 'flex', flexDirection: 'column',
          fontSize: '0.75rem', color: 'var(--text-primary)',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
              {/* ── DETALLE ── */}
              <PanelSection title="Detalle" open={detailOpen} onToggle={() => setDetailOpen((v) => !v)}>
                {!selectedZone && !selectedSensor ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0, lineHeight: 1.5 }}>
                    Selecciona una zona o sensor en el plano
                  </p>
                ) : selectedZone && !selectedSensor ? (
                  <ZoneDetail zone={selectedZone} />
                ) : selectedSensor ? (
                  <SensorDetail
                    sensor={selectedSensor}
                    monitorings={selectedMonitorings}
                    anyAlert={anyAlert}
                    latestReadings={latestReadings}
                    onToggleStatus={handleToggleStatus}
                  />
                ) : null}
              </PanelSection>

              {/* ── ACCIONES ── */}
              <PanelSection title="Acciones" open={actionsOpen} onToggle={() => setActionsOpen((v) => !v)}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <ActionBtn icon={<PlusIcon />}     label="Agregar sensor a zona"  onClick={onAddSensor} />
                  <ActionBtn icon={<UserPlusIcon />} label="Crear nuevo sensor"      onClick={onCreateSensor} />
                  {hasMonitorings && (
                    <>
                      <ActionBtn icon={<HistoryIcon size={16} />} label="Ver historial de lecturas" onClick={() => onViewHistory(selectedMonitorings[0]!.id)} />
                      <ActionBtn icon={<PencilIcon />} label="Editar monitoreo"   onClick={() => setActionModal('edit')} />
                      <ActionBtn icon={<TrashIcon />}  label="Eliminar monitoreo" onClick={() => setActionModal('delete')} danger />
                    </>
                  )}
                </div>
              </PanelSection>

              {/* ── LEYENDA / FILTROS ── */}
              <PanelSection title="Leyenda / Filtros" open={legendOpen} onToggle={() => setLegendOpen((v) => !v)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {FILTERS.map(({ type, label, color }) => {
                    const hidden = activeFilters.has(type);
                    return (
                      <label
                        key={type}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 0', cursor: 'pointer',
                          opacity: hidden ? 0.4 : 1, transition: 'opacity 0.15s',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {label}
                        </span>
                        <input
                          type="checkbox"
                          checked={!hidden}
                          onChange={() => onToggleFilter(type)}
                          style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                          aria-label={`${hidden ? 'Mostrar' : 'Ocultar'} ${label}`}
                        />
                      </label>
                    );
                  })}
                </div>
              </PanelSection>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle bottom */}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label={isOpen ? 'Contraer panel' : 'Expandir panel'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 5, padding: '9px 12px',
            borderTop: '1px solid var(--border-ui)',
            background: 'none', border: 'none',
            borderTop: '1px solid var(--border-ui)',
            cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: '0.6rem', fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          <motion.span animate={{ rotate: isOpen ? 0 : 180 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
            <ChevronDown size={10} />
          </motion.span>
          {isOpen ? 'Contraer' : 'Expandir'}
        </button>
      </aside>

      {/* ── Modales de acción ── */}
      {actionModal === 'edit' && selectedMonitorings.length > 0 && (
        <MonitoringEditModal
          monitorings={selectedMonitorings}
          onSuccess={onRefresh}
          onClose={() => setActionModal(null)}
          showToast={showToast}
        />
      )}
      {actionModal === 'delete' && selectedMonitorings.length > 0 && (
        <MonitoringDeleteModal
          monitorings={selectedMonitorings}
          onSuccess={onRefresh}
          onClose={() => setActionModal(null)}
          showToast={showToast}
        />
      )}
    </>
  );
}

/* ── Sección colapsable ── */

function PanelSection({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-ui)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px 8px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700,
          fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
      >
        {title}
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={10} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 12px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Detalle de zona ── */

function ZoneDetail({ zone }: { zone: ZoneResponse }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <DetailRow label="Nombre" value={zone.name} bold />
      <DetailRow label="Tipo" value="Zona" />
      <DetailRow label="Estado">
        <Badge status={zone.operational_status === 'active' ? 'active' : 'paused'} />
      </DetailRow>
      <DetailRow label="Ubicación" value={zone.location} />
    </div>
  );
}

/* ── Detalle de sensor con lecturas inline y botones pause/resume ── */

function SensorDetail({
  sensor,
  monitorings,
  anyAlert,
  latestReadings,
  onToggleStatus,
}: {
  sensor: SensorResponse;
  monitorings: MonitoringResponse[];
  anyAlert: boolean;
  latestReadings: Record<string, Reading>;
  onToggleStatus: (m: MonitoringResponse) => void;
}) {
  const unit = SENSOR_UNITS[sensor.type] ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <DetailRow label="Nombre" value={sensor.name} bold />
      <DetailRow label="Tipo" value={SENSOR_TYPE_LABELS[sensor.type] ?? sensor.type} />
      <DetailRow label="Estado">
        <Badge status={anyAlert ? 'alert' : (monitorings[0]?.status ?? 'active')} />
      </DetailRow>

      {monitorings.map((m) => {
        const latest   = latestReadings[m.id];
        const liveValue = latest?.value ?? m.current_value;
        const isAlert  =
          liveValue !== null && liveValue !== undefined &&
          liveValue > m.threshold_value;
        const pct =
          m.threshold_value > 0
            ? Math.min(100, ((liveValue ?? 0) / m.threshold_value) * 100)
            : 0;

        return (
          <div key={m.id} style={{ marginTop: 4 }}>
            {/* Encabezado de lectura con botón pause/resume */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{
                fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {m.zone.name} · {READING_LABELS[m.reading_type]}
              </span>
              <InlineBtn
                icon={m.status === 'active' ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
                label={m.status === 'active' ? 'Pausar' : 'Activar'}
                onClick={() => onToggleStatus(m)}
              />
            </div>

            {/* Valor actual (última lectura real) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>
                Actual{' '}
                <strong style={{ color: isAlert ? 'var(--sensor-alert)' : 'var(--text-primary)', fontSize: '0.7rem' }}>
                  {liveValue !== null && liveValue !== undefined ? `${liveValue}${unit}` : '—'}
                </strong>
                {latest?.recorded_at && (
                  <LiveTimestamp recordedAt={latest.recorded_at} />
                )}
              </span>
              <span>Umbral {m.threshold_value}{unit}</span>
            </div>

            {/* Barra de progreso */}
            <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--border-ui)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', backgroundColor: isAlert ? 'var(--sensor-alert)' : 'var(--accent)', borderRadius: 2 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

          </div>
        );
      })}
    </div>
  );
}

function LiveTimestamp({ recordedAt }: { recordedAt: string }) {
  const [label, setLabel] = useState(() => timeAgo(recordedAt));

  useEffect(() => {
    // Recalcula inmediatamente al montar o cuando cambia la lectura
    setLabel(timeAgo(recordedAt));
    // Refresca cada 10 s para mantener el "Hace X tiempo" actualizado
    const id = setInterval(() => setLabel(timeAgo(recordedAt)), 10_000);
    return () => clearInterval(id);
  }, [recordedAt]);

  return (
    <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginLeft: 4 }}>
      · {label}
    </span>
  );
}

/* ── Fila de detalle ── */

function DetailRow({
  label, value, bold, children,
}: { label: string; value?: string; bold?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      {children ?? (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: bold ? 700 : 400, lineHeight: 1.3 }}>
          {value}
        </span>
      )}
    </div>
  );
}

/* ── Botón acción cuadrado (barra de acciones) ── */

function ActionBtn({ icon, label, onClick, disabled, danger }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 42, height: 42,
        border: `1px solid ${danger ? 'rgba(239,68,68,0.35)' : 'var(--border-ui)'}`,
        borderRadius: 10,
        backgroundColor: 'var(--bg-surface)',
        color: danger ? 'var(--sensor-alert)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.15s',
      }}
    >{icon}</button>
  );
}

/* ── Botón inline pause/resume (dentro de cada lectura) ── */

function InlineBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} title={label} aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        border: '1px solid var(--border-ui)', borderRadius: 7,
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-muted)',
        cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >{icon}</button>
  );
}

/* ── Iconos ── */

function ChevronDown({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}
function UserPlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1 12c0-2.5 2-4 5-4M10 9v4M12 11H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}
function PencilIcon() {
  return <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M3 3l.5 7h5L9 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PauseIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><rect x="3" y="2.5" width="2.5" height="9" rx="1" fill="currentColor" /><rect x="8.5" y="2.5" width="2.5" height="9" rx="1" fill="currentColor" /></svg>;
}
function PlayIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M4 2.5l8 4.5-8 4.5V2.5z" fill="currentColor" /></svg>;
}
function HistoryIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
