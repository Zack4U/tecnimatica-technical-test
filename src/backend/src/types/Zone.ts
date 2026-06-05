import type { SensorResponse } from './Sensor.js';

export type ZoneOperationalStatus = 'active' | 'inactive';

export type Zone = {
  id: string;
  name: string;
  description: string | null;
  location: string;
  operational_status: ZoneOperationalStatus;
  created_at: string;
};

export type ZoneResponse = Zone;

export type ZoneWithSensors = ZoneResponse & {
  sensors: SensorResponse[];
  active_sensor_count: number;
};
