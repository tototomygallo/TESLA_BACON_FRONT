import type { Muestra } from '../types';

// Lazy-load del módulo de etiquetas (jsPDF + jsbarcode pesan ~700KB).
// Solo se carga cuando el usuario realmente genera etiquetas.

export async function generarEtiquetasPdf(
  muestras: Muestra[],
  nombreArchivo?: string,
): Promise<void> {
  const mod = await import('./etiquetasPdf');
  return mod.generarEtiquetasPdf(muestras, nombreArchivo);
}

export async function generarEtiquetasMuestra(muestra: Muestra): Promise<void> {
  const mod = await import('./etiquetasPdf');
  return mod.generarEtiquetasMuestra(muestra);
}
