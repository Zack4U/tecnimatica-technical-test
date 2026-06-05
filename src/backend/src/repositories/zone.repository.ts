import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { zones, monitorings, sensors } from '../db/schema.js';
import type { ZoneResponse } from '../types/Zone.js';
import type { ZoneOperationalStatus } from '../types/Zone.js';
import type { SensorResponse } from '../types/Sensor.js';

export const zoneRepository = {
  async findAll(): Promise<ZoneResponse[]> {
    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        description: zones.description,
        location: zones.location,
        operational_status: zones.operationalStatus,
        created_at: zones.createdAt,
      })
      .from(zones);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      location: row.location,
      operational_status: row.operational_status as ZoneOperationalStatus,
      created_at: row.created_at.toISOString(),
    }));
  },

  async findById(id: string): Promise<ZoneResponse | null> {
    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        description: zones.description,
        location: zones.location,
        operational_status: zones.operationalStatus,
        created_at: zones.createdAt,
      })
      .from(zones)
      .where(eq(zones.id, id));

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      location: row.location,
      operational_status: row.operational_status as ZoneOperationalStatus,
      created_at: row.created_at.toISOString(),
    };
  },

  async findSensorsByZoneId(zoneId: string): Promise<SensorResponse[]> {
    const rows = await db
      .select({
        id: sensors.id,
        name: sensors.name,
        type: sensors.type,
        manufacturer: sensors.manufacturer,
        manufacture_date: sensors.manufactureDate,
        created_at: sensors.createdAt,
      })
      .from(monitorings)
      .innerJoin(sensors, eq(monitorings.sensorId, sensors.id))
      .where(
        and(
          eq(monitorings.zoneId, zoneId),
          eq(monitorings.status, 'active')
        )
      );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      manufacturer: row.manufacturer,
      manufacture_date: row.manufacture_date,
      created_at: row.created_at.toISOString(),
    }));
  },

  async countActiveSensorsByZoneId(zoneId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(monitorings)
      .where(
        and(
          eq(monitorings.zoneId, zoneId),
          eq(monitorings.status, 'active')
        )
      );

    return result[0]?.total ?? 0;
  },
};
