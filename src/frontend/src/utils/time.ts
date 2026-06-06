/**
 * Devuelve cuánto tiempo pasó desde la fecha indicada hasta ahora, en español.
 *
 *   < 1 min   → "Hace X segundos"  (mínimo "Hace 1 segundo")
 *   < 1 h     → "Hace X minutos"
 *   < 24 h    → "Hace X horas"
 *   < 7 días  → "Hace X días"
 *   < 4 sem   → "Hace X semanas"
 *   < 12 mes  → "Hace X meses"
 *   ≥ 12 mes  → "DD/MM/AAAA"
 *
 * Los timestamps ligeramente futuros (desfase de reloj) se tratan como 1 segundo.
 */
export function timeAgo(date: Date | string): string {
  const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime();

  // Clampeamos a mínimo 1 para que timestamps "del futuro" (desfase de reloj
  // entre servidor y cliente) muestren "Hace 1 segundo" en vez de valores raros.
  const diffSecs = Math.max(1, Math.round((Date.now() - then) / 1000));

  if (diffSecs < 60) {
    return diffSecs === 1 ? 'Hace 1 segundo' : `Hace ${diffSecs} segundos`;
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

  const d = new Date(then);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  return `${dd}/${mm}/${aaaa}`;
}
