-- =============================================================
-- Schema del sistema de monitoreo industrial
-- PostgreSQL 15
-- =============================================================

-- ENUMs
CREATE TYPE sensor_type AS ENUM ('temperature', 'pressure', 'vibration', 'flow');
CREATE TYPE reading_type AS ENUM ('temperature', 'pressure', 'vibration', 'flow');
CREATE TYPE monitoring_status AS ENUM ('active', 'paused');

-- =============================================================
-- Tabla: sensors
-- =============================================================
CREATE TABLE sensors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  type             sensor_type  NOT NULL,
  manufacturer     VARCHAR(255) NOT NULL,
  manufacture_date DATE         NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT now()
);

-- =============================================================
-- Tabla: zones
-- =============================================================
CREATE TABLE zones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(255) NOT NULL,
  description        TEXT,
  location           VARCHAR(255) NOT NULL,
  operational_status VARCHAR(50)  NOT NULL DEFAULT 'active',
  created_at         TIMESTAMP    NOT NULL DEFAULT now()
);

-- =============================================================
-- Tabla: monitorings
-- =============================================================
CREATE TABLE monitorings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id         UUID              NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  zone_id           UUID              NOT NULL REFERENCES zones(id)   ON DELETE CASCADE,
  installation_date DATE              NOT NULL,
  reading_type      reading_type      NOT NULL,
  threshold_value   NUMERIC(10, 2)    NOT NULL,
  current_value     NUMERIC(10, 2),
  status            monitoring_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMP         NOT NULL DEFAULT now()
);

-- Constraint crítico: un sensor no puede asignarse dos veces a la misma zona
CREATE UNIQUE INDEX uq_sensor_zone ON monitorings (sensor_id, zone_id);

-- =============================================================
-- Tabla: readings
-- =============================================================
CREATE TABLE readings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_id UUID NOT NULL REFERENCES monitorings(id) ON DELETE CASCADE,
  value         NUMERIC(10,2) NOT NULL,
  recorded_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_readings_monitoring_recorded
  ON readings(monitoring_id, recorded_at DESC);

-- =============================================================
-- Datos de prueba
-- =============================================================

-- Sensores (7 registros, fabricantes industriales reales)
INSERT INTO sensors (id, name, type, manufacturer, manufacture_date) VALUES
  ('a1000000-0000-0000-0000-000000000001',
   'Sensor de temperatura caldera principal',
   'temperature', 'Siemens', '2020-03-15'),

  ('a1000000-0000-0000-0000-000000000002',
   'Sensor de presión línea hidráulica',
   'pressure', 'Honeywell', '2019-07-22'),

  ('a1000000-0000-0000-0000-000000000003',
   'Sensor de vibración compresor central',
   'vibration', 'ABB', '2021-11-08'),

  ('a1000000-0000-0000-0000-000000000004',
   'Sensor de flujo tubería principal agua',
   'flow', 'Endress+Hauser', '2022-04-30'),

  ('a1000000-0000-0000-0000-000000000005',
   'Sensor de temperatura horno de tratamiento',
   'temperature', 'Yokogawa', '2018-09-12'),

  ('a1000000-0000-0000-0000-000000000006',
   'Sensor de presión depósito acumulador',
   'pressure', 'Siemens', '2023-01-18'),

  ('a1000000-0000-0000-0000-000000000007',
   'Sensor de vibración bomba centrífuga',
   'vibration', 'ABB', '2020-06-25');

-- Zonas industriales (6 registros, 1 inactiva)
INSERT INTO zones (id, name, description, location, operational_status) VALUES
  ('b2000000-0000-0000-0000-000000000001',
   'Sala de calderas',
   'Área de generación de vapor para los procesos de planta',
   'Planta baja, sector norte',
   'active'),

  ('b2000000-0000-0000-0000-000000000002',
   'Línea hidráulica A',
   'Sistema hidráulico de prensas y actuadores de la línea A',
   'Nivel 1, línea A',
   'active'),

  ('b2000000-0000-0000-0000-000000000003',
   'Sala de compresores',
   'Compresores de aire y nitrógeno para proceso neumático',
   'Planta baja, sector sur',
   'active'),

  ('b2000000-0000-0000-0000-000000000004',
   'Horno de tratamiento térmico',
   'Zona de tratamientos térmicos y recocido de piezas',
   'Nivel 2, sector este',
   'inactive'),

  ('b2000000-0000-0000-0000-000000000005',
   'Planta de agua de proceso',
   'Distribución y filtrado de agua industrial',
   'Planta baja, sector oeste',
   'active'),

  ('b2000000-0000-0000-0000-000000000006',
   'Pasillo técnico central norte-sur',
   'Zona de paso entre líneas A y B con equipos auxiliares',
   'Nivel 1, pasillo técnico central',
   'active');

-- Monitorings (9 registros)
-- ✓ status='paused': registro 005
-- ✓ current_value > threshold_value: registros 001, 003, 008, 009
-- ✓ sensor a1..001 asignado a 2 zonas: zonas b2..001 y b2..006
INSERT INTO monitorings (
  id, sensor_id, zone_id, installation_date,
  reading_type, threshold_value, current_value, status
) VALUES
  ('c3000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'b2000000-0000-0000-0000-000000000001',
   '2021-01-10', 'temperature', 85.00, 92.50, 'active'),

  ('c3000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000001',
   'b2000000-0000-0000-0000-000000000006',
   '2022-03-05', 'temperature', 80.00, 78.00, 'active'),

  ('c3000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000002',
   'b2000000-0000-0000-0000-000000000002',
   '2020-08-15', 'pressure', 200.00, 215.75, 'active'),

  ('c3000000-0000-0000-0000-000000000004',
   'a1000000-0000-0000-0000-000000000003',
   'b2000000-0000-0000-0000-000000000003',
   '2022-02-20', 'vibration', 5.00, 3.80, 'active'),

  ('c3000000-0000-0000-0000-000000000005',
   'a1000000-0000-0000-0000-000000000004',
   'b2000000-0000-0000-0000-000000000005',
   '2023-05-01', 'flow', 120.00, 0.00, 'paused'),

  ('c3000000-0000-0000-0000-000000000006',
   'a1000000-0000-0000-0000-000000000005',
   'b2000000-0000-0000-0000-000000000004',
   '2019-04-18', 'temperature', 450.00, 430.00, 'active'),

  ('c3000000-0000-0000-0000-000000000007',
   'a1000000-0000-0000-0000-000000000006',
   'b2000000-0000-0000-0000-000000000001',
   '2023-07-11', 'pressure', 6.00, 4.50, 'active'),

  ('c3000000-0000-0000-0000-000000000008',
   'a1000000-0000-0000-0000-000000000007',
   'b2000000-0000-0000-0000-000000000005',
   '2021-09-30', 'vibration', 4.00, 6.20, 'active'),

  ('c3000000-0000-0000-0000-000000000009',
   'a1000000-0000-0000-0000-000000000002',
   'b2000000-0000-0000-0000-000000000006',
   '2022-11-14', 'pressure', 180.00, 195.00, 'active');
