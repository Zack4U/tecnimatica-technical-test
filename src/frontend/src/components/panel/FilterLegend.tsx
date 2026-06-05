import type { FilterType } from '../../hooks/useFactory.js';

type Props = {
  activeFilters: Set<FilterType>;
  onToggleFilter: (type: FilterType) => void;
};

const FILTERS: { type: FilterType; label: string; color: string }[] = [
  { type: 'temperature', label: 'Temperatura', color: 'var(--sensor-temp)' },
  { type: 'vibration',   label: 'Vibración',   color: 'var(--sensor-vib)' },
  { type: 'flow',        label: 'Flujo',        color: 'var(--sensor-flow)' },
  { type: 'pressure',    label: 'Presión',      color: 'var(--sensor-pres)' },
  { type: 'paused',      label: 'Pausados',     color: 'var(--sensor-paused)' },
  { type: 'alert',       label: 'En alerta',    color: 'var(--sensor-alert)' },
];

export function FilterLegend({ activeFilters, onToggleFilter }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {FILTERS.map(({ type, label, color }) => {
        const hidden = activeFilters.has(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleFilter(type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.2rem 0',
              opacity: hidden ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
            aria-label={`${hidden ? 'Mostrar' : 'Ocultar'} sensores de tipo ${label}`}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                textDecoration: hidden ? 'line-through' : 'none',
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
