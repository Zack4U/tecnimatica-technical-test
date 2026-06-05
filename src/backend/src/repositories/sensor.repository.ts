import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sensors, monitorings, zones } from '../db/schema.js';
import type { SensorResponse } from '../types/Sensor.js';
import type { ZoneResponse } from '../types/Zone.js';
import type { ZoneOperationalStatus } from '../types/Zone.js';

export const sensorRepository = {
  async findAll(): Promise<SensorResponse[]> {
    const rows = await db
      .select({
        id: sensors.id,
        name: sensors.name,
        type: sensors.type,
        manufacturer: sensors.manufacturer,
        manufacture_date: sensors.manufactureDate,
        created_at: sensors.createdAt,
      })
      .from(sensors);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      manufacturer: row.manufacturer,
      manufacture_date: row.manufacture_date,
      created_at: row.created_at.toISOString(),
    }));
  },

  async findById(id: string): Promise<SensorResponse | null> {
    const rows = await db
      .select({
        id: sensors.id,
        name: sensors.name,
        type: sensors.type,
        manufacturer: sensors.manufacturer,
        manufacture_date: sensors.manufactureDate,
        created_at: sensors.createdAt,
      })
      .from(sensors)
      .where(eq(sensors.id, id));

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      manufacturer: row.manufacturer,
      manufacture_date: row.manufacture_date,
      created_at: row.created_at.toISOString(),
    };
  },

  async findZonesBySensorId(sensorId: string): Promise<ZoneResponse[]> {
    const rows = await db
      .select({
        id: zones.id,
        name: zones.name,
        description: zones.description,
        location: zones.location,
        operational_status: zones.operationalStatus,
        created_at: zones.createdAt,
      })
      .from(monitorings)
      .innerJoin(zones, eq(monitorings.zoneId, zones.id))
      .where(
        and(
          eq(monitorings.sensorId, sensorId),
          eq(monitorings.status, 'active')
        )
      );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      location: row.location,
      operational_status: row.operational_status as ZoneOperationalStatus,
      created_at: row.created_at.toISOString(),
    }));
  },
};
