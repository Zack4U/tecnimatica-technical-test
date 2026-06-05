import { zoneRepository } from '../repositories/zone.repository.js';
import { NotFoundError } from '../errors/index.js';
import type { ZoneResponse } from '../types/Zone.js';
import type { SensorResponse } from '../types/Sensor.js';

export const zoneService = {
  async getAll(): Promise<ZoneResponse[]> {
    return zoneRepository.findAll();
  },

  async getById(id: string): Promise<ZoneResponse> {
    const zone = await zoneRepository.findById(id);
    if (!zone) {
      throw new NotFoundError(`Zona con id "${id}" no existe`);
    }
    return zone;
  },

  async getSensorsByZoneId(id: string): Promise<SensorResponse[]> {
    const zone = await zoneRepository.findById(id);
    if (!zone) {
      throw new NotFoundError(`Zona con id "${id}" no existe`);
    }
    return zoneRepository.findSensorsByZoneId(id);
  },
};
