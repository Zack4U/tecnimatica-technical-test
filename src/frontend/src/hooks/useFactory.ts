import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSensors, getZones, getMonitorings, getLatestReadings } from '../services/api.js';
import type { SensorResponse, SensorType } from '../types/Sensor.js';
import type { ZoneResponse } from '../types/Zone.js';
import type { MonitoringResponse } from '../types/Monitoring.js';
import type { Reading } from '../types/Reading.js';

export type FilterType = SensorType | 'paused' | 'alert';

export type SensorPosition = { cx: number; cy: number };

export type ZoneBounds = { x: number; y: number; w: number; h: number };

/**
 * Un SensorInstance es una aparición visual en el canvas.
 * Un mismo sensor puede tener varias instancias si monitorea zonas no contiguas.
 */
export type SensorInstance = {
  key: string;                         // clave única React
  sensorId: string;
  monitorings: MonitoringResponse[];   // monitoreos que representa esta instancia
  cx: number;
  cy: number;
  isMultiZone: boolean;                // en intersección de zonas contiguas
};

// Layout del grid para 6 zonas (orden por created_at):
// [0]=Sala calderas, [1]=Línea hidráulica, [2]=Sala compresores,
// [3]=Horno tratamiento, [4]=Planta agua, [5]=Pasillo técnico
const ZONE_BOUNDS: ZoneBounds[] = [
  { x: 12,  y: 12,  w: 162, h: 115 },
  { x: 174, y: 12,  w: 244, h: 115 },
  { x: 12,  y: 155, w: 70,  h: 133 },
  { x: 82,  y: 155, w: 92,  h: 133 },
  { x: 174, y: 155, w: 244, h: 133 },
  { x: 12,  y: 127, w: 406, h: 28  },
];

const EXTERNAL_CORNERS: string[][] = [
  ['tl'], ['tr'], ['bl'], [], ['br'], [],
];

const CORNER_RADIUS = 7;

function buildPath(b: ZoneBounds, externalCorners: string[]): string {
  const { x, y, w, h } = b;
  const x2 = x + w;
  const y2 = y + h;
  const r = CORNER_RADIUS;
  const tl = externalCorners.includes('tl');
  const tr = externalCorners.includes('tr');
  const bl = externalCorners.includes('bl');
  const br = externalCorners.includes('br');

  let d = tl ? `M ${x + r},${y}` : `M ${x},${y}`;
  d += tr ? ` L ${x2 - r},${y} Q ${x2},${y} ${x2},${y + r}` : ` L ${x2},${y}`;
  d += br ? ` L ${x2},${y2 - r} Q ${x2},${y2} ${x2 - r},${y2}` : ` L ${x2},${y2}`;
  d += bl ? ` L ${x + r},${y2} Q ${x},${y2} ${x},${y2 - r}` : ` L ${x},${y2}`;
  d += tl ? ` L ${x},${y + r} Q ${x},${y} ${x + r},${y}` : ` L ${x},${y}`;
  return d + ' Z';
}

function centroid(b: ZoneBounds): SensorPosition {
  return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
}

type SharedBorder = {
  type: 'horizontal' | 'vertical';
  fixedCoord: number;  // y para horizontal, x para vertical
  from: number;        // inicio del segmento compartido
  to: number;          // fin del segmento compartido
};

function sharedBorder(a: ZoneBounds, b: ZoneBounds): SharedBorder | null {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;

  const sharedY = ay2 === b.y ? ay2 : by2 === a.y ? by2 : null;
  if (sharedY !== null) {
    const ox1 = Math.max(a.x, b.x);
    const ox2 = Math.min(ax2, bx2);
    if (ox2 > ox1) return { type: 'horizontal', fixedCoord: sharedY, from: ox1, to: ox2 };
  }

  const sharedX = ax2 === b.x ? ax2 : bx2 === a.x ? bx2 : null;
  if (sharedX !== null) {
    const oy1 = Math.max(a.y, b.y);
    const oy2 = Math.min(ay2, by2);
    if (oy2 > oy1) return { type: 'vertical', fixedCoord: sharedX, from: oy1, to: oy2 };
  }

  return null;
}

// Mantener compatibilidad con el uso previo de sharedBorderMidpoint
function sharedBorderMidpoint(a: ZoneBounds, b: ZoneBounds): SensorPosition | null {
  const border = sharedBorder(a, b);
  if (!border) return null;
  if (border.type === 'horizontal') {
    return { cx: (border.from + border.to) / 2, cy: border.fixedCoord };
  }
  return { cx: border.fixedCoord, cy: (border.from + border.to) / 2 };
}

export function calculateZonePaths(zones: ZoneResponse[]): Map<string, string> {
  const sorted = [...zones].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const paths = new Map<string, string>();
  sorted.forEach((zone, i) => {
    const bounds = ZONE_BOUNDS[i];
    const corners = EXTERNAL_CORNERS[i];
    if (bounds && corners) paths.set(zone.id, buildPath(bounds, corners));
  });
  return paths;
}

