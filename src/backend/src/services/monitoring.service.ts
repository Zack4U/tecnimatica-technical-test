import { monitoringRepository } from '../repositories/monitoring.repository.js';
import { sensorRepository } from '../repositories/sensor.repository.js';
import { zoneRepository } from '../repositories/zone.repository.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../errors/index.js';
import type {
  MonitoringResponse,
  MonitoringStatus,
  CreateMonitoringDto,
  UpdateMonitoringDto,
} from '../types/Monitoring.js';

export const monitoringService = {
  async getAll(status?: MonitoringStatus): Promise<MonitoringResponse[]> {
    return monitoringRepository.findAll(status);
  },

  async create(data: CreateMonitoringDto): Promise<MonitoringResponse> {
    if (data.threshold_value <= 0) {
      throw new ValidationError(
        'El valor de umbral debe ser mayor que cero'
      );
    }

    const sensor = await sensorRepository.findById(data.sensor_id);
    if (!sensor) {
      throw new NotFoundError(`Sensor con id "${data.sensor_id}" no existe`);
    }

    const zone = await zoneRepository.findById(data.zone_id);
    if (!zone) {
      throw new NotFoundError(`Zona con id "${data.zone_id}" no existe`);
    }

    const existing = await monitoringRepository.findBySensorAndZone(
      data.sensor_id,
      data.zone_id
    );
    if (existing) {
      throw new ConflictError(
        `El sensor "${sensor.name}" ya está asignado a la zona "${zone.name}"`
      );
    }

    return monitoringRepository.create(data);
  },

  async delete(id: string): Promise<void> {
    const monitoring = await monitoringRepository.findById(id);
    if (!monitoring) {
      throw new NotFoundError(`Monitoreo con id "${id}" no existe`);
    }
    await monitoringRepository.delete(id);
  },

  async update(
    id: string,
    data: UpdateMonitoringDto
  ): Promise<MonitoringResponse> {
    const monitoring = await monitoringRepository.findById(id);
    if (!monitoring) {
      throw new NotFoundError(`Monitoreo con id "${id}" no existe`);
    }

    const hasFields = Object.values(data).some((v) => v !== undefined);
    if (!hasFields) {
      throw new ValidationError(
        'Debe enviar al menos un campo para actualizar'
      );
    }

    if (data.threshold_value !== undefined && data.threshold_value <= 0) {
      throw new ValidationError(
        'El valor de umbral debe ser mayor que cero'
      );
    }

    return monitoringRepository.update(id, data);
  },
};
