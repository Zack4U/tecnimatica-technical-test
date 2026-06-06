import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SimulatorState, LastBatch, TrendMode } from '../../hooks/useSimulator.js';
import { TREND_LABELS } from '../../hooks/useSimulator.js';

const SPEED_OPTIONS = [1, 3, 5, 10] as const;
const TREND_MODES: TrendMode[] = ['random', 'incremental', 'decremental', 'spike'];

// Colores de cada modo para el pill activo
const TREND_ACCENT: Record<TrendMode, string> = {
  random:      'var(--accent)',
  incremental: 'var(--sensor-vib)',
  decremental: 'var(--sensor-pres)',
  spike:       'var(--sensor-alert)',
};

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
    <span style={{ fontSize: '0.65rem', color: hasSkipped ? '#D97706' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
      {label} · {lastBatch.created} creadas{hasSkipped ? ` · ${lastBatch.skipped} omitidas` : ''}
    </span>
  );
}

// Input numérico compacto para el rango de paso
function StepInput({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        style={{
          width: 44, padding: '2px 5px',
          border: '1px solid var(--border-ui)', borderRadius: 5,
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          fontSize: '0.68rem', fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          outline: 'none', textAlign: 'right',
        }}
      />
      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>%</span>
    </div>
  );
}

type Props = SimulatorState;

export function SimulatorBar({
  isRunning, intervalSeconds, mode, minStep, maxStep,
  lastBatch, error,
  start, pause, setIntervalSeconds, setMode, setMinStep, setMaxStep,
}: Props) {
  const dotColor = error ? 'var(--sensor-alert)' : isRunning ? '#1A8A5A' : 'var(--text-muted)';
  const activeAccent = TREND_ACCENT[mode];

  const pillBase: React.CSSProperties = {
    padding: '3px 8px', borderRadius: 5, border: '1px solid',
    cursor: 'pointer', fontSize: '0.67rem', fontWeight: 600,
    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-panel)',
      borderTop: '0.5px solid var(--border-ui)',
      flexShrink: 0, zIndex: 10,
    }}>
      {/* ── Fila 1: controles principales ── */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px', overflowX: 'auto',
      }}>
        {/* Indicador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0,
            animation: (isRunning && !error) ? 'sim-pulse 1.5s ease-in-out infinite'
              : error ? 'sim-pulse 0.6s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.58rem' }}>
            Simulador
          </span>
        </div>

        {/* Botón Play / Pause */}
        <motion.button
          layout type="button"
          onClick={isRunning ? pause : start}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 7,
            border: '1px solid var(--border-ui)',
            backgroundColor: isRunning ? 'var(--accent-subtle)' : 'var(--bg-surface)',
            color: isRunning ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem',
            fontFamily: 'Inter, sans-serif', flexShrink: 0,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isRunning
              ? <motion.span key="pause" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.13 }}><PauseIcon /></motion.span>
              : <motion.span key="play"  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.13 }}><PlayIcon /></motion.span>
            }
          </AnimatePresence>
          {isRunning ? 'Pausar' : 'Iniciar'}
        </motion.button>

        {/* Velocidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 1 }}>Cada:</span>
          {SPEED_OPTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setIntervalSeconds(s)}
              style={{
                ...pillBase,
                borderColor: intervalSeconds === s ? 'var(--accent)' : 'var(--border-ui)',
                backgroundColor: intervalSeconds === s ? 'var(--accent)' : 'transparent',
                color: intervalSeconds === s ? '#fff' : 'var(--text-muted)',
              }}>
              {s}s
            </button>
          ))}
        </div>

        {/* Separador */}
        <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-ui)', flexShrink: 0 }} />

        {/* Último batch */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {error
            ? <span style={{ fontSize: '0.65rem', color: 'var(--sensor-alert)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Error: {error}</span>
            : lastBatch ? <BatchStatus lastBatch={lastBatch} />
            : <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sin lecturas aún</span>
          }
        </div>
      </div>

      {/* ── Fila 2: modo de tendencia + rango de paso ── */}
      <div style={{
        height: 36, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px',
        borderTop: '0.5px solid var(--border-ui)',
        overflowX: 'auto',
      }}>
        {/* Tendencia */}
        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>Tendencia:</span>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {TREND_MODES.map((m) => {
            const active = mode === m;
            return (
              <button key={m} type="button" onClick={() => setMode(m)}
                style={{
                  ...pillBase,
                  borderColor: active ? TREND_ACCENT[m] : 'var(--border-ui)',
                  backgroundColor: active ? TREND_ACCENT[m] : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                }}>
                {TREND_LABELS[m]}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <div style={{ width: 1, height: 18, backgroundColor: 'var(--border-ui)', flexShrink: 0 }} />

        {/* Rango de paso — oculto en modo Pico (siempre sobre umbral) */}
        {mode !== 'spike' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600 }}
              title="Variación por tick expresada como % del umbral del sensor">
              Paso (% umbral):
            </span>
            <StepInput label="mín" value={minStep} min={1} max={maxStep - 1} onChange={setMinStep} />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>—</span>
            <StepInput label="máx" value={maxStep} min={minStep + 1} max={50} onChange={setMaxStep} />
          </div>
        )}

        {mode === 'spike' && (
          <span style={{ fontSize: '0.65rem', color: 'var(--sensor-alert)', fontWeight: 600 }}>
            Siempre por encima del umbral · 5–30 %
          </span>
        )}

        {/* Indicador visual de rango activo */}
        {mode !== 'spike' && (
          <div style={{
            height: 4, borderRadius: 2, width: 80, flexShrink: 0,
            backgroundColor: 'var(--border-ui)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              backgroundColor: activeAccent,
              marginLeft: `${(minStep / 50) * 100}%`,
              width: `${((maxStep - minStep) / 50) * 100}%`,
              transition: 'all 0.2s',
            }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes sim-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function PlayIcon() {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="currentColor" /></svg>;
}
function PauseIcon() {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2" width="2.5" height="8" rx="0.8" fill="currentColor" /><rect x="7" y="2" width="2.5" height="8" rx="0.8" fill="currentColor" /></svg>;
}
