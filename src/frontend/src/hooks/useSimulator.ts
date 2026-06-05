import { useState, useRef, useCallback, useEffect } from 'react';
import type { MonitoringResponse } from '../types/Monitoring.js';
import type { Reading, BatchReadingsResponse } from '../types/Reading.js';
import { postReadingsBatch } from '../services/api.js';

export type LastBatch = {
  created: number;
  skipped: number;
  timestamp: Date;
};

export type SimulatorState = {
  isRunning: boolean;
  intervalSeconds: number;
  lastBatch: LastBatch | null;
  error: string | null;
  start: () => void;
  pause: () => void;
  setIntervalSeconds: (n: number) => void;
  runOnce: () => void;
};

type SimulatorOptions = {
  monitorings: MonitoringResponse[];
  latestReadings: Record<string, Reading>;
  onBatchComplete: (newReadings: Record<string, Reading>) => void;
  onAlert: (
    monitoringId: string,
    value: number,
    threshold: number,
    sensorName: string,
    zoneName: string
  ) => void;
};

function generateValue(
  monitoring: MonitoringResponse,
  latestReading: Reading | undefined
): number {
  // 5% de probabilidad de generar un spike sobre el umbral
  if (Math.random() < 0.05) {
    return Number(
      (monitoring.threshold_value * (1.05 + Math.random() * 0.2)).toFixed(2)
    );
  }
  const base = latestReading?.value ?? monitoring.threshold_value * 0.7;
  const variation = base * 0.08;
  const delta = (Math.random() - 0.5) * 2 * variation;
  return Number(Math.max(0, base + delta).toFixed(2));
}

export function useSimulator({
  monitorings,
  latestReadings,
  onBatchComplete,
  onAlert,
}: SimulatorOptions): SimulatorState {
  const [isRunning, setIsRunning] = useState(false);
  const [intervalSeconds, setIntervalSecondsState] = useState(3);
  const [lastBatch, setLastBatch] = useState<LastBatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monitoringsRef     = useRef(monitorings);
  const latestReadingsRef  = useRef(latestReadings);
  const onBatchCompleteRef = useRef(onBatchComplete);
  const onAlertRef         = useRef(onAlert);
  const intervalSecondsRef = useRef(intervalSeconds);
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
      value: generateValue(m, latestReadingsRef.current[m.id]),
    }));

    try {
      const result: BatchReadingsResponse = await postReadingsBatch({ readings: payload });

      const newReadingsMap: Record<string, Reading> = {};
      for (const r of result.readings) {
        newReadingsMap[r.monitoring_id] = r;

        // Detecta si este sensor cruza el umbral por primera vez en este tick
        const m = active.find((mon) => mon.id === r.monitoring_id);
        if (m) {
          const prev = latestReadingsRef.current[r.monitoring_id];
          const wasOver = prev !== undefined && prev.value > m.threshold_value;
          if (!wasOver && r.value > m.threshold_value) {
            onAlertRef.current(
              r.monitoring_id,
              r.value,
              m.threshold_value,
              m.sensor.name,
              m.zone.name
            );
          }
        }
      }

      onBatchCompleteRef.current(newReadingsMap);
      setLastBatch({ created: result.created, skipped: result.skipped, timestamp: new Date() });
      setError(null);
    } catch (err) {
      // No detener el simulador — reintenta en el siguiente tick
      setError(err instanceof Error ? err.message : 'Error al enviar lecturas');
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      void executeBatch();
    }, intervalSecondsRef.current * 1000);
    setIsRunning(true);
  }, [clearTimer, executeBatch]);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const setIntervalSeconds = useCallback(
    (n: number) => {
      setIntervalSecondsState(n);
      intervalSecondsRef.current = n;
      // Si estaba corriendo, reiniciar con la nueva velocidad
      if (timerRef.current !== null) {
        clearTimer();
        timerRef.current = setInterval(() => {
          void executeBatch();
        }, n * 1000);
      }
    },
    [clearTimer, executeBatch]
  );

  const runOnce = useCallback(() => {
    void executeBatch();
  }, [executeBatch]);

  useEffect(() => {
    return () => { clearTimer(); };
  }, [clearTimer]);

  return { isRunning, intervalSeconds, lastBatch, error, start, pause, setIntervalSeconds, runOnce };
}
