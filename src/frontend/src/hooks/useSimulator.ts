import { useState, useRef, useCallback, useEffect } from 'react';
import type { MonitoringResponse } from '../types/Monitoring.js';
import type { Reading, BatchReadingsResponse } from '../types/Reading.js';
import { postReadingsBatch } from '../services/api.js';

export type LastBatch = {
  created: number;
  skipped: number;
  timestamp: Date;
};

// Tendencia de la generación de valores
export type TrendMode = 'random' | 'incremental' | 'decremental' | 'spike';

export const TREND_LABELS: Record<TrendMode, string> = {
  random:      'Aleatorio',
  incremental: 'Incremental',
  decremental: 'Decremental',
  spike:       'Pico',
};

export type SimulatorState = {
  isRunning:        boolean;
  intervalSeconds:  number;
  mode:             TrendMode;
  minStep:          number;   // % mínimo de variación por tick (1–49)
  maxStep:          number;   // % máximo de variación por tick (2–50)
  lastBatch:        LastBatch | null;
  error:            string | null;
  start:            () => void;
  pause:            () => void;
  setIntervalSeconds: (n: number) => void;
  setMode:          (m: TrendMode) => void;
  setMinStep:       (n: number) => void;
  setMaxStep:       (n: number) => void;
  runOnce:          () => void;
};

type SimulatorOptions = {
  monitorings:     MonitoringResponse[];
  latestReadings:  Record<string, Reading>;
  onBatchComplete: (newReadings: Record<string, Reading>) => void;
  onAlert: (
    monitoringId: string,
    value:         number,
    threshold:     number,
    sensorName:    string,
    zoneName:      string
  ) => void;
};

function generateValue(
  monitoring:    MonitoringResponse,
  latestReading: Reading | undefined,
  mode:          TrendMode,
  minStep:       number,
  maxStep:       number
): number {
  const base      = latestReading?.value ?? monitoring.threshold_value * 0.7;
  const threshold = monitoring.threshold_value;

  // El paso se calcula SIEMPRE sobre el umbral, no sobre el valor actual.
  // Así, un valor cercano a 0 (ej. 0.01 de un umbral de 85) recibe pasos
  // proporcionales al rango real del sensor, evitando quedar "pegado".
  // Si el umbral fuera 0 o muy pequeño usamos 1 como mínimo de referencia.
  const reference = Math.max(threshold, 1);
  const lo        = reference * (minStep / 100);
  const hi        = reference * (maxStep / 100);
  const magnitude = lo + Math.random() * (hi - lo);

  switch (mode) {
    case 'spike':
      // Siempre supera el umbral en un 5–30 %
      return Number(
        (threshold * (1.05 + Math.random() * 0.25)).toFixed(2)
      );

    case 'incremental':
      // Sube; limitado en threshold * 2 para evitar crecimiento infinito
      return Number(Math.min(base + magnitude, threshold * 2).toFixed(2));

    case 'decremental':
      // Baja; nunca negativo
      return Number(Math.max(0, base - magnitude).toFixed(2));

    case 'random':
    default: {
      // Aleatorio con tendencia según posición relativa al umbral:
      //   < 20 % → alta probabilidad de incremento (rescata al sensor del 0)
      //   > 90 % → alta probabilidad de decremento (evita acumulación sobre umbral)
      //   resto  → completamente aleatorio
      const ratio = threshold > 0 ? base / threshold : 0.5;
      const pUp =
        ratio < 0.2 ? 0.85 :   // muy bajo  → tiende a subir
        ratio > 0.9 ? 0.15 :   // muy alto  → tiende a bajar
        0.5;                    // zona media → sin sesgo

      const direction = Math.random() < pUp ? 1 : -1;
      return Number(Math.max(0, base + direction * magnitude).toFixed(2));
    }
  }
}

