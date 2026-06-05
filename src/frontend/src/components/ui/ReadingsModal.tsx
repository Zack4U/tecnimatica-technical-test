import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { getReadings } from '../../services/api.js';
import type { Reading } from '../../types/Reading.js';
import type { SensorResponse } from '../../types/Sensor.js';
import type { ZoneResponse } from '../../types/Zone.js';
import type { MonitoringResponse } from '../../types/Monitoring.js';

const SENSOR_COLOR: Record<string, string> = {
  temperature: 'var(--sensor-temp)',
  pressure:    'var(--sensor-pres)',
  vibration:   'var(--sensor-vib)',
  flow:        'var(--sensor-flow)',
};

const SENSOR_UNITS: Record<string, string> = {
  temperature: '°C',
  pressure:    ' bar',
  vibration:   ' mm/s',
  flow:        ' L/min',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function fmtDiff(value: number, threshold: number): string {
  const diff = Number((value - threshold).toFixed(2));
  return diff >= 0 ? `+${diff}` : `${diff}`;
}

type Props = {
  monitoringId:   string;
  monitoring:     MonitoringResponse;
  sensor:         SensorResponse;
  availableZones: ZoneResponse[];
  selectedZoneId: string;
  onZoneChange:   (zoneId: string) => void;
  onClose:        () => void;
};

export function ReadingsModal({
  monitoringId,
  monitoring,
  sensor,
  availableZones,
  selectedZoneId,
  onZoneChange,
  onClose,
}: Props) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const content = (
    <ModalContent
      monitoringId={monitoringId}
      monitoring={monitoring}
      sensor={sensor}
      availableZones={availableZones}
      selectedZoneId={selectedZoneId}
      onZoneChange={onZoneChange}
    />
  );

  if (isMobile) {
    return (
      <motion.div
        key="readings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }}
        onClick={onClose}
      >
        <motion.div
          key="readings-drawer"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          onDragEnd={(_e, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) onClose();
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '1rem 1rem 0 0',
            maxHeight: '90vh', overflowY: 'auto',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div style={{ width: 40, height: 4, backgroundColor: 'var(--border-ui)', borderRadius: 2, margin: '0.75rem auto' }} />
          <ModalHeader title={`Historial — ${sensor.name}`} onClose={onClose} />
          <div style={{ padding: '0.5rem 1rem 1.5rem' }}>{content}</div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="readings-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <motion.div
        key="readings-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '0.75rem',
          width: '100%', maxWidth: 620, maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <ModalHeader title={`Historial — ${sensor.name}`} onClose={onClose} />
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>{content}</div>
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-ui)',
    }}>
      <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <button
        type="button" onClick={onClose} aria-label="Cerrar"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, padding: '0.2rem' }}
      >×</button>
    </div>
  );
}

type ContentProps = {
  monitoringId:   string;
  monitoring:     MonitoringResponse;
  sensor:         SensorResponse;
  availableZones: ZoneResponse[];
  selectedZoneId: string;
  onZoneChange:   (zoneId: string) => void;
};

function ModalContent({
  monitoringId,
  monitoring,
  sensor,
  availableZones,
  selectedZoneId,
  onZoneChange,
}: ContentProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReadings(monitoringId, 20);
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar lecturas');
    } finally {
      setLoading(false);
    }
  }, [monitoringId]);

  useEffect(() => { void load(); }, [load]);

  const sensorColor = SENSOR_COLOR[sensor.type] ?? 'var(--accent)';
  const unit        = SENSOR_UNITS[sensor.type] ?? '';
  const threshold   = monitoring.threshold_value;

  // Datos del chart en orden ASC (ya vienen así del backend)
  const chartData = readings.map((r) => ({
    time: fmtTime(r.recorded_at),
    value: r.value,
    recorded_at: r.recorded_at,
  }));

  // Tabla en orden DESC (más reciente arriba)
  const tableRows = [...readings].reverse();

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Selector de zona (solo si hay más de una) */}
      {availableZones.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zona:</span>
          {availableZones.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => onZoneChange(z.id)}
              style={{
                padding: '4px 10px', borderRadius: 6,
                border: '1px solid',
                borderColor: selectedZoneId === z.id ? 'var(--accent)' : 'var(--border-ui)',
                backgroundColor: selectedZoneId === z.id ? 'var(--accent-subtle)' : 'transparent',
                color: selectedZoneId === z.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              }}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Últimas {readings.length} lecturas
        </div>

        {loading ? (
          <div style={{ height: 200, backgroundColor: 'var(--bg-surface)', borderRadius: 8, animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        ) : error ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sensor-alert)', fontSize: '0.8rem' }}>
            {error}
          </div>
        ) : readings.length === 0 ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Aún no hay lecturas registradas para este sensor
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="readingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sensorColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={sensorColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip unit={unit} threshold={threshold} sensorColor={sensorColor} />} />
              <ReferenceLine
                y={threshold}
                stroke="var(--sensor-alert)"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                label={{ value: 'Umbral', position: 'insideTopRight', fontSize: 9, fill: 'var(--sensor-alert)' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={sensorColor}
                strokeWidth={2}
                fill="url(#readingGrad)"
                dot={false}
                activeDot={{ r: 4, fill: sensorColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabla */}
      {!loading && tableRows.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Detalle
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-ui)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)' }}>
                  {['Timestamp', 'Valor', 'vs Umbral'].map((h) => (
                    <th key={h} style={{
                      padding: '6px 10px', textAlign: 'left',
                      color: 'var(--text-muted)', fontWeight: 600,
                      fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                      borderBottom: '1px solid var(--border-ui)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => {
                  const isAlert = r.value > threshold;
                  const diff    = fmtDiff(r.value, threshold);
                  return (
                    <tr
                      key={r.id}
                      style={{
                        backgroundColor: isAlert ? 'rgba(220,38,38,0.05)' : 'transparent',
                        borderBottom: '1px solid var(--border-ui)',
                      }}
                    >
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtTime(r.recorded_at)}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: isAlert ? 'var(--sensor-alert)' : 'var(--text-primary)' }}>
                        {r.value}{unit}
                      </td>
                      <td style={{ padding: '6px 10px', color: isAlert ? 'var(--sensor-alert)' : 'var(--sensor-vib)', fontWeight: 600 }}>
                        {diff}{unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Tooltip personalizado del chart
function ChartTooltip({
  active, payload,
  unit, threshold, sensorColor,
}: TooltipProps<number, string> & { unit: string; threshold: number; sensorColor: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (entry?.value === undefined) return null;
  const val     = entry.value;
  const isAlert = val > threshold;

  return (
    <div style={{
      backgroundColor: 'var(--bg-panel)',
      border: `1px solid ${isAlert ? 'var(--sensor-alert)' : 'var(--border-ui)'}`,
      borderRadius: 6, padding: '6px 10px',
      fontSize: '0.72rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontWeight: 700, color: isAlert ? 'var(--sensor-alert)' : sensorColor }}>
        {val}{unit}
      </div>
      {isAlert && (
        <div style={{ color: 'var(--sensor-alert)', fontSize: '0.65rem' }}>↑ sobre umbral</div>
      )}
    </div>
  );
}
