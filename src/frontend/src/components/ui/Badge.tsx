import type { MonitoringStatus } from '../../types/Monitoring.js';

type BadgeVariant = MonitoringStatus | 'alert';

type Props = {
  status: BadgeVariant;
  size?: 'sm' | 'md';
};

const VARIANTS: Record<BadgeVariant, { bg: string; text: string; label: string }> = {
  active: {
    bg: 'rgba(26,138,90,0.12)',
    text: 'var(--sensor-vib)',
    label: 'Activo',
  },
  paused: {
    bg: 'rgba(148,163,184,0.15)',
    text: 'var(--sensor-paused)',
    label: 'Pausado',
  },
  alert: {
    bg: 'rgba(220,38,38,0.1)',
    text: 'var(--sensor-alert)',
    label: 'Alerta',
  },
};

export function Badge({ status, size = 'sm' }: Props) {
  const v = VARIANTS[status];
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem';
  const px = size === 'sm' ? '0.4rem' : '0.5rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        backgroundColor: v.bg,
        color: v.text,
        fontSize,
        fontWeight: 600,
        padding: `0.15rem ${px}`,
        borderRadius: '999px',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: v.text,
          flexShrink: 0,
        }}
      />
      {v.label}
    </span>
  );
}
