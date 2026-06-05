import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { readings, monitorings } from '../db/schema.js';
import type { ReadingResponse, CreateReadingDto } from '../types/Reading.js';

function mapToResponse(row: {
  id: string;
  monitoring_id: string;
  value: string;
  recorded_at: Date;
}): ReadingResponse {
  return {
    id: row.id,
    monitoring_id: row.monitoring_id,
    value: parseFloat(row.value),
    recorded_at: row.recorded_at.toISOString(),
  };
}

export const readingRepository = {
  // Retorna las últimas N lecturas ordenadas ASC para el chart
  async findByMonitoringId(
    monitoringId: string,
    limit: number = 20
  ): Promise<ReadingResponse[]> {
    const rows = await db
      .select({
        id: readings.id,
        monitoring_id: readings.monitoringId,
        value: readings.value,
        recorded_at: readings.recordedAt,
      })
      .from(readings)
      .where(eq(readings.monitoringId, monitoringId))
      .orderBy(desc(readings.recordedAt))
      .limit(limit);

    // Invierte para entregar orden ASC al chart
    return rows.reverse().map(mapToResponse);
  },

  async findLatestByMonitoringId(
    monitoringId: string
  ): Promise<ReadingResponse | null> {
    const rows = await db
      .select({
        id: readings.id,
        monitoring_id: readings.monitoringId,
        value: readings.value,
        recorded_at: readings.recordedAt,
      })
      .from(readings)
      .where(eq(readings.monitoringId, monitoringId))
      .orderBy(desc(readings.recordedAt))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return mapToResponse(row);
  },

  // Última lectura de cada monitoring — usa DISTINCT ON para eficiencia
  async findLatestPerMonitoring(): Promise<Map<string, ReadingResponse>> {
    const result = await db.execute<{
      id: string;
      monitoring_id: string;
      value: string;
      recorded_at: Date;
    }>(sql`
      SELECT DISTINCT ON (monitoring_id)
        id,
        monitoring_id,
        value::text,
        recorded_at
      FROM readings
      INNER JOIN ${monitorings} ON readings.monitoring_id = ${monitorings.id}
      WHERE ${monitorings.status} = 'active'
      ORDER BY monitoring_id, recorded_at DESC
    `);

    const map = new Map<string, ReadingResponse>();
    for (const row of result.rows) {
      map.set(row.monitoring_id, {
        id: row.id,
        monitoring_id: row.monitoring_id,
        value: parseFloat(row.value),
        recorded_at: new Date(row.recorded_at).toISOString(),
      });
    }
    return map;
  },

  async createOne(data: CreateReadingDto): Promise<ReadingResponse> {
    const values: {
      monitoringId: string;
      value: string;
      recordedAt?: Date;
    } = {
      monitoringId: data.monitoring_id,
      value: data.value.toString(),
    };

    if (data.recorded_at !== undefined) {
      values.recordedAt = new Date(data.recorded_at);
    }

    const [row] = await db
      .insert(readings)
      .values(values)
      .returning({
        id: readings.id,
        monitoring_id: readings.monitoringId,
        value: readings.value,
        recorded_at: readings.recordedAt,
      });

    return mapToResponse(row);
  },

  // INSERT múltiple en una sola query
  async createBatch(data: CreateReadingDto[]): Promise<ReadingResponse[]> {
    const values = data.map((d) => ({
      monitoringId: d.monitoring_id,
      value: d.value.toString(),
      ...(d.recorded_at !== undefined
        ? { recordedAt: new Date(d.recorded_at) }
        : {}),
    }));

    const rows = await db
      .insert(readings)
      .values(values)
      .returning({
        id: readings.id,
        monitoring_id: readings.monitoringId,
        value: readings.value,
        recorded_at: readings.recordedAt,
      });

    return rows.map(mapToResponse);
  },
};
