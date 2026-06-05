import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { monitorings } from '../db/schema.js';
import { readingRepository } from '../repositories/reading.repository.js';
import { monitoringRepository } from '../repositories/monitoring.repository.js';
import { ValidationError, NotFoundError } from '../errors/index.js';
import type {
  ReadingResponse,
  CreateReadingDto,
  CreateReadingsBatchDto,
} from '../types/Reading.js';

export const readingService = {
  // Últimas N lecturas ordenadas ASC (listas para el chart)
  async getHistory(
    monitoringId: string,
    limit: number = 20
  ): Promise<ReadingResponse[]> {
    const monitoring = await monitoringRepository.findById(monitoringId);
    if (!monitoring) {
      throw new NotFoundError(
        `Monitoreo con id "${monitoringId}" no existe`
      );
    }
    return readingRepository.findByMonitoringId(monitoringId, limit);
  },

  async getLatest(
    monitoringId: string
  ): Promise<ReadingResponse | null> {
    const monitoring = await monitoringRepository.findById(monitoringId);
    if (!monitoring) {
      throw new NotFoundError(
        `Monitoreo con id "${monitoringId}" no existe`
      );
    }
    return readingRepository.findLatestByMonitoringId(monitoringId);
  },

  // Record<monitoringId, ReadingResponse> para hidratar el canvas inicial
  async getLatestAll(): Promise<Record<string, ReadingResponse>> {
    const map = await readingRepository.findLatestPerMonitoring();
    return Object.fromEntries(map);
  },

  async createOne(data: CreateReadingDto): Promise<ReadingResponse> {
    if (!Number.isFinite(data.value)) {
      throw new ValidationError(
        'El valor de la lectura debe ser un número finito'
      );
    }

    const monitoring = await monitoringRepository.findById(data.monitoring_id);
    if (!monitoring) {
      throw new NotFoundError(
        `Monitoreo con id "${data.monitoring_id}" no existe`
      );
    }
    if (monitoring.status === 'paused') {
      throw new ValidationError(
        `El monitoreo "${data.monitoring_id}" está pausado y no acepta nuevas lecturas`
      );
    }

    const reading = await readingRepository.createOne(data);

    // Actualiza current_value en el monitoring con el nuevo valor
    await db
      .update(monitorings)
      .set({ currentValue: data.value.toString() })
      .where(eq(monitorings.id, data.monitoring_id));

    return reading;
  },

  async createBatch(
    data: CreateReadingsBatchDto
  ): Promise<{ created: number; skipped: number; readings: ReadingResponse[] }> {
    const ids = data.readings.map((r) => r.monitoring_id);

    // Verifica existencia de todos los monitoring_ids
    const found = await Promise.all(
      ids.map((id) => monitoringRepository.findById(id))
    );

    const missingIds = ids.filter((_, i) => found[i] === null);
    if (missingIds.length > 0) {
      throw new NotFoundError(
        `Los siguientes monitoreos no existen: ${missingIds.join(', ')}`
      );
    }

    // Valida todos los valores
    const invalidValues = data.readings.filter(
      (r) => !Number.isFinite(r.value)
    );
    if (invalidValues.length > 0) {
      throw new ValidationError(
        'Todos los valores de lectura deben ser números finitos'
      );
    }

    // Filtra activos — los pausados se ignoran silenciosamente
    const active = data.readings.filter(
      (r, i) => found[i]!.status === 'active'
    );
    const skipped = data.readings.length - active.length;

    if (active.length === 0) {
      return { created: 0, skipped, readings: [] };
    }

    const inserted = await readingRepository.createBatch(active);

    // Actualiza current_value en paralelo para cada monitoring activo
    await Promise.all(
      active.map((r) =>
        db
          .update(monitorings)
          .set({ currentValue: r.value.toString() })
          .where(eq(monitorings.id, r.monitoring_id))
      )
    );

    return { created: inserted.length, skipped, readings: inserted };
  },
};
