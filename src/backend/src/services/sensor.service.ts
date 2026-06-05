import { sensorRepository } from '../repositories/sensor.repository.js';
import { NotFoundError } from '../errors/index.js';
import type { SensorResponse } from '../types/Sensor.js';
import type { ZoneResponse } from '../types/Zone.js';

export const sensorService = {
  async getAll(): Promise<SensorResponse[]> {
    return sensorRepository.findAll();
  },

  async getById(id: string): Promise<SensorResponse> {
    const sensor = await sensorRepository.findById(id);
    if (!sensor) {
      throw new NotFoundError(`Sensor con id "${id}" no existe`);
    }
    return sensor;
  },

  async getZonesBySensorId(id: string): Promise<ZoneResponse[]> {
    const sensor = await sensorRepository.findById(id);
    if (!sensor) {
      throw new NotFoundError(`Sensor con id "${id}" no existe`);
    }
    return sensorRepository.findZonesBySensorId(id);
  },
};
