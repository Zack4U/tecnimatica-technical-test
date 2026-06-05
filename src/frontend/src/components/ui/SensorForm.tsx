import { useState } from 'react';
import type { SensorType } from '../../types/Sensor.js';
import { createSensor } from '../../services/api.js';

type Props = {
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string, variant: 'success' | 'error') => void;
};

const SENSOR_TYPES: SensorType[] = ['temperature', 'pressure', 'vibration', 'flow'];

const TYPE_LABELS: Record<SensorType, string> = {
  temperature: 'Temperatura',
  pressure:    'Presión',
  vibration:   'Vibración',
  flow:        'Flujo',
};

const MANUFACTURERS = ['Siemens', 'Honeywell', 'ABB', 'Endress+Hauser', 'Yokogawa', 'Otro'];

type Errors = Partial<Record<string, string>>;

export function SensorForm({ onSuccess, onClose, showToast }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<SensorType>('temperature');
  const [manufacturer, setManufacturer] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  function validate(): boolean {
    const e: Errors = {};
    if (!name.trim()) e['name'] = 'El nombre es obligatorio';
    if (!manufacturer.trim()) e['manufacturer'] = 'El fabricante es obligatorio';
    if (!manufactureDate) e['manufactureDate'] = 'La fecha es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGeneralError(null);
    try {
      await createSensor({
        name: name.trim(),
        type,
        manufacturer: manufacturer.trim(),
        manufacture_date: manufactureDate,
      });
      showToast('Sensor creado correctamente', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear sensor';
      setGeneralError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        <Field label="Nombre del sensor" error={errors['name']}>
          <input
            id="sf-name" type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sensor de temperatura caldera 2"
            style={inputStyle}
          />
        </Field>

        <Field label="Tipo">
          <select id="sf-type" value={type} onChange={(e) => setType(e.target.value as SensorType)} style={inputStyle}>
            {SENSOR_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>

        <Field label="Fabricante" error={errors['manufacturer']}>
          <input
            id="sf-mfr" type="text" list="manufacturers" value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Ej: Siemens"
            style={inputStyle}
          />
          <datalist id="manufacturers">
            {MANUFACTURERS.map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>

        <Field label="Fecha de fabricación" error={errors['manufactureDate']}>
          <input
            id="sf-date" type="date" value={manufactureDate}
            onChange={(e) => setManufactureDate(e.target.value)}
            style={inputStyle}
          />
        </Field>

        {generalError && (
          <p style={{ color: 'var(--sensor-alert)', fontSize: '0.75rem', margin: 0 }}>
            {generalError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button type="button" onClick={onClose} disabled={loading} style={secondaryBtn}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Creando…' : 'Crear sensor'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ color: 'var(--sensor-alert)', fontSize: '0.65rem' }}>{error}</span>}
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

const primaryBtn: React.CSSProperties = {
  backgroundColor: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '0.4rem',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-ui)',
  borderRadius: '0.4rem',
  padding: '0.5rem 1rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
};
