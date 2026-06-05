import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SimulatorState, LastBatch } from '../../hooks/useSimulator.js';

const SPEED_OPTIONS = [1, 3, 5, 10] as const;

function timeAgoSecs(date: Date): string {
  return `hace ${Math.floor((Date.now() - date.getTime()) / 1000)}s`;
}

function BatchStatus({ lastBatch }: { lastBatch: LastBatch }) {
  const [label, setLabel] = useState(() => timeAgoSecs(lastBatch.timestamp));

  useEffect(() => {
    setLabel(timeAgoSecs(lastBatch.timestamp));
    const id = setInterval(() => setLabel(timeAgoSecs(lastBatch.timestamp)), 1000);
    return () => clearInterval(id);
  }, [lastBatch]);

  const hasSkipped = lastBatch.skipped > 0;
  return (
    <span style={{
      fontSize: '0.65rem', color: hasSkipped ? '#D97706' : 'var(--text-muted)',
      whiteSpace: 'nowrap',
    }}>
      {label} · {lastBatch.created} creadas
      {hasSkipped ? ` · ${lastBatch.skipped} omitidas` : ''}
    </span>
  );
}

type Props = SimulatorState;

export function SimulatorBar({
  isRunning, intervalSeconds, lastBatch, error,
  start, pause, setIntervalSeconds,
}: Props) {
  const dotColor = error
    ? 'var(--sensor-alert)'
    : isRunning
    ? '#1A8A5A'
    : 'var(--text-muted)';

  return (
    <div style={{
      height: 48, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px',
      backgroundColor: 'var(--bg-panel)',
      borderTop: '0.5px solid var(--border-ui)',
      flexShrink: 0, zIndex: 10,
      fontSize: '0.72rem',
      overflowX: 'auto',
    }}>
      {/* Indicador de estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
          animation: isRunning && !error
            ? 'sim-pulse 1.5s ease-in-out infinite'
            : error
            ? 'sim-pulse 0.6s ease-in-out infinite'
            : 'none',
        }} />
        <span style={{ fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.6rem' }}>
          Simulador
        </span>
      </div>

      {/* Botón Iniciar / Pausar */}
      <motion.button
        layout
        type="button"
        onClick={isRunning ? pause : start}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 7,
          border: '1px solid var(--border-ui)',
          backgroundColor: isRunning ? 'var(--accent-subtle)' : 'var(--bg-surface)',
          color: isRunning ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem',
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isRunning ? (
            <motion.span key="pause" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
              <PauseIcon />
            </motion.span>
          ) : (
            <motion.span key="play" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
              <PlayIcon />
            </motion.span>
          )}
        </AnimatePresence>
        {isRunning ? 'Pausar' : 'Iniciar'}
      </motion.button>

      {/* Selector de velocidad */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 2 }}>Cada:</span>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setIntervalSeconds(s)}
            style={{
              padding: '3px 8px', borderRadius: 5, border: '1px solid',
              borderColor: intervalSeconds === s ? 'var(--accent)' : 'var(--border-ui)',
              backgroundColor: intervalSeconds === s ? 'var(--accent)' : 'transparent',
              color: intervalSeconds === s ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {s}s
          </button>
        ))}
      </div>

      {/* Estado del último batch */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {error ? (
          <span style={{ fontSize: '0.65rem', color: 'var(--sensor-alert)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Error: {error}
          </span>
        ) : lastBatch ? (
          <BatchStatus lastBatch={lastBatch} />
        ) : (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Sin lecturas aún
          </span>
        )}
      </div>

      <style>{`
        @keyframes sim-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M3 2l7 4-7 4V2z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="2.5" y="2" width="2.5" height="8" rx="0.8" fill="currentColor" />
      <rect x="7" y="2" width="2.5" height="8" rx="0.8" fill="currentColor" />
    </svg>
  );
}
