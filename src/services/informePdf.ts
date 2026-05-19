import { jsPDF } from 'jspdf';
import type { Muestra } from '../types';

// Import assets como base64 en build time (Vite)
import headerImg from '../assets/header-tesla.png';
import firmaImg from '../assets/firma-pucci.png';

// ============================================
// Generador de informe PDF (scope 2.7)
// ============================================
// Replica el layout del template de Tesla Diagnóstico.
// Campos dinámicos: paciente, protocolo, DNI, ingreso,
// código TauKit, fecha de toma, valores del HeliFan, resultado.
// Campos removidos: Obra Social, Edad, Médico, Fecha Nacimiento.

const PAGE_W = 210; // A4 mm
const MARGIN_L = 20;
const MARGIN_R = 20;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const COLOR_DORADO: [number, number, number] = [180, 145, 60];
const COLOR_NEGRO: [number, number, number] = [0, 0, 0];
const COLOR_GRIS: [number, number, number] = [100, 100, 100];

function formatearFechaInforme(fecha: string): string {
  // 'YYYY-MM-DD HH:mm' → 'DD/MM/YYYY HH:mm'
  const [date, time] = fecha.split(' ');
  if (!date) return fecha;
  const [y, m, d] = date.split('-');
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`;
}

function formatearFechaCorta(fecha: string): string {
  // 'YYYY-MM-DD' → 'DD-MM-YYYY'
  const [y, m, d] = fecha.split('-');
  return `${d}-${m}-${y}`;
}

// Carga una imagen como HTMLImageElement (necesario para medir proporciones)
function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Genera el informe PDF de una muestra completada y dispara la descarga.
 * Requiere que la muestra tenga resultados cargados.
 */
export async function generarInformePdf(muestra: Muestra): Promise<void> {
  if (!muestra.resultados) {
    throw new Error('La muestra no tiene resultados cargados');
  }

  const r = muestra.resultados;
  const resultado = r.testValue > 5 ? 'Positivo' : 'Negativo';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // --- Cargar imágenes ---
  const [headerImage, firmaImage] = await Promise.all([
    cargarImagen(headerImg),
    cargarImagen(firmaImg),
  ]);

  let y = 12;

  // ============================================
  // CABECERA: logo Tesla (imagen completa del encabezado)
  // ============================================
  const headerAspect = headerImage.naturalWidth / headerImage.naturalHeight;
  const headerW = CONTENT_W;
  const headerH = headerW / headerAspect;
  doc.addImage(headerImg, 'PNG', MARGIN_L, y, headerW, headerH);
  y += headerH + 6;

  // ============================================
  // DATOS DEL PACIENTE
  // ============================================
  const pacienteNombre = `${muestra.paciente.apellido} ${muestra.paciente.nombre}`.toUpperCase();

  // Fila 1: Paciente + Página
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Paciente : ', MARGIN_L, y);
  doc.setFont('helvetica', 'bold');
  doc.text(pacienteNombre, MARGIN_L + 22, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Página 1 de 1', PAGE_W - MARGIN_R, y, { align: 'right' });
  y += 5;

  // Fila 2: Protocolo + Ingreso
  doc.text('Protocolo Nº : ', MARGIN_L, y);
  doc.setFont('helvetica', 'bold');
  doc.text(muestra.protocolo, MARGIN_L + 29, y);
  doc.setFont('helvetica', 'normal');
  const ingresoTexto = `Ingreso : ${formatearFechaInforme(muestra.fechaIngreso)}`;
  doc.setFont('helvetica', 'bold');
  doc.text(ingresoTexto, PAGE_W - MARGIN_R, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y += 5;

  // Fila 3: DNI
  doc.text('Documento:', MARGIN_L, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`DNI ${muestra.paciente.dni}`, MARGIN_L + 23, y);
  doc.setFont('helvetica', 'normal');
  y += 6;

  // Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_NEGRO);
  doc.text(
    'El presente informe es orientativo, no determinante y realizado para que lo interprete y evalúe el Médico solicitante, quien',
    MARGIN_L,
    y,
  );
  y += 3.5;
  doc.text(
    'tendrá en cuenta su Historia Clínica. Evite autodiagnosticarse.',
    MARGIN_L,
    y,
  );
  y += 5;

  // Línea separadora
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 5;

  // Encabezado de tabla: Determinación / Resultado / Unidad / Valores de Referencia
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Determinación', MARGIN_L, y);
  doc.text('Resultado', 110, y);
  doc.text('Unidad', 135, y);
  doc.text('Valores de Referencia', PAGE_W - MARGIN_R, y, { align: 'right' });
  y += 2;

  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 8;

  // ============================================
  // SECCIÓN DE RESULTADOS
  // ============================================
  // Título del estudio
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('HELICOBACTER PYLORI AIRE ESPIRADO', MARGIN_L, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Valoracion de 13CO2 por espectroscopia infraroja', MARGIN_L, y);
  y += 8;

  // Campos de datos (etiqueta a la izquierda, valor alineado al centro)
  const colValor = 100;

  const filas: Array<{ label: string; valor: string; bold?: boolean }> = [
    { label: 'Código TAUKIT', valor: muestra.codigoTauKit, bold: true },
    { label: 'Fecha de toma de muestra', valor: formatearFechaCorta(muestra.paciente.fechaTomaMuestra) },
    { label: 'Valor de lectura basal', valor: r.basalDelta.toFixed(1) },
    { label: 'Valor de lectura post 30 minut', valor: r.postDelta.toFixed(1) },
  ];

  doc.setFontSize(10);
  for (const fila of filas) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_NEGRO);
    doc.text(fila.label, MARGIN_L, y);
    doc.setFont('helvetica', fila.bold ? 'bold' : 'normal');
    doc.text(fila.valor, colValor, y);
    y += 5.5;
  }

  // Incremento sobre basal + valores de referencia
  doc.setFont('helvetica', 'normal');
  doc.text('Incremento sobre basal', MARGIN_L, y);
  doc.setFont('helvetica', 'bold');
  doc.text(String(r.testValue), colValor, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Hasta 5 : Negativo', PAGE_W - MARGIN_R, y, { align: 'right' });
  y += 4.5;
  doc.text('Mayor de 5: Positivo', PAGE_W - MARGIN_R, y, { align: 'right' });
  y += 7;

  // Resultado
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Resultado', MARGIN_L, y);
  doc.setFont('helvetica', 'bold');
  doc.text(resultado, colValor, y);
  y += 8;

  // Muestra recibida
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Muestra recibida: ${muestra.fechaIngreso.replace(' ', ' ')}`, MARGIN_L, y);

  // ============================================
  // PIE: firma + textos legales
  // ============================================
  const pieY = 260;

  // Firma (imagen)
  const firmaAspect = firmaImage.naturalWidth / firmaImage.naturalHeight;
  const firmaH = 20;
  const firmaW = firmaH * firmaAspect;
  doc.addImage(firmaImg, 'PNG', PAGE_W - MARGIN_R - firmaW - 5, pieY - 22, firmaW, firmaH);

  // Línea separadora del pie
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, pieY + 2, PAGE_W - MARGIN_R, pieY + 2);

  // Texto de validación
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Este protocolo fue validado y firmado electrónicamente por:', MARGIN_L, pieY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text('Lic. Jorge E.R.Pucci', PAGE_W - MARGIN_R, pieY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('M.P. 3280  CPQ', PAGE_W - MARGIN_R, pieY + 8, { align: 'right' });

  // Línea final
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, pieY + 12, PAGE_W - MARGIN_R, pieY + 12);

  // Texto de copia fiel
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'El presente documento es copia fiel del original que se encuentra alojado en servidores.',
    MARGIN_L,
    pieY + 17,
  );

  // Guardar
  doc.save(`informe-${muestra.protocolo}.pdf`);
}
