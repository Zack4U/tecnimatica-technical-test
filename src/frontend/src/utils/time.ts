/**
 * Devuelve una cadena legible en español indicando cuánto tiempo pasó
 * desde la fecha indicada hasta ahora.
 *
 * Escala:
 *   < 60 s      → "Hace X segundos"
 *   < 60 min    → "Hace X minutos"
 *   < 24 h      → "Hace X horas"
 *   < 7 días    → "Hace X días"
 *   < 4 semanas → "Hace X semanas"
 *   < 12 meses  → "Hace X meses"
 *   ≥ 12 meses  → "DD/MM/AAAA"
 */
export function timeAgo(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const diffSecs = Math.floor((Date.now() - then) / 1000);

  if (diffSecs < 60) {
    return diffSecs <= 1 ? 'Hace 1 segundo' : `Hace ${diffSecs} segundos`;
  }

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return diffMins === 1 ? 'Hace 1 minuto' : `Hace ${diffMins} minutos`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return diffDays === 1 ? 'Hace 1 día' : `Hace ${diffDays} días`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? 'Hace 1 semana' : `Hace ${diffWeeks} semanas`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'Hace 1 mes' : `Hace ${diffMonths} meses`;
  }

  // Más de un año → fecha exacta
  const d = new Date(then);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  return `${dd}/${mm}/${aaaa}`;
}
