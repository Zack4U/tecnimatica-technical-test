import type { SensorResponse } from './Sensor.js';
import type { ZoneResponse } from './Zone.js';

export type ReadingType = 'temperature' | 'pressure' | 'vibration' | 'flow';
export type MonitoringStatus = 'active' | 'paused';

export type MonitoringResponse = {
  id: string;
  sensor: SensorResponse;
  zone: ZoneResponse;
  sensor_id: string;
  zone_id: string;
  installation_date: string;
  reading_type: ReadingType;
  threshold_value: number;
  current_value: number | null;
  status: MonitoringStatus;
  created_at: string;
};

export type CreateMonitoringDto = {
  sensor_id: string;
  zone_id: string;
  installation_date: string;
  reading_type: ReadingType;
  threshold_value: number;
  current_value?: number;
  status?: MonitoringStatus;
};

export type UpdateMonitoringDto = {
  threshold_value?: number;
  current_value?: number | null;
  status?: MonitoringStatus;
};