export function useSimulator({
  monitorings,
  latestReadings,
  onBatchComplete,
  onAlert,
}: SimulatorOptions): SimulatorState {
  const [isRunning,        setIsRunning]        = useState(false);
  const [intervalSeconds,  setIntervalState]    = useState(3);
  const [mode,             setModeState]        = useState<TrendMode>('random');
  const [minStep,          setMinStepState]     = useState(1);
  const [maxStep,          setMaxStepState]     = useState(8);
  const [lastBatch,        setLastBatch]        = useState<LastBatch | null>(null);
  const [error,            setError]            = useState<string | null>(null);

  // Refs para acceso estable dentro del setInterval
  const monitoringsRef     = useRef(monitorings);
  const latestReadingsRef  = useRef(latestReadings);
  const onBatchCompleteRef = useRef(onBatchComplete);
  const onAlertRef         = useRef(onAlert);
  const intervalRef        = useRef(intervalSeconds);
  const modeRef            = useRef(mode);
  const minStepRef         = useRef(minStep);
  const maxStepRef         = useRef(maxStep);
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { monitoringsRef.current     = monitorings;     }, [monitorings]);
  useEffect(() => { latestReadingsRef.current  = latestReadings;  }, [latestReadings]);
  useEffect(() => { onBatchCompleteRef.current = onBatchComplete; }, [onBatchComplete]);
  useEffect(() => { onAlertRef.current         = onAlert;         }, [onAlert]);

  const executeBatch = useCallback(async () => {
    const active = monitoringsRef.current.filter((m) => m.status === 'active');
    if (active.length === 0) return;

    const payload = active.map((m) => ({
      monitoring_id: m.id,
      value: generateValue(
        m,
        latestReadingsRef.current[m.id],
        modeRef.current,
        minStepRef.current,
        maxStepRef.current
      ),
    }));

    try {
      const result: BatchReadingsResponse = await postReadingsBatch({ readings: payload });

      const newMap: Record<string, Reading> = {};
      for (const r of result.readings) {
        newMap[r.monitoring_id] = r;
        const m = active.find((mon) => mon.id === r.monitoring_id);
        if (m) {
          const prev    = latestReadingsRef.current[r.monitoring_id];
          const wasOver = prev !== undefined && prev.value > m.threshold_value;
          if (!wasOver && r.value > m.threshold_value) {
            onAlertRef.current(r.monitoring_id, r.value, m.threshold_value, m.sensor.name, m.zone.name);
          }
        }
      }

      onBatchCompleteRef.current(newMap);
      setLastBatch({ created: result.created, skipped: result.skipped, timestamp: new Date() });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar lecturas');
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const restartTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => { void executeBatch(); }, intervalRef.current * 1000);
  }, [clearTimer, executeBatch]);

  const start = useCallback(() => {
    restartTimer();
    setIsRunning(true);
  }, [restartTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const setIntervalSeconds = useCallback((n: number) => {
    setIntervalState(n);
    intervalRef.current = n;
    if (timerRef.current !== null) restartTimer();
  }, [restartTimer]);

  const setMode = useCallback((m: TrendMode) => {
    setModeState(m);
    modeRef.current = m;
  }, []);

  const setMinStep = useCallback((n: number) => {
    const clamped = Math.min(n, maxStepRef.current - 1);
    setMinStepState(clamped);
    minStepRef.current = clamped;
  }, []);

  const setMaxStep = useCallback((n: number) => {
    const clamped = Math.max(n, minStepRef.current + 1);
    setMaxStepState(clamped);
    maxStepRef.current = clamped;
  }, []);

  const runOnce = useCallback(() => { void executeBatch(); }, [executeBatch]);

  useEffect(() => () => { clearTimer(); }, [clearTimer]);

  return {
    isRunning, intervalSeconds, mode, minStep, maxStep,
    lastBatch, error,
    start, pause, setIntervalSeconds, setMode, setMinStep, setMaxStep, runOnce,
  };
}