export function calculateZoneBoundsMap(
  zones: ZoneResponse[]
): Map<string, ZoneBounds> {
  const sorted = [...zones].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const map = new Map<string, ZoneBounds>();
  sorted.forEach((zone, i) => {
    const bounds = ZONE_BOUNDS[i];
    if (bounds) map.set(zone.id, bounds);
  });
  return map;
}

// Encuentra los componentes conexos de un conjunto de zonas
// (dos zonas son contiguas si comparten un borde)
function findConnectedComponents(
  zoneIds: string[],
  zoneBoundsMap: Map<string, ZoneBounds>
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const startId of zoneIds) {
    if (visited.has(startId)) continue;
    const component: string[] = [];
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const other of zoneIds) {
        if (visited.has(other)) continue;
        const bA = zoneBoundsMap.get(current);
        const bB = zoneBoundsMap.get(other);
        if (bA && bB && sharedBorderMidpoint(bA, bB) !== null) {
          visited.add(other);
          queue.push(other);
        }
      }
    }
    components.push(component);
  }

  return components;
}

// Posición para un componente de zonas contiguas.
// Cuando hay bordes horizontales y verticales (esquina compartida entre 3+ zonas),
// usa la intersección exacta de esos bordes en lugar del promedio de midpoints.
function componentPosition(
  zoneIds: string[],
  zoneBoundsMap: Map<string, ZoneBounds>
): SensorPosition {
  if (zoneIds.length === 1) {
    const b = zoneBoundsMap.get(zoneIds[0]);
    return b ? centroid(b) : { cx: 0, cy: 0 };
  }

  const borders: SharedBorder[] = [];
  for (let i = 0; i < zoneIds.length; i++) {
    for (let j = i + 1; j < zoneIds.length; j++) {
      const bA = zoneBoundsMap.get(zoneIds[i]);
      const bB = zoneBoundsMap.get(zoneIds[j]);
      if (bA && bB) {
        const b = sharedBorder(bA, bB);
        if (b) borders.push(b);
      }
    }
  }

  if (borders.length === 0) {
    const bounds = zoneIds
      .map((id) => zoneBoundsMap.get(id))
      .filter((b): b is ZoneBounds => b !== undefined);
    const avgX = bounds.reduce((s, b) => s + centroid(b).cx, 0) / bounds.length;
    const avgY = bounds.reduce((s, b) => s + centroid(b).cy, 0) / bounds.length;
    return { cx: avgX, cy: avgY };
  }

  const hBorders = borders.filter((b) => b.type === 'horizontal');
  const vBorders = borders.filter((b) => b.type === 'vertical');

  // Esquina: hay bordes en ambos ejes → el sensor va exactamente en la esquina compartida
  if (hBorders.length > 0 && vBorders.length > 0) {
    const cx = vBorders.reduce((s, b) => s + b.fixedCoord, 0) / vBorders.length;
    const cy = hBorders.reduce((s, b) => s + b.fixedCoord, 0) / hBorders.length;
    return { cx, cy };
  }

  // Solo bordes horizontales
  if (hBorders.length > 0) {
    const cy = hBorders[0].fixedCoord;
    const cx = hBorders.reduce((s, b) => s + (b.from + b.to) / 2, 0) / hBorders.length;
    return { cx, cy };
  }

  // Solo bordes verticales
  const cx = vBorders[0].fixedCoord;
  const cy = vBorders.reduce((s, b) => s + (b.from + b.to) / 2, 0) / vBorders.length;
  return { cx, cy };
}

export function calculateSensorInstances(
  monitorings: MonitoringResponse[],
  zoneBoundsMap: Map<string, ZoneBounds>
): SensorInstance[] {
  // Agrupar monitoreos por sensor
  const bySensor = new Map<string, MonitoringResponse[]>();
  for (const m of monitorings) {
    const list = bySensor.get(m.sensor.id) ?? [];
    list.push(m);
    bySensor.set(m.sensor.id, list);
  }

  const rawInstances: SensorInstance[] = [];

  for (const [sensorId, sensorMonitorings] of bySensor) {
    if (sensorMonitorings.length === 0) continue;

    if (sensorMonitorings.length === 1) {
      const m = sensorMonitorings[0];
      const bounds = zoneBoundsMap.get(m.zone.id);
      if (!bounds) continue;
      rawInstances.push({
        key: sensorId,
        sensorId,
        monitorings: sensorMonitorings,
        ...centroid(bounds),
        isMultiZone: false,
      });
      continue;
    }

    // Múltiples zonas: encontrar componentes conexos
    const zoneIds = [...new Set(sensorMonitorings.map((m) => m.zone.id))];
    const components = findConnectedComponents(zoneIds, zoneBoundsMap);

    components.forEach((component, ci) => {
      const compMonitorings = sensorMonitorings.filter((m) =>
        component.includes(m.zone.id)
      );
      const pos = componentPosition(component, zoneBoundsMap);
      rawInstances.push({
        key: components.length === 1 ? sensorId : `${sensorId}-${ci}`,
        sensorId,
        monitorings: compMonitorings,
        cx: pos.cx,
        cy: pos.cy,
        isMultiZone: component.length > 1,
      });
    });
  }

  // Resolver colisiones (distancia < 24px)
  for (let i = 0; i < rawInstances.length; i++) {
    for (let j = i + 1; j < rawInstances.length; j++) {
      const pi = rawInstances[i];
      const pj = rawInstances[j];
      if (Math.hypot(pi.cx - pj.cx, pi.cy - pj.cy) < 24) {
        pi.cx -= 12;
        pj.cx += 12;
      }
    }
  }

  return rawInstances;
}

