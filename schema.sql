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

-- =============================================================
-- Lecturas de prueba (~10 por monitoring, timestamps cada 30s)
-- c3..001: temperatura caldera — últimos valores superan umbral (85°)
-- =============================================================

-- Monitoring 001: temperatura caldera (umbral 85°, valores crecientes que lo superan)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000001', 81.20, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000001', 82.10, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000001', 83.40, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000001', 84.90, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000001', 86.30, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000001', 88.10, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000001', 90.50, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000001', 91.70, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000001', 92.10, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000001', 92.50, NOW());

-- Monitoring 002: temperatura pasillo (umbral 80°, valores normales)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000002', 76.80, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000002', 77.20, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000002', 76.50, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000002', 77.90, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000002', 78.10, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000002', 77.40, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000002', 78.60, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000002', 77.80, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000002', 78.30, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000002', 78.00, NOW());

-- Monitoring 003: presión línea hidráulica (umbral 200, valores por encima)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000003', 205.50, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000003', 208.20, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000003', 210.10, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000003', 212.80, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000003', 211.40, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000003', 213.90, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000003', 214.20, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000003', 215.00, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000003', 215.40, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000003', 215.75, NOW());

-- Monitoring 004: vibración compresor (umbral 5.00, valores normales)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000004', 3.60, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000004', 3.75, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000004', 3.82, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000004', 3.70, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000004', 3.90, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000004', 3.78, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000004', 3.85, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000004', 3.72, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000004', 3.88, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000004', 3.80, NOW());

-- Monitoring 005: flujo tubería (PAUSED — historial antes de pausarse)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000005', 118.50, NOW() - INTERVAL '30 minutes'),
  ('c3000000-0000-0000-0000-000000000005', 119.20, NOW() - INTERVAL '29 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000005', 120.10, NOW() - INTERVAL '29 minutes'),
  ('c3000000-0000-0000-0000-000000000005', 115.80, NOW() - INTERVAL '28 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000005', 112.30, NOW() - INTERVAL '28 minutes'),
  ('c3000000-0000-0000-0000-000000000005', 108.60, NOW() - INTERVAL '27 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000005', 95.40,  NOW() - INTERVAL '27 minutes'),
  ('c3000000-0000-0000-0000-000000000005', 72.10,  NOW() - INTERVAL '26 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000005', 35.20,  NOW() - INTERVAL '26 minutes'),
  ('c3000000-0000-0000-0000-000000000005', 0.00,   NOW() - INTERVAL '25 minutes 30 seconds');

-- Monitoring 006: temperatura horno (umbral 450°, valores normales)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000006', 428.50, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000006', 429.80, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000006', 431.20, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000006', 430.60, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000006', 432.10, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000006', 431.80, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000006', 429.90, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000006', 430.40, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000006', 430.70, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000006', 430.00, NOW());

-- Monitoring 007: presión depósito (umbral 6.00, valores normales)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000007', 4.35, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000007', 4.42, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000007', 4.38, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000007', 4.50, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000007', 4.45, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000007', 4.52, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000007', 4.48, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000007', 4.55, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000007', 4.47, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000007', 4.50, NOW());

-- Monitoring 008: vibración bomba centrífuga (umbral 4.00, valores por encima)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000008', 5.90, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000008', 6.05, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000008', 6.10, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000008', 6.08, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000008', 6.15, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000008', 6.18, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000008', 6.20, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000008', 6.17, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000008', 6.22, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000008', 6.20, NOW());

-- Monitoring 009: presión pasillo (umbral 180, valores por encima)
INSERT INTO readings (monitoring_id, value, recorded_at) VALUES
  ('c3000000-0000-0000-0000-000000000009', 188.20, NOW() - INTERVAL '4 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000009', 190.50, NOW() - INTERVAL '4 minutes'),
  ('c3000000-0000-0000-0000-000000000009', 191.80, NOW() - INTERVAL '3 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000009', 192.40, NOW() - INTERVAL '3 minutes'),
  ('c3000000-0000-0000-0000-000000000009', 193.10, NOW() - INTERVAL '2 minutes 30 seconds'),
  ('c3000000-0000-0000-0000-000000000009', 193.80, NOW() - INTERVAL '2 minutes'),
  ('c3000000-0000-0000-0000-000000000009', 194.20, NOW() - INTERVAL '1 minute 30 seconds'),
  ('c3000000-0000-0000-0000-000000000009', 194.60, NOW() - INTERVAL '1 minute'),
  ('c3000000-0000-0000-0000-000000000009', 194.90, NOW() - INTERVAL '30 seconds'),
  ('c3000000-0000-0000-0000-000000000009', 195.00, NOW());
