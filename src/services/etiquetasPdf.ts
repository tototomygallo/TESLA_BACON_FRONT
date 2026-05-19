import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import type { Muestra } from '../types';

// ============================================
// Generador de etiquetas PDF (scope 2.4)
// ============================================
// Cada etiqueta es una página de 40mm × 25mm.
// Se generan 5 páginas idénticas por muestra (5 etiquetas para pegar
// en las muestras físicas). La impresora de etiquetas las saca del
// rollo una tras otra.
//
// Contenido de cada etiqueta:
//   - Código de barras (Code128) del protocolo interno
//   - El número de protocolo en texto

const LABEL_W = 40; // mm
const LABEL_H = 25; // mm
const LABELS_POR_MUESTRA = 5;

function generarBarcodeDataURL(texto: string): string {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, texto, {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: false,
    margin: 0,
    background: '#ffffff',
    lineColor: '#000000',
  });
  return canvas.toDataURL('image/png');
}

function dibujarEtiqueta(
  doc: jsPDF,
  protocolo: string,
  barcodeDataURL: string,
): void {
  const padX = 2.5;
  const padY = 2;

  // Código de barras centrado en la parte superior
  const barcodeW = LABEL_W - padX * 2;
  const barcodeH = 13;
  doc.addImage(barcodeDataURL, 'PNG', padX, padY, barcodeW, barcodeH);

  // Protocolo en texto debajo del barcode, centrado
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(protocolo, LABEL_W / 2, padY + barcodeH + 5, {
    align: 'center',
  });
}

/**
 * Genera un PDF con 5 etiquetas por muestra (una por página, 40×25mm).
 * La impresora de etiquetas saca 5 del rollo.
 */
export function generarEtiquetasPdf(
  muestras: Muestra[],
  nombreArchivo: string = 'etiquetas',
): void {
  if (muestras.length === 0) {
    throw new Error('No hay muestras para generar etiquetas');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [LABEL_W, LABEL_H], // Página del tamaño exacto de la etiqueta
  });

  // Pre-generar un barcode por muestra
  const barcodes = new Map<string, string>();
  for (const m of muestras) {
    barcodes.set(m.protocolo, generarBarcodeDataURL(m.protocolo));
  }

  let primera = true;

  for (const m of muestras) {
    const barcode = barcodes.get(m.protocolo)!;
    for (let i = 0; i < LABELS_POR_MUESTRA; i++) {
      if (!primera) {
        doc.addPage([LABEL_W, LABEL_H], 'landscape');
      }
      dibujarEtiqueta(doc, m.protocolo, barcode);
      primera = false;
    }
  }

  doc.save(`${nombreArchivo}.pdf`);
}

/**
 * Genera etiquetas para una sola muestra (5 páginas).
 */
export function generarEtiquetasMuestra(muestra: Muestra): void {
  generarEtiquetasPdf([muestra], `etiquetas-${muestra.protocolo}`);
}
