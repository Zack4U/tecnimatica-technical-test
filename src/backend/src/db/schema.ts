import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  numeric,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const sensorTypeEnum = pgEnum('sensor_type', [
  'temperature',
  'pressure',
  'vibration',
  'flow',
]);

export const readingTypeEnum = pgEnum('reading_type', [
  'temperature',
  'pressure',
  'vibration',
  'flow',
]);

export const monitoringStatusEnum = pgEnum('monitoring_status', [
  'active',
  'paused',
]);

export const sensors = pgTable('sensors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: sensorTypeEnum('type').notNull(),
  manufacturer: varchar('manufacturer', { length: 255 }).notNull(),
  manufactureDate: date('manufacture_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  location: varchar('location', { length: 255 }).notNull(),
  operationalStatus: varchar('operational_status', { length: 50 })
    .notNull()
    .default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const monitorings = pgTable(
  'monitorings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sensorId: uuid('sensor_id')
      .notNull()
      .references(() => sensors.id, { onDelete: 'cascade' }),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => zones.id, { onDelete: 'cascade' }),
    installationDate: date('installation_date').notNull(),
    readingType: readingTypeEnum('reading_type').notNull(),
    thresholdValue: numeric('threshold_value', {
      precision: 10,
      scale: 2,
    }).notNull(),
    currentValue: numeric('current_value', { precision: 10, scale: 2 }),
    status: monitoringStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_sensor_zone').on(table.sensorId, table.zoneId),
  ]
);
