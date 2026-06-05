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
  monitorings: MonitoringResponse[];  // todos los monitoreos de esta instancia
  cx: number;
  cy: number;
  isSelected: boolean;
  isVisible: boolean;
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
  index,
  onClick,
}: Props) {
  if (!isVisible) return null;

  // Estado compuesto de todos los monitoreos de esta instancia
  const isPaused = monitorings.every((m) => m.status === 'paused');
  const isAlert = !isPaused && monitorings.some(
    (m) => m.current_value !== null &&
           m.current_value !== undefined &&
           m.current_value > m.threshold_value
  );

  const baseColor = isAlert
    ? 'var(--sensor-alert)'
    : isPaused
    ? 'var(--sensor-paused)'
    : TYPE_COLOR[sensor.type];

  // Solo emite pulso si está en ALERTA (rojo) o es TEMPERATURA (naranja)
  const shouldPulse = !isPaused && (isAlert || sensor.type === 'temperature');
  const pulseClass = shouldPulse
    ? isAlert ? 'sensor-ring-fast' : 'sensor-ring'
    : '';

  const code = `${TYPE_LABEL[sensor.type]}${index + 1}`;

  return (
    <g
      style={{ cursor: 'pointer', opacity: isPaused ? 0.5 : 1 }}
      onClick={onClick}
      role="button"
      aria-label={`Sensor: ${sensor.name}`}
    >
      <title>{sensor.name}</title>

      {/* Anillo pulsante (solo alerta o temperatura) */}
      {shouldPulse && (
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="none"
          stroke={baseColor}
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
    </g>
  );
}
