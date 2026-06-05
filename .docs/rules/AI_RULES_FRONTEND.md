# AI_RULES_FRONTEND.md — Reglas para el frontend

> Complementa [`AI_RULES.md`](./AI_RULES.md).

---

## Framework, estilos y librerías

- Framework: **React 18 + Vite 5 + TypeScript**.
- Estilos: **Tailwind CSS** exclusivamente. Sin CSS-in-JS ni librerías de componentes externas.
- Animaciones: **Framer Motion**. Para animaciones simples de SVG, CSS `@keyframes` es suficiente.
- Canvas/plano de planta: **SVG nativo dentro de React**. Sin Three.js, Konva ni React Flow.
- Enrutamiento: **React Router v6**.
- HTTP: **`fetch` nativo**. Sin Axios ni similares.
- Estado global: `useState` / `useReducer` por defecto. No instalar Redux, Zustand ni Jotai
  sin aprobación explícita.

---

## Identidad visual — obligatoria y no negociable

El diseño sigue la paleta y reglas del gemelo digital aprobado. Toda nueva vista o
componente debe respetar estas definiciones de color:

### Paleta de sensores

```css
--sensor-temp:  #D94F1E;   /* temperatura — naranja industrial */
--sensor-vib:   #1A8A5A;   /* vibración   — verde técnico     */
--sensor-flow:  #7040CC;   /* flujo       — violeta           */
--sensor-pres:  #1060B8;   /* presión     — azul acero        */
--sensor-alert: #DC2626;   /* alerta      — rojo crítico      */
--sensor-paused:#94A3B8;   /* pausado     — gris neutro       */
```

### Modo claro / oscuro

Toda la UI soporta ambos modos mediante variables CSS. Las variables base:

```css
/* Claro */
--bg-app: #ECEEF2;  --bg-surface: #F7F8FA;  --bg-panel: #FFFFFF;
--text-primary: #0D1520;  --text-secondary: #4B5668;  --text-muted: #8C97A8;
--zone-fill: #FFFFFF;  --zone-stroke: #C8CDD6;

/* Oscuro (.dark) */
--bg-app: #0A0E16;  --bg-surface: #111520;  --bg-panel: #161B26;
--text-primary: #DDE3EE;  --text-secondary: #7A8699;  --text-muted: #3E4758;
--zone-fill: #131825;  --zone-stroke: #2A3142;
```

No hardcodear colores fuera de estas variables. No agregar nuevos colores sin aprobación.

---

## Plano de planta (SVG)

### Reglas de zonas

- Las zonas se dibujan como paths SVG adyacentes — sin márgenes entre ellas.
- Los bordes **internos** (compartidos entre zonas) son rectos: `L x y`.
- Los bordes **externos** (perímetro de la fábrica) tienen `rx` de esquina (`Q` o arco).
- El grosor de borde de zona es `stroke-width="0.75"` siempre.
- Relleno de zona: `var(--zone-fill)` con opacidad de hover via Framer Motion.

### Reglas de sensores

- Los sensores son círculos SVG (`<circle>`) con radio base de `14`.
- Sensores activos: borde del color del tipo + animación de pulso CSS (`@keyframes`).
- Sensores pausados: borde gris punteado (`stroke-dasharray="3 2"`), opacidad `0.5`.
- Sensores en alerta: borde `var(--sensor-alert)` con `stroke-width="2"` + pulso más rápido (1s).
- Un sensor en colindancia entre N zonas se posiciona en el centroide de los bordes compartidos.
- Nunca posicionar sensores con coordenadas hardcodeadas en el componente —
  calcularlas desde la definición del grid.

### Fondo del canvas

Patrón de puntos SVG (`<pattern>`) con `r="0.7"` y color `var(--border-ui)`.
No usar grillas de líneas — solo puntos.

---

## Arquitectura de componentes

```
/pages
  FactoryPage.tsx        ← única página de la app
/components
  /factory
    FactoryCanvas.tsx    ← SVG del plano, recibe zonas y sensores como props
    ZoneShape.tsx        ← un path SVG por zona
    SensorMarker.tsx     ← un círculo SVG por sensor con animación
    SelectionRing.tsx    ← rect SVG de selección activa
  /panel
    DetailPanel.tsx      ← panel derecho con detalle, acciones y leyenda
    FilterLegend.tsx     ← sección colapsable de filtros
    SensorForm.tsx       ← formulario de agregar/modificar sensor
/services
  api.ts                 ← todas las llamadas HTTP centralizadas
/types
  Sensor.ts · Zone.ts · Monitoring.ts
/hooks
  useFactory.ts          ← estado del canvas: zona/sensor seleccionado, filtros activos
```

**Regla estricta:** `FactoryCanvas` es un componente puramente presentacional.
No hace fetch. Recibe todo por props y emite eventos hacia arriba.

---

## Capa de servicios (`/services/api.ts`)

Toda llamada HTTP pasa por aquí. Nunca `fetch` directo en un componente.

```typescript
// ✅ Patrón obligatorio para todas las funciones
export async function getZones(): Promise<ZoneResponse[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/zones`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? 'Error al obtener las zonas');
  }
  return res.json();
}
```

La URL base siempre viene de `import.meta.env.VITE_API_URL`. Nunca hardcodeada.

---

## Estados de carga — obligatorios en toda vista con datos

```typescript
const [data, setData]       = useState<ZoneResponse[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError]     = useState<string | null>(null);
```

- `loading`: mostrar indicador visual (spinner o skeleton).
- `error`: mostrar mensaje visible al usuario. Nunca silenciar errores.
- Lista vacía: mensaje informativo, nunca pantalla en blanco.

---

## Panel lateral — secciones colapsables

Cada sección (Detalle, Acciones, Leyenda/Filtros) es colapsable de forma independiente.
El estado de colapso persiste durante la sesión (no en localStorage).
La leyenda funciona también como filtro: desactivar un tipo oculta esos sensores del SVG.

---

## Indicadores visuales — requerimientos del enunciado

| Indicador | Implementación |
|-----------|---------------|
| Estado activo | Pulso animado CSS en el sensor |
| Estado pausado | Borde punteado, opacidad 0.5, sin pulso |
| Umbral superado | Borde rojo + pulso rápido (1s) + badge de alerta en panel |
| Filtro por tipo | Toggle en leyenda oculta/muestra sensores del SVG |
| Conteo por zona | Número de sensores activos visible en el tooltip/detalle de zona |

---

## Formulario de asignación

- Selects de sensor y zona cargados desde la API al montar.
- Validaciones antes de enviar: sensor obligatorio, zona obligatoria,
  umbral número positivo > 0, tipo de lectura obligatorio.
- Errores de validación junto al campo, nunca en `alert()`.
- Botón de submit deshabilitado mientras la petición está en curso.
- Confirmación visual al usuario tras éxito.

---

## Lo que la IA NO debe hacer en esta área

- ❌ Hacer `fetch` directamente en un componente.
- ❌ Usar Three.js, Konva, React Flow ni ningún motor de canvas.
- ❌ Hardcodear colores fuera de las variables CSS definidas.
- ❌ Hardcodear coordenadas de sensores o zonas en los componentes.
- ❌ Usar `alert()` o `console.log()` para comunicar errores al usuario.
- ❌ Crear class components.
- ❌ Omitir los estados `loading` y `error`.
- ❌ Agregar librerías de UI externas (MUI, Chakra, Ant Design, Shadcn).