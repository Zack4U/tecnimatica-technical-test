import { motion, AnimatePresence } from 'framer-motion';
import type { ZoneResponse } from '../../types/Zone.js';
import type { SensorResponse } from '../../types/Sensor.js';
import type { MonitoringResponse } from '../../types/Monitoring.js';
import type { FilterType, SensorInstance, ZoneBounds } from '../../hooks/useFactory.js';
import { ZoneShape } from './ZoneShape.js';
import { SensorMarker } from './SensorMarker.js';

type Props = {
  zones: ZoneResponse[];
  sensors: SensorResponse[];
  monitorings: MonitoringResponse[];
  zonePaths: Map<string, string>;
  zoneBoundsMap: Map<string, ZoneBounds>;
  sensorInstances: SensorInstance[];
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
  activeFilters,
  selectedZoneId,
  selectedSensorId,
  showZoneLabels,
  onZoneClick,
  onSensorClick,
}: Props) {
  // Map sensorId → índice global para etiquetas consistentes
  const sensorIndexMap = new Map(sensors.map((s, i) => [s.id, i]));

  // Map sensorId → sensor object
  const sensorById = new Map(sensors.map((s) => [s.id, s]));

  // Instancias con su objeto sensor resuelto
  const resolvedInstances = sensorInstances
    .map((inst) => ({ inst, sensor: sensorById.get(inst.sensorId) }))
    .filter((r): r is typeof r & { sensor: SensorResponse } => r.sensor !== undefined);

  // Path de la zona seleccionada para el SelectionRing
  const selectedPath = selectedZoneId ? zonePaths.get(selectedZoneId) : null;

  // Usamos monitorings para consistencia pero no necesitamos monitoringBySensor aquí
  void monitorings;

  return (
    <svg
      viewBox="0 0 430 300"
      width="100%"
      className="h-full"
      role="img"
      aria-label="Plano de planta industrial con zonas y sensores"
      style={{ display: 'block', backgroundColor: 'var(--bg-surface)' }}
    >
      <defs>
        <pattern id="dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.7" fill="var(--border-ui)" />
        </pattern>
      </defs>

      <rect width="430" height="300" fill="url(#dots)" />

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

      {/* Ring de selección de zona — dibujado SOBRE el path de la zona */}
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
              <text
                x={cx} y={cy - 5}
                textAnchor="middle"
                fontSize={8} fontWeight="600"
                fontFamily="Inter, sans-serif"
                fill="var(--text-secondary)" opacity={0.85}
              >
                {truncate(zone.name, maxChars)}
              </text>
              <text
                x={cx} y={cy + 7}
                textAnchor="middle"
                fontSize={6.5}
                fontFamily="Inter, sans-serif"
                fill="var(--text-muted)" opacity={0.75}
              >
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
            index={globalIndex}
            onClick={() => onSensorClick(sensor.id)}
          />
        );
      })}
    </svg>
  );
}
