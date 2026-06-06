import { motion } from 'framer-motion';
import type { SensorResponse, SensorType } from '../../types/Sensor.js';
import type { MonitoringResponse } from '../../types/Monitoring.js';

const TYPE_COLOR: Record<SensorType, string> = {
  temperature: 'var(--sensor-temp)',
  vibration:   'var(--sensor-vib)',
  flow:        'var(--sensor-flow)',
  pressure:    'var(--sensor-pres)',
};

const TYPE_LABEL: Record<SensorType, string> = {
  temperature: 'T',
  vibration:   'V',
  flow:        'F',
  pressure:    'P',
};

type Props = {
  sensor: SensorResponse;
  monitorings: MonitoringResponse[];
  cx: number;
  cy: number;
  isSelected: boolean;
  isVisible: boolean;
  justUpdated: boolean;
  index: number;
  onClick: () => void;
};

export function SensorMarker({
  sensor,
  monitorings,
  cx,
  cy,
  isSelected,
  isVisible,
  justUpdated,
  index,
  onClick,
}: Props) {
  if (!isVisible) return null;

  // Estado compuesto de todos los monitoreos de esta instancia
  const isPaused = monitorings.every((m) => m.status === 'paused');

  const isAlert = !isPaused && monitorings.some(
    (m) => m.status === 'active' &&
           m.current_value !== null &&
           m.current_value !== undefined &&
           m.current_value > m.threshold_value
  );

  // Cerca del umbral: valor activo ≥ 80 % del umbral pero sin superarlo
  const isNearThreshold = !isPaused && !isAlert && monitorings.some(
    (m) => m.status === 'active' &&
           m.current_value !== null &&
           m.current_value !== undefined &&
           m.threshold_value > 0 &&
           m.current_value / m.threshold_value >= 0.8
  );

  const baseColor = isAlert
    ? 'var(--sensor-alert)'
    : isPaused
    ? 'var(--sensor-paused)'
    : TYPE_COLOR[sensor.type];

  // Naranja para "cerca del umbral", rojo para "superado"
  const ringColor  = isAlert ? 'var(--sensor-alert)' : 'var(--sensor-temp)';
  const shouldPulse = !isPaused && (isAlert || isNearThreshold);
  const pulseClass  = isAlert ? 'sensor-ring-fast' : 'sensor-ring';

  const code = `${TYPE_LABEL[sensor.type]}${index + 1}`;

  return (
    <motion.g
      style={{ cursor: 'pointer', opacity: isPaused ? 0.5 : 1 }}
      onClick={onClick}
      role="button"
      aria-label={`Sensor: ${sensor.name}`}
      animate={justUpdated ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <title>{sensor.name}</title>

      {/* Anillo pulsante: naranja si cerca del umbral, rojo si superado */}
      {shouldPulse && (
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="none"
          stroke={ringColor}
          strokeWidth={1.5}
          className={pulseClass}
        />
      )}

      {/* Círculo principal — estático */}
      <circle
        cx={cx}
        cy={cy}
        r={14}
        fill="var(--bg-panel)"
        stroke={baseColor}
        strokeWidth={isAlert || isSelected ? 2 : 1.5}
        strokeDasharray={isPaused ? '3 2' : undefined}
      />

      {/* Ring de selección */}
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={19}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.8}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Etiqueta principal (código) */}
      <text
        x={cx}
        y={cy + 4.5}
        textAnchor="middle"
        fontSize={9}
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        fill={baseColor}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {code}
      </text>
    </motion.g>
  );
}
