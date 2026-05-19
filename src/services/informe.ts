import type { Muestra } from '../types';

// Lazy-load del módulo de informes (jsPDF + imágenes).
export async function generarInformePdf(muestra: Muestra): Promise<void> {
  const mod = await import('./informePdf');
  return mod.generarInformePdf(muestra);
}
