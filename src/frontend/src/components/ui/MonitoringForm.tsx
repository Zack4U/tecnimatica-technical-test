import { useState, useEffect } from 'react';
import type { MonitoringResponse, ReadingType, MonitoringStatus } from '../../types/Monitoring.js';
import type { SensorResponse } from '../../types/Sensor.js';
import type { ZoneResponse } from '../../types/Zone.js';
import { getSensors, getZones, createMonitoring, updateMonitoring } from '../../services/api.js';

type Props = {
  mode: 'create' | 'edit';
  monitoring?: MonitoringResponse;
  preselectedZoneId?: string;
  preselectedSensorId?: string;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string, variant: 'success' | 'error') => void;
};

type FieldErrors = Partial<Record<string, string>>;

const READING_TYPES: ReadingType[] = ['temperature', 'pressure', 'vibration', 'flow'];
const READING_LABELS: Record<ReadingType, string> = {
  temperature: 'Temperatura',
  pressure:    'Presión',
  vibration:   'Vibración',
  flow:        'Flujo',
};

// Unidades del Sistema Internacional para cada tipo de lectura
const READING_UNITS: Record<ReadingType, string> = {
  temperature: '°C',
  pressure:    'bar',
  vibration:   'mm/s',
  flow:        'L/min',
};

export function MonitoringForm({
  mode,
  monitoring,
  preselectedZoneId,
  preselectedSensorId,
  onSuccess,
  onClose,
  showToast,
}: Props) {
  const [sensors, setSensors] = useState<SensorResponse[]>([]);
  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const today = new Date().toISOString().split('T')[0] ?? '';

  const [sensorId, setSensorId] = useState(preselectedSensorId ?? '');
  const [zoneId, setZoneId] = useState(preselectedZoneId ?? '');
  const [installationDate, setInstallationDate] = useState(today);
  const [readingType, setReadingType] = useState<ReadingType>('temperature');
  // En edición, los valores se inicializan directamente desde la prop (el form se remonta en cada apertura)
  const [thresholdValue, setThresholdValue] = useState(
    () => (mode === 'edit' && monitoring) ? monitoring.threshold_value.toString() : ''
  );
  const [currentValue, setCurrentValue] = useState(
    () => (mode === 'edit' && monitoring) ? (monitoring.current_value?.toString() ?? '') : ''
  );
  const [status, setStatus] = useState<MonitoringStatus>(
    () => (mode === 'edit' && monitoring) ? monitoring.status : 'active'
  );

  // Unidad activa según el tipo de lectura seleccionado (o fijado en edición)
  const activeUnit = mode === 'edit' && monitoring
    ? READING_UNITS[monitoring.reading_type]
    : READING_UNITS[readingType];

  useEffect(() => {
    if (mode !== 'create') return;
    Promise.all([getSensors(), getZones()])
      .then(([s, z]) => {
        setSensors(s);
        setZones(z);
        // Si hay sensor preseleccionado, sincronizar tipo al cargar la lista
        if (preselectedSensorId) {
          const preset = s.find((x) => x.id === preselectedSensorId);
          if (preset) setReadingType(preset.type as ReadingType);
        }
      })
      .catch(() => {
        setGeneralError('Error al cargar sensores y zonas');
      });
  }, [mode, preselectedSensorId]);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (mode === 'create') {
      if (!sensorId) errors['sensorId'] = 'Selecciona un sensor';
      if (!zoneId) errors['zoneId'] = 'Selecciona una zona';
      if (!readingType) errors['readingType'] = 'Selecciona el tipo de lectura';
    }
    const thr = parseFloat(thresholdValue);
    if (!thresholdValue || isNaN(thr) || thr <= 0) {
      errors['thresholdValue'] = 'El umbral debe ser un número mayor que cero';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGeneralError(null);
    try {
      if (mode === 'create') {
        const cv = currentValue !== '' ? parseFloat(currentValue) : undefined;
        await createMonitoring({
          sensor_id: sensorId,
          zone_id: zoneId,
          installation_date: installationDate,
          reading_type: readingType,
          threshold_value: parseFloat(thresholdValue),
          current_value: cv,
          status,
        });
        showToast('Monitoreo creado correctamente', 'success');
      } else if (monitoring) {
        const cv =
          currentValue !== '' ? parseFloat(currentValue) : undefined;
        await updateMonitoring(monitoring.id, {
          threshold_value: parseFloat(thresholdValue),
          current_value: cv,
          status,
        });
        showToast('Monitoreo actualizado correctamente', 'success');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setGeneralError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {mode === 'create' && (
          <>
            <Field label="Sensor" error={fieldErrors['sensorId']}>
              <select
                id="f-sensor"
                value={sensorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSensorId(id);
                  // Auto-rellena el tipo de medición al elegir sensor (en lugar de useEffect)
                  const found = sensors.find((s) => s.id === id);
                  if (found) setReadingType(found.type as ReadingType);
                }}
                style={inputStyle}
              >
                <option value="">Selecciona un sensor…</option>
                {sensors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Zona" error={fieldErrors['zoneId']}>
              <select
                id="f-zone"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecciona una zona…</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de lectura" error={fieldErrors['readingType']}>
              <select
                id="f-reading"
                value={readingType}
                onChange={(e) => setReadingType(e.target.value as ReadingType)}
                style={inputStyle}
              >
                {READING_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {READING_LABELS[rt]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha de instalación">
              <input
                id="f-date"
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </>
        )}

        <Field label={`Valor umbral (${activeUnit})`} error={fieldErrors['thresholdValue']}>
          <UnitInput
            id="f-threshold"
            value={thresholdValue}
            unit={activeUnit}
            placeholder="Ej: 85.00"
            min="0.01"
            onChange={setThresholdValue}
          />
        </Field>

        <Field label={`Valor actual (${activeUnit}) — opcional`}>
          <UnitInput
            id="f-current"
            value={currentValue}
            unit={activeUnit}
            placeholder="Ej: 72.50"
            min="0"
            onChange={setCurrentValue}
          />
        </Field>

        <Field label="Estado">
          <select
            id="f-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MonitoringStatus)}
            style={inputStyle}
          >
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
          </select>
        </Field>

        {generalError && (
          <p style={{ color: 'var(--sensor-alert)', fontSize: '0.75rem', margin: 0 }}>
            {generalError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={secondaryBtnStyle}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={primaryBtnStyle}
          >
            {loading ? 'Guardando…' : mode === 'create' ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
}

// Input numérico con unidad SI como suffix integrado
function UnitInput({
  id, value, unit, placeholder, min, onChange,
}: {
  id: string;
  value: string;
  unit: string;
  placeholder: string;
  min: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <input
        id={id}
        type="number"
        min={min}
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, borderRadius: '0.35rem 0 0 0.35rem', flex: 1 }}
      />
      <span style={{
        padding: '0.4rem 0.6rem',
        border: '1px solid var(--border-ui)', borderLeft: 'none',
        borderRadius: '0 0.35rem 0.35rem 0',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-muted)',
        fontSize: '0.72rem', fontWeight: 700,
        whiteSpace: 'nowrap', flexShrink: 0,
        lineHeight: 1.5,
      }}>
        {unit}
      </span>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ color: 'var(--sensor-alert)', fontSize: '0.65rem' }}>
          {error}
        </span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  borderRadius: '0.35rem',
  border: '1px solid var(--border-ui)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%',
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '0.4rem',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-ui)',
  borderRadius: '0.4rem',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
};