export type FactoryState = {
  zones: ZoneResponse[];
  sensors: SensorResponse[];
  monitorings: MonitoringResponse[];
  zonePaths: Map<string, string>;
  zoneBoundsMap: Map<string, ZoneBounds>;
  sensorInstances: SensorInstance[];
  latestReadings: Record<string, Reading>;
  selectedZoneId: string | null;
  selectedSensorId: string | null;
  activeFilters: Set<FilterType>;
  loading: boolean;
  error: string | null;
  selectZone: (id: string | null) => void;
  selectSensor: (id: string | null) => void;
  toggleFilter: (type: FilterType) => void;
  updateLatestReadings: (newReadings: Record<string, Reading>) => void;
  refreshMonitorings: () => Promise<void>;
  refreshAll: () => Promise<void>;
};

// Carga todos los datos sin tocar estado React — se puede llamar desde el effect y desde callbacks
type AllData = {
  zones: ZoneResponse[];
  sensors: SensorResponse[];
  monitorings: MonitoringResponse[];
  zonePaths: Map<string, string>;
  zoneBoundsMap: Map<string, ZoneBounds>;
  latestReadings: Record<string, Reading>;
};

async function fetchAllData(): Promise<AllData> {
  const [zones, sensors, monitorings, latestReadings] = await Promise.all([
    getZones(),
    getSensors(),
    getMonitorings(),
    getLatestReadings(),
  ]);
  const zonePaths = calculateZonePaths(zones);
  const zoneBoundsMap = calculateZoneBoundsMap(zones);
  return { zones, sensors, monitorings, zonePaths, zoneBoundsMap, latestReadings };
}

export function useFactory(): FactoryState {
  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [sensors, setSensors] = useState<SensorResponse[]>([]);
  const [monitorings, setMonitorings] = useState<MonitoringResponse[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zonePaths, setZonePaths] = useState<Map<string, string>>(new Map());
  const [zoneBoundsMap, setZoneBoundsMap] = useState<Map<string, ZoneBounds>>(new Map());
  const [latestReadings, setLatestReadings] = useState<Record<string, Reading>>({});

  // sensorInstances se deriva de monitorings + zoneBoundsMap para reflejar cambios de current_value
  const sensorInstances = useMemo(
    () => calculateSensorInstances(monitorings, zoneBoundsMap),
    [monitorings, zoneBoundsMap]
  );

  useEffect(() => {
    fetchAllData()
      .then(({ zones, sensors, monitorings, zonePaths, zoneBoundsMap, latestReadings }) => {
        setZones(zones);
        setSensors(sensors);
        setMonitorings(monitorings);
        setZonePaths(zonePaths);
        setZoneBoundsMap(zoneBoundsMap);
        setLatestReadings(latestReadings);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Error al cargar los datos');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Actualiza latestReadings y current_value en monitorings para que el canvas refleje alertas
  const updateLatestReadings = useCallback((newReadings: Record<string, Reading>) => {
    setLatestReadings((prev) => ({ ...prev, ...newReadings }));
    setMonitorings((prev) =>
      prev.map((m) =>
        newReadings[m.id] !== undefined
          ? { ...m, current_value: newReadings[m.id].value }
          : m
      )
    );
  }, []);

  const refreshMonitorings = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([getSensors(), getMonitorings()]);
      setSensors(s);
      setMonitorings(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar monitoreos');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchAllData()
      .then(({ zones, sensors, monitorings, zonePaths, zoneBoundsMap, latestReadings }) => {
        setZones(zones);
        setSensors(sensors);
        setMonitorings(monitorings);
        setZonePaths(zonePaths);
        setZoneBoundsMap(zoneBoundsMap);
        setLatestReadings(latestReadings);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Error al cargar los datos');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const selectZone = useCallback((id: string | null) => {
    setSelectedZoneId(id);
    setSelectedSensorId(null);
  }, []);

  const selectSensor = useCallback((id: string | null) => {
    setSelectedSensorId(id);
    setSelectedZoneId(null);
  }, []);

  const toggleFilter = useCallback((type: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  }, []);

  return {
    zones, sensors, monitorings,
    zonePaths, zoneBoundsMap, sensorInstances,
    latestReadings,
    selectedZoneId, selectedSensorId,
    activeFilters, loading, error,
    selectZone, selectSensor, toggleFilter,
    updateLatestReadings,
    refreshMonitorings, refreshAll,
  };
}
