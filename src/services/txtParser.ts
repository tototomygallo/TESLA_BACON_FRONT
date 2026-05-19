// ============================================
// Parser de TXT del HeliFan
// ============================================
// Formato esperado:
//   t/min   12CO2/%  Delta,c/‰  TestValue  TestID
//      0    1,69228   -25,96       -0,2    510059231101
//     30    1,66703   -26,15
//      ...
//
// Cada muestra ocupa 2 líneas: minuto 0 (basal) + minuto 30 (post).
// TestValue y TestID aparecen solo en la línea del minuto 0.
// Si Delta del minuto 30 es -10000,00 → error del equipo (la muestra
// fue inválida en el HeliFan).
// Las líneas con TestID que contiene 'CONTROL' o '..' se ignoran.

export interface ResultadoTxt {
  testId: string;
  basalCO2: number;
  postCO2: number;
  basalDelta: number;
  postDelta: number;
  testValue: number;
  tieneErrorEquipo: boolean; // postDelta === -10000
}

export interface ParseError {
  linea: number;
  contenido: string;
  motivo: string;
}

export interface ParseResult {
  resultados: ResultadoTxt[];
  controles: number; // cantidad de filas CONTROL descartadas
  errores: ParseError[]; // filas que no se pudieron parsear
  totalFilasMuestra: number; // filas minuto-0 procesadas (excluyendo controles/header)
}

// Convierte "1,69228" o "1.69228" a número
function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

// Split por whitespace, descartando vacíos
function tokenize(linea: string): string[] {
  return linea.trim().split(/\s+/).filter(Boolean);
}

// Detecta si un TestID es válido (no es control, no está truncado)
function esTestIdValido(testId: string): boolean {
  const t = testId.trim();
  if (!t) return false;
  if (t.toUpperCase().includes('CONTROL')) return false;
  if (t.includes('..')) return false;
  return true;
}

export function parsearTxt(contenido: string): ParseResult {
  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const resultados: ResultadoTxt[] = [];
  const errores: ParseError[] = [];
  let controles = 0;
  let totalFilasMuestra = 0;

  // Estado para emparejar minuto 0 con minuto 30
  let basalPendiente: {
    testId: string;
    basalCO2: number;
    basalDelta: number;
    testValue: number;
    linea: number;
  } | null = null;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const tokens = tokenize(linea);

    // Skip header (no empieza con número)
    if (tokens.length === 0 || isNaN(parseInt(tokens[0]))) {
      continue;
    }

    const tMin = parseInt(tokens[0]);

    // === Línea minuto 0: basal ===
    if (tMin === 0) {
      // Esperamos: t=0, CO2, Delta, TestValue, TestID (...TestID puede tener espacios)
      // Mínimo 5 tokens si el TestID es simple
      if (tokens.length < 5) {
        errores.push({
          linea: i + 1,
          contenido: linea,
          motivo: 'Línea minuto 0 con menos campos de los esperados',
        });
        basalPendiente = null;
        continue;
      }

      const basalCO2 = parseNum(tokens[1]);
      const basalDelta = parseNum(tokens[2]);
      const testValue = parseNum(tokens[3]);
      // El TestID puede contener espacios (caso CONTROL 27-0..), unir tokens restantes
      const testId = tokens.slice(4).join(' ');

      if ([basalCO2, basalDelta, testValue].some(isNaN)) {
        errores.push({
          linea: i + 1,
          contenido: linea,
          motivo: 'No se pudieron parsear los valores numéricos',
        });
        basalPendiente = null;
        continue;
      }

      totalFilasMuestra++;

      if (!esTestIdValido(testId)) {
        controles++;
        basalPendiente = null;
        continue;
      }

      basalPendiente = {
        testId: testId.trim(),
        basalCO2,
        basalDelta,
        testValue,
        linea: i + 1,
      };
      continue;
    }

    // === Línea minuto 30: post ===
    if (tMin === 30) {
      if (!basalPendiente) {
        // Minuto 30 sin basal: o es un control (lo descartamos en silencio)
        // o es un error de formato
        continue;
      }

      if (tokens.length < 3) {
        errores.push({
          linea: i + 1,
          contenido: linea,
          motivo: 'Línea minuto 30 con menos campos de los esperados',
        });
        basalPendiente = null;
        continue;
      }

      const postCO2 = parseNum(tokens[1]);
      const postDelta = parseNum(tokens[2]);

      if (isNaN(postCO2) || isNaN(postDelta)) {
        errores.push({
          linea: i + 1,
          contenido: linea,
          motivo: 'No se pudieron parsear los valores numéricos del minuto 30',
        });
        basalPendiente = null;
        continue;
      }

      // Delta = -10000 significa error del equipo
      const tieneErrorEquipo = postDelta <= -9999;

      resultados.push({
        testId: basalPendiente.testId,
        basalCO2: basalPendiente.basalCO2,
        postCO2,
        basalDelta: basalPendiente.basalDelta,
        postDelta,
        testValue: basalPendiente.testValue,
        tieneErrorEquipo,
      });

      basalPendiente = null;
    }
  }

  return {
    resultados,
    controles,
    errores,
    totalFilasMuestra,
  };
}
