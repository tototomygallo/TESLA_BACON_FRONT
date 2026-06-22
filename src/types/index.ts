// ============================================
// Tipos compartidos del dominio TauKits
// Alineados con SCOPE 1 — Tesla/Bacon
// ============================================

export type Rol = 'tecnico' | 'bioquimico' | 'admin';

// Estados oficiales según el SCOPE (sección 2.5) + 'anulado'.
// El error NO es un estado, es un flag separado en la muestra
// (porque una muestra puede tener error en una carga previa y
// seguir siendo válida para reintentar).
// 'anulado': el TauKit agotó sus 2 mediciones con error y queda
// fuera de circulación — hay que usar otro TauKit.
export type Estado = 'recibido' | 'en_proceso' | 'en_validacion' | 'completado' | 'anulado';

export interface Usuario {
  id: string;
  username: string;
  nombre: string;
  rol: Rol;
  passwordExpired?: boolean;
}

export interface UsuarioConfiguracion {
  id: string;
  usuario: string;
  email: string;
  nombre?: string;
  rol: Rol | string;
  activo: boolean;
}

// Datos del paciente que devuelve la API de BACON al consultar
// por un código TauKit (sección 2.3 del scope).
export interface Paciente {
  nombre: string;
  apellido: string;
  dni: string;
  fechaTomaMuestra: string; // 'YYYY-MM-DD'
}

// Sucursal del laboratorio (para generar el protocolo interno).
export interface Sucursal {
  codigo: string;
  nombre: string; // ej. 'Tucumán - Mate de Luna'
}

// Tipo de estudio (para el protocolo y para etiquetas).
export interface Estudio {
  codigo: string; // 2 letras, ej. 'HC'
  nombre: string; // ej. 'Hemograma Completo'
}

export interface Muestra {
  // Protocolo interno: SS-EE-NNNNNNNN (sucursal-estudio-consecutivo).
  // Es el identificador principal del sistema, generado al confirmar
  // el ingreso de un lote.
  protocolo: string;

  // Código TauKit que viene impreso en el tubo físico.
  // Es el código que se escanea con el lector.
  codigoTauKit: string;

  // Tipo de estudio: determina si es un Taukit o un Lactokit.
  tipoEstudio: 'taukit' | 'lactokit';

  // Código alternativo para Lactokit (cuando aplique).
  codigoLactokit?: string | null;

  // Datos del paciente (vienen de BACON).
  paciente: Paciente;

  // Estudio asociado (determina las 'EE' del protocolo).
  estudio: Estudio;

  // Sucursal donde se recibió la muestra.
  sucursal: Sucursal;

  // Estado actual del ciclo de vida.
  estado: Estado;

  // Timestamp de cuándo entró al sistema.
  fechaIngreso: string; // 'YYYY-MM-DD HH:mm'

  // Flag de error: indica que un intento de carga de resultados falló.
  // Si intentosFallidos >= 2, no se puede generar el informe.
  tieneError: boolean;
  intentosFallidos: number;

  // Resultados cargados del TXT del HeliFan. null hasta que se cargue.
  resultados: ResultadoMuestra | null;

  // Resultados específicos para Lactokit.
  resultadosLactokit?: ResultadoLactokit | null;
}

export interface ValidacionMuestraResponse extends Muestra {
  pdfGenerado?: boolean;
  pdfVerificado?: boolean;
  pdfVerificacion?: {
    success?: boolean;
    nombre_esperado?: string;
    archivo?: {
      nombre?: string;
      fecha_subida?: string;
      tamaño?: string;
      url?: string;
    };
  };
}

// Resultados de un Lactokit según el backend.
export interface ResultadoLactokit {
  h2: Array<number | null>; // 8 valores (uno por frasco) o más/menos según backend
  ch4: Array<number | null>;
  co2: Array<number | null>;
  valoracion: '1' | '2' | '3' | '4' | 'ERROR';
  descripcion: string;
  cargadoEn: string; // 'YYYY-MM-DD HH:mm'
}

export interface Discrepancia {
  codigo: string;       // TauKit que se intentó ingresar
  fecha: string;        // 'YYYY-MM-DD HH:mm'
  motivo: string;       // ej: 'No figura como enviado en BACON'
}

export interface ResumenDiario {
  fecha: string; // 'YYYY-MM-DD'
  ingresadas: number;
  procesadas: number;
  finalizadas: number;
  pendientes: number;
  discrepancias: number;
  rechazados: Discrepancia[]; // detalle de cada código rechazado
}

export interface ResultadoIngreso {
  ingresadas: Muestra[]; // muestras completas ingresadas (con su protocolo, paciente, etc.)
  rechazadas: string[]; // códigos TauKit rechazados por BACON
  duplicadas: string[]; // códigos TauKit ya ingresados
}

export interface ProtocoloEditado {
  protocolo: string;
  numeroSerie: string;
  tipoEstudio: 'taukit' | 'lactokit' | string;
  fechaIngreso: string;
  fechaEdicion: string;
  motivo: string;
  usuario: string;
  camposEditados?: string[];
}

// Resultados de una muestra parseados del TXT del HeliFan.
export interface ResultadoMuestra {
  basalCO2: number;
  postCO2: number;
  basalDelta: number;
  postDelta: number;
  testValue: number; // incremento sobre basal
  cargadoEn: string; // timestamp 'YYYY-MM-DD HH:mm'
}

// Resultado de procesar una carga de TXT (sección 2.6 del scope).
export interface ResultadoCargaTxt {
  // Protocolos que pasaron a 'en_validacion' con resultados nuevos.
  cargadosOk: string[];
  // Protocolos que pasaron a 'en_validacion' pisando un error previo
  // (sección 2.6: "el sistema pisa solo los resultados con error previo").
  cargadosReintentando: string[];
  // Protocolos con error del equipo (postDelta = -10000) que todavía
  // tienen intentos disponibles. Marcan tieneError pero no cambian estado.
  conErrorEquipo: string[];
  // Protocolos que con esta carga llegaron a 2 errores → quedaron anulados
  // (el TauKit agotó sus mediciones).
  anuladas: string[];
  // TestIDs del TXT que no matchean con ningún protocolo del sistema.
  noEncontrados: string[];
  // Protocolos que ya estaban completados (no se pisan).
  yaCompletados: string[];
  // Protocolos que ya estaban anulados (no se les cargan resultados).
  yaAnuladas: string[];
  // Controles descartados del TXT.
  controles: number;
  // Errores de parseo (líneas mal formateadas).
  erroresParseo: number;
}

// ============================================
// Datos de BACON (API externa)
// ============================================
// Estructura que devuelve el endpoint /api/getSerialNumbers de BACON
// filtrado por estado=logistica (muestras enviadas al laboratorio).

export interface BaconMuestra {
  REM: string;                 // Remito (ej. 'REM00001-00000002-1')
  numero_serie: string;        // Código TauKit (ej. 'TK000001', '10000006')
  ctm: string;                 // Centro/clínica (ej. 'CLINICA 2')
  medico: string | null;       // Médico solicitante
  estado: string;              // Estado en BACON (ej. 'Logística')
  fecha_carga: string;         // Fecha de carga en BACON (ej. '26/05/2025 14:32pm')
  paciente: {
    nombre: string | null;     // Nombre del paciente
    codigo: string | null;     // Código interno de BACON
    documento: string | null;  // DNI
  };
}
