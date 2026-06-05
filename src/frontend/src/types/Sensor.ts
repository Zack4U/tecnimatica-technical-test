export type SensorType = 'temperature' | 'pressure' | 'vibration' | 'flow';

export type CreateSensorDto = {
  name: string;
  type: SensorType;
  manufacturer: string;
  manufacture_date: string;
};

export type SensorResponse = {
  id: string;
  name: string;
  type: SensorType;
  manufacturer: string;
  manufacture_date: string;
  created_at: string;
};
