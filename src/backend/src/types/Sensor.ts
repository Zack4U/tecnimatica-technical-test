import type { ZoneResponse } from './Zone.js';

export type SensorType = 'temperature' | 'pressure' | 'vibration' | 'flow';

export type Sensor = {
  id: string;
  name: string;
  type: SensorType;
  manufacturer: string;
  manufacture_date: string;
  created_at: string;
};

export type SensorResponse = Sensor;

export type SensorWithZones = SensorResponse & {
  zones: ZoneResponse[];
};
