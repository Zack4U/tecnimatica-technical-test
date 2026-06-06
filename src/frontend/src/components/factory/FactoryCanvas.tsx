import { motion, AnimatePresence } from 'framer-motion';
import type { ZoneResponse } from '../../types/Zone.js';
import type { SensorResponse } from '../../types/Sensor.js';
import type { MonitoringResponse } from '../../types/Monitoring.js';
import type { FilterType, SensorInstance, ZoneBounds } from '../../hooks/useFactory.js';
import { useCanvasTransform } from '../../hooks/useCanvasTransform.js';
import { ZoneShape } from './ZoneShape.js';
import { SensorMarker } from './SensorMarker.js';

type Props = {
  zones: ZoneResponse[];
  sensors: SensorResponse[];
  monitorings: MonitoringResponse[];
  zonePaths: Map<string, string>;
  zoneBoundsMap: Map<string, ZoneBounds>;
  sensorInstances: SensorInstance[];
  recentlyUpdated: Set<string>;
  activeFilters: Set<FilterType>;
  selectedZoneId: string | null;
  selectedSensorId: string | null;
  showZoneLabels: boolean;
  onZoneClick: (id: string) => void;
  onSensorClick: (id: string) => void;
};

function isSensorInstanceVisible(
  instance: SensorInstance,
  sensor: SensorResponse,
  activeFilters: Set<FilterType>
): boolean {
  if (activeFilters.size === 0) return true;
  if (activeFilters.has(sensor.type)) return false;
  const allPaused = instance.monitorings.every((m) => m.status === 'paused');
  if (allPaused && activeFilters.has('paused')) return false;
  const anyAlert = instance.monitorings.some(
    (m) => m.current_value !== null &&
           m.current_value !== undefined &&
           m.current_value > m.threshold_value
  );
  if (anyAlert && activeFilters.has('alert')) return false;
  return true;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function FactoryCanvas({
  zones,
  sensors,
  monitorings,
  zonePaths,
  zoneBoundsMap,
  sensorInstances,
  recentlyUpdated,
  activeFilters,
  selectedZoneId,
  selectedSensorId,
  showZoneLabels,
  onZoneClick,
  onSensorClick,
}: Props) {
  const { svgRef, transform, isModified, isPanning, reset, mouseHandlers } =
    useCanvasTransform();

  const sensorIndexMap = new Map(sensors.map((s, i) => [s.id, i]));
  const sensorById     = new Map(sensors.map((s) => [s.id, s]));

  const resolvedInstances = sensorInstances
    .map((inst) => ({ inst, sensor: sensorById.get(inst.sensorId) }))
    .filter((r): r is typeof r & { sensor: SensorResponse } => r.sensor !== undefined);

  const selectedPath = selectedZoneId ? zonePaths.get(selectedZoneId) : null;

  void monitorings;

  const zoomPct = `${Math.round(transform.scale * 100)}%`;

  return (
    // Wrapper relativo para posicionar el botón de reset flotante
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 430 300"
        width="100%"
        height="100%"
        role="img"
        aria-label="Plano de planta industrial con zonas y sensores. Rueda para zoom, arrastra para mover, teclas +/-/0 y flechas."
        tabIndex={0}
        style={{
          display: 'block',
          backgroundColor: 'var(--bg-surface)',
          cursor: isPanning ? 'grabbing' : 'grab',
          outline: 'none',
          touchAction: 'none',  // desactiva el scroll/zoom nativo del navegador en touch
          userSelect: 'none',
        }}
        {...mouseHandlers}
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="0.7" fill="var(--border-ui)" />
          </pattern>
        </defs>

        {/* Todo el contenido dentro del grupo con la transformación de zoom/pan */}
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          <rect width="430" height="300" fill="url(#dots)" style={{ cursor: 'inherit' }} />

          {/* Zonas */}
          {zones.map((zone) => {
            const path = zonePaths.get(zone.id);
            if (!path) return null;
            return (
              <ZoneShape
                key={zone.id}
                zone={zone}
                path={path}
                isSelected={selectedZoneId === zone.id}
                onClick={() => onZoneClick(zone.id)}
              />
            );
          })}

          {/* Ring de selección de zona */}
          <AnimatePresence>
            {selectedPath && (
              <motion.path
                key={selectedZoneId}
                d={selectedPath}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </AnimatePresence>

          {/* Etiquetas de zona */}
          <AnimatePresence>
            {showZoneLabels && zones.map((zone) => {
              const b = zoneBoundsMap.get(zone.id);
              if (!b || b.h < 40) return null;
              const cx = b.x + b.w / 2;
              const cy = b.y + b.h / 2;
              const maxChars = Math.floor(b.w / 5.5);
              return (
                <motion.g
                  key={`label-${zone.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <text x={cx} y={cy - 5} textAnchor="middle" fontSize={8} fontWeight="600"
                    fontFamily="Inter, sans-serif" fill="var(--text-secondary)" opacity={0.85}>
                    {truncate(zone.name, maxChars)}
                  </text>
                  <text x={cx} y={cy + 7} textAnchor="middle" fontSize={6.5}
                    fontFamily="Inter, sans-serif" fill="var(--text-muted)" opacity={0.75}>
                    {truncate(zone.location, maxChars + 4)}
                  </text>
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Sensores */}
          {resolvedInstances.map(({ inst, sensor }) => {
            const globalIndex = sensorIndexMap.get(sensor.id) ?? 0;
            const visible = isSensorInstanceVisible(inst, sensor, activeFilters);
            return (
              <SensorMarker
                key={inst.key}
                sensor={sensor}
                monitorings={inst.monitorings}
                cx={inst.cx}
                cy={inst.cy}
                isSelected={selectedSensorId === sensor.id}
                isVisible={visible}
                justUpdated={inst.monitorings.some((m) => recentlyUpdated.has(m.id))}
                index={globalIndex}
                onClick={() => onSensorClick(sensor.id)}
              />
            );
          })}
        </g>
      </svg>

      {/* ── Botón flotante de restablecimiento ── */}
      <AnimatePresence>
        {isModified && (
          <motion.button
            key="reset-btn"
            type="button"
            onClick={reset}
            title="Restablecer vista (tecla 0)"
            aria-label="Restablecer vista"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: 92,  // por encima del SimulatorBar (~80px)
              right: 12,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border-ui)',
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-secondary)',
              fontSize: '0.7rem', fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              zIndex: 5,
            }}
          >
            <ResetIcon />
            <span>Restablecer</span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-subtle)',
              padding: '1px 6px', borderRadius: 4,
            }}>
              {zoomPct}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 7A5 5 0 1 1 7 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 4v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
