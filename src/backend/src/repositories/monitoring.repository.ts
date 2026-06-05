import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { monitorings, sensors, zones } from '../db/schema.js';
import type { Monitoring, MonitoringResponse, MonitoringStatus } from '../types/Monitoring.js';
import type { CreateMonitoringDto, UpdateMonitoringDto } from '../types/Monitoring.js';
import type { ZoneOperationalStatus } from '../types/Zone.js';

// Campos comunes para el SELECT con joins de sensor y zona
const joinedFields = {
  id: monitorings.id,
  sensor_id: monitorings.sensorId,
  zone_id: monitorings.zoneId,
  installation_date: monitorings.installationDate,
  reading_type: monitorings.readingType,
  threshold_value: monitorings.thresholdValue,
  current_value: monitorings.currentValue,
  status: monitorings.status,
  created_at: monitorings.createdAt,
  sensor_id_ref: sensors.id,
  sensor_name: sensors.name,
  sensor_type: sensors.type,
  sensor_manufacturer: sensors.manufacturer,
  sensor_manufacture_date: sensors.manufactureDate,
  sensor_created_at: sensors.createdAt,
  zone_id_ref: zones.id,
  zone_name: zones.name,
  zone_description: zones.description,
  zone_location: zones.location,
  zone_operational_status: zones.operationalStatus,
  zone_created_at: zones.createdAt,
} as const;

type JoinedRow = {
  id: string;
  sensor_id: string;
  zone_id: string;
  installation_date: string;
  reading_type: 'temperature' | 'pressure' | 'vibration' | 'flow';
  threshold_value: string;
  current_value: string | null;
  status: 'active' | 'paused';
  created_at: Date;
  sensor_id_ref: string;
  sensor_name: string;
  sensor_type: 'temperature' | 'pressure' | 'vibration' | 'flow';
  sensor_manufacturer: string;
  sensor_manufacture_date: string;
  sensor_created_at: Date;
  zone_id_ref: string;
  zone_name: string;
  zone_description: string | null;
  zone_location: string;
  zone_operational_status: string;
  zone_created_at: Date;
};

function mapToResponse(row: JoinedRow): MonitoringResponse {
  return {
    id: row.id,
    sensor_id: row.sensor_id,
    zone_id: row.zone_id,
    installation_date: row.installation_date,
    reading_type: row.reading_type,
    threshold_value: parseFloat(row.threshold_value),
    current_value: row.current_value !== null ? parseFloat(row.current_value) : null,
    status: row.status,
    created_at: row.created_at.toISOString(),
    sensor: {
      id: row.sensor_id_ref,
      name: row.sensor_name,
      type: row.sensor_type,
      manufacturer: row.sensor_manufacturer,
      manufacture_date: row.sensor_manufacture_date,
      created_at: row.sensor_created_at.toISOString(),
    },
    zone: {
      id: row.zone_id_ref,
      name: row.zone_name,
      description: row.zone_description,
      location: row.zone_location,
      operational_status: row.zone_operational_status as ZoneOperationalStatus,
      created_at: row.zone_created_at.toISOString(),
    },
  };
}

// Recupera un monitoring completo con joins por id
async function selectFullById(id: string): Promise<MonitoringResponse | null> {
  const rows = await db
    .select(joinedFields)
    .from(monitorings)
    .innerJoin(sensors, eq(monitorings.sensorId, sensors.id))
    .innerJoin(zones, eq(monitorings.zoneId, zones.id))
    .where(eq(monitorings.id, id));

  const row = rows[0];
  if (!row) return null;
  return mapToResponse(row as JoinedRow);
}

export const monitoringRepository = {
  async findAll(status?: MonitoringStatus): Promise<MonitoringResponse[]> {
    const baseQuery = db
      .select(joinedFields)
      .from(monitorings)
      .innerJoin(sensors, eq(monitorings.sensorId, sensors.id))
      .innerJoin(zones, eq(monitorings.zoneId, zones.id));

    const rows = status
      ? await baseQuery.where(eq(monitorings.status, status))
      : await baseQuery;

    return rows.map((row) => mapToResponse(row as JoinedRow));
  },

  async findById(id: string): Promise<MonitoringResponse | null> {
    return selectFullById(id);
  },

  async findBySensorAndZone(
    sensorId: string,
    zoneId: string
  ): Promise<Monitoring | null> {
    const rows = await db
      .select({
        id: monitorings.id,
        sensor_id: monitorings.sensorId,
        zone_id: monitorings.zoneId,
        installation_date: monitorings.installationDate,
        reading_type: monitorings.readingType,
        threshold_value: monitorings.thresholdValue,
        current_value: monitorings.currentValue,
        status: monitorings.status,
        created_at: monitorings.createdAt,
      })
      .from(monitorings)
      .where(
        and(
          eq(monitorings.sensorId, sensorId),
          eq(monitorings.zoneId, zoneId)
        )
      );

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      sensor_id: row.sensor_id,
      zone_id: row.zone_id,
      installation_date: row.installation_date,
      reading_type: row.reading_type,
      threshold_value: parseFloat(row.threshold_value),
      current_value: row.current_value !== null ? parseFloat(row.current_value) : null,
      status: row.status,
      created_at: row.created_at.toISOString(),
    };
  },

  async create(data: CreateMonitoringDto): Promise<MonitoringResponse> {
    const [inserted] = await db
      .insert(monitorings)
      .values({
        sensorId: data.sensor_id,
        zoneId: data.zone_id,
        installationDate: data.installation_date,
        readingType: data.reading_type,
        thresholdValue: data.threshold_value.toString(),
        currentValue: data.current_value !== undefined ? data.current_value.toString() : null,
        status: data.status ?? 'active',
      })
      .returning({ id: monitorings.id });

    return (await selectFullById(inserted.id))!;
  },

  async update(id: string, data: UpdateMonitoringDto): Promise<MonitoringResponse> {
    const updateValues: {
      thresholdValue?: string;
      currentValue?: string | null;
      status?: MonitoringStatus;
    } = {};

    if (data.threshold_value !== undefined) {
      updateValues.thresholdValue = data.threshold_value.toString();
    }
    if (data.current_value !== undefined) {
      updateValues.currentValue =
        data.current_value !== null ? data.current_value.toString() : null;
    }
    if (data.status !== undefined) {
      updateValues.status = data.status;
    }

    await db
      .update(monitorings)
      .set(updateValues)
      .where(eq(monitorings.id, id));

    return (await selectFullById(id))!;
  },
};
