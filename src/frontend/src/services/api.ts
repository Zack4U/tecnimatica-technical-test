import type { SensorResponse, CreateSensorDto } from '../types/Sensor.js';
import type { ZoneResponse } from '../types/Zone.js';
import type {
  MonitoringResponse,
  MonitoringStatus,
  CreateMonitoringDto,
  UpdateMonitoringDto,
} from '../types/Monitoring.js';
import type {
  Reading,
  CreateReadingsBatchDto,
  BatchReadingsResponse,
} from '../types/Reading.js';

const BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const hasBody = options?.body !== undefined && options.body !== null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export function createSensor(data: CreateSensorDto): Promise<SensorResponse> {
  return apiFetch('/sensors', { method: 'POST', body: JSON.stringify(data) });
}

export function deleteMonitoring(id: string): Promise<void> {
  return apiFetch(`/monitorings/${id}`, { method: 'DELETE' });
}

export function getSensors(): Promise<SensorResponse[]> {
  return apiFetch('/sensors');
}

export function getZones(): Promise<ZoneResponse[]> {
  return apiFetch('/zones');
}

export function getMonitorings(status?: MonitoringStatus): Promise<MonitoringResponse[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch(`/monitorings${qs}`);
}

export function getZoneSensors(zoneId: string): Promise<SensorResponse[]> {
  return apiFetch(`/zones/${zoneId}/sensors`);
}

export function getSensorZones(sensorId: string): Promise<ZoneResponse[]> {
  return apiFetch(`/sensors/${sensorId}/zones`);
}

export function createMonitoring(data: CreateMonitoringDto): Promise<MonitoringResponse> {
  return apiFetch('/monitorings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMonitoring(
  id: string,
  data: UpdateMonitoringDto
): Promise<MonitoringResponse> {
  return apiFetch(`/monitorings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getReadings(monitoringId: string, limit = 20): Promise<Reading[]> {
  return apiFetch(`/monitorings/${monitoringId}/readings?limit=${limit}`);
}

export function getLatestReadings(): Promise<Record<string, Reading>> {
  return apiFetch('/readings/latest');
}

export function postReadingsBatch(
  data: CreateReadingsBatchDto
): Promise<BatchReadingsResponse> {
  return apiFetch('/readings/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
