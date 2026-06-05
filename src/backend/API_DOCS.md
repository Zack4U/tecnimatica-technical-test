# API de Monitoreo Industrial — Documentación

Base URL: `http://localhost:3000/api/v1`
Swagger UI: `http://localhost:3000/docs`

---

## GET /api/v1/sensors

**Descripción:** Retorna el listado completo de sensores registrados en el sistema.
**Tags:** sensors

### Respuesta exitosa `200`
```json
[
  {
    "id": "a1000000-0000-0000-0000-000000000001",
    "name": "Sensor de temperatura caldera principal",
    "type": "temperature",
    "manufacturer": "Siemens",
    "manufacture_date": "2020-03-15",
    "created_at": "2024-01-10T08:00:00.000Z"
  }
]
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 500    | Error interno del servidor |

---

## GET /api/v1/sensors/:id/zones

**Descripción:** Retorna las zonas donde el sensor indicado tiene monitoreos activos.
**Tags:** sensors

### Parámetros
| Nombre | En | Tipo | Requerido | Descripción |
|--------|----|------|-----------|-------------|
| id | path | UUID | Sí | ID del sensor |

### Respuesta exitosa `200`
```json
[
  {
    "id": "b2000000-0000-0000-0000-000000000001",
    "name": "Sala de calderas",
    "description": "Área de generación de vapor para los procesos de planta",
    "location": "Planta baja, sector norte",
    "operational_status": "active",
    "created_at": "2024-01-10T08:00:00.000Z"
  }
]
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 404    | El sensor con ese id no existe |
| 500    | Error interno del servidor |

---

## GET /api/v1/zones

**Descripción:** Retorna el listado completo de zonas de planta. Necesario para el selector de formulario en el frontend.
**Tags:** zones

### Respuesta exitosa `200`
```json
[
  {
    "id": "b2000000-0000-0000-0000-000000000001",
    "name": "Sala de calderas",
    "description": "Área de generación de vapor para los procesos de planta",
    "location": "Planta baja, sector norte",
    "operational_status": "active",
    "created_at": "2024-01-10T08:00:00.000Z"
  }
]
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 500    | Error interno del servidor |

---

## GET /api/v1/zones/:id/sensors

**Descripción:** Retorna los sensores con monitoreos activos asignados a la zona indicada.
**Tags:** zones

### Parámetros
| Nombre | En | Tipo | Requerido | Descripción |
|--------|----|------|-----------|-------------|
| id | path | UUID | Sí | ID de la zona |

### Respuesta exitosa `200`
```json
[
  {
    "id": "a1000000-0000-0000-0000-000000000001",
    "name": "Sensor de temperatura caldera principal",
    "type": "temperature",
    "manufacturer": "Siemens",
    "manufacture_date": "2020-03-15",
    "created_at": "2024-01-10T08:00:00.000Z"
  }
]
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 404    | La zona con ese id no existe |
| 500    | Error interno del servidor |

---

## GET /api/v1/monitorings

**Descripción:** Retorna todos los monitoreos. Si se pasa `status`, filtra por ese estado.
**Tags:** monitorings

### Query params
| Nombre | Tipo | Requerido | Valores permitidos | Descripción |
|--------|------|-----------|-------------------|-------------|
| status | string | No | `active`, `paused` | Filtra por estado del monitoreo |

### Respuesta exitosa `200`
```json
[
  {
    "id": "c3000000-0000-0000-0000-000000000001",
    "sensor_id": "a1000000-0000-0000-0000-000000000001",
    "zone_id": "b2000000-0000-0000-0000-000000000001",
    "installation_date": "2021-01-10",
    "reading_type": "temperature",
    "threshold_value": 85,
    "current_value": 92.5,
    "status": "active",
    "created_at": "2024-01-10T08:00:00.000Z",
    "sensor": {
      "id": "a1000000-0000-0000-0000-000000000001",
      "name": "Sensor de temperatura caldera principal",
      "type": "temperature",
      "manufacturer": "Siemens",
      "manufacture_date": "2020-03-15",
      "created_at": "2024-01-10T08:00:00.000Z"
    },
    "zone": {
      "id": "b2000000-0000-0000-0000-000000000001",
      "name": "Sala de calderas",
      "description": "Área de generación de vapor para los procesos de planta",
      "location": "Planta baja, sector norte",
      "operational_status": "active",
      "created_at": "2024-01-10T08:00:00.000Z"
    }
  }
]
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 400    | El valor de `status` no es válido |
| 500    | Error interno del servidor |

---

## POST /api/v1/monitorings

**Descripción:** Asigna un sensor a una zona con parámetros de monitoreo. No permite duplicar la combinación sensor-zona.
**Tags:** monitorings

### Body `application/json`
```json
{
  "sensor_id": "a1000000-0000-0000-0000-000000000003",
  "zone_id": "b2000000-0000-0000-0000-000000000002",
  "installation_date": "2024-06-01",
  "reading_type": "vibration",
  "threshold_value": 5.5,
  "current_value": 3.2,
  "status": "active"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| sensor_id | UUID | Sí | ID del sensor |
| zone_id | UUID | Sí | ID de la zona |
| installation_date | string (YYYY-MM-DD) | Sí | Fecha de instalación |
| reading_type | enum | Sí | `temperature`, `pressure`, `vibration`, `flow` |
| threshold_value | number (> 0) | Sí | Valor umbral de alerta |
| current_value | number | No | Valor actual del sensor |
| status | enum | No | `active` (por defecto) o `paused` |

### Respuesta exitosa `201`
```json
{
  "id": "c3000000-0000-0000-0000-000000000010",
  "sensor_id": "a1000000-0000-0000-0000-000000000003",
  "zone_id": "b2000000-0000-0000-0000-000000000002",
  "installation_date": "2024-06-01",
  "reading_type": "vibration",
  "threshold_value": 5.5,
  "current_value": 3.2,
  "status": "active",
  "created_at": "2024-06-01T12:00:00.000Z",
  "sensor": { "...": "objeto sensor completo" },
  "zone": { "...": "objeto zona completo" }
}
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 400    | Body inválido o threshold_value ≤ 0 |
| 404    | El sensor o la zona no existen |
| 409    | El sensor ya está asignado a esa zona |
| 500    | Error interno del servidor |

---

## PATCH /api/v1/monitorings/:id

**Descripción:** Actualiza el umbral, valor actual o estado de un monitoreo existente. Requiere al menos un campo en el body.
**Tags:** monitorings

### Parámetros
| Nombre | En | Tipo | Requerido | Descripción |
|--------|----|------|-----------|-------------|
| id | path | UUID | Sí | ID del monitoreo |

### Body `application/json`
```json
{
  "threshold_value": 90.0,
  "current_value": 87.5,
  "status": "active"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| threshold_value | number (> 0) | No | Nuevo valor umbral |
| current_value | number \| null | No | Nuevo valor actual (null para limpiar) |
| status | enum | No | `active` o `paused` |

### Respuesta exitosa `200`
```json
{
  "id": "c3000000-0000-0000-0000-000000000001",
  "threshold_value": 90,
  "current_value": 87.5,
  "status": "active",
  "...": "resto de campos del monitoreo con sensor y zona anidados"
}
```

### Errores posibles
| Código | Cuándo ocurre |
|--------|--------------|
| 400    | Body vacío o threshold_value ≤ 0 |
| 404    | El monitoreo con ese id no existe |
| 500    | Error interno del servidor |
