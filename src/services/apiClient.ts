import type {
  BaconMuestra,
  Muestra,
  ResultadoCargaTxt,
  ResultadoIngreso,
  ResumenDiario,
  Usuario,
} from '../types';

// ============================================
// Contrato de la API
// ============================================
// Cualquier implementación (mock o real) debe respetar esta interfaz.

export interface ApiClient {
  // --- Autenticación ---
  login(userId: string, password: string): Promise<Usuario>;

  // --- BACON: control previo (scope 2.2) ---
  // Trae las muestras que BACON informó como enviadas (estado=logistica).
  // En producción: el back hace proxy a la API de BACON.
  obtenerMuestrasEnviadasBacon(): Promise<BaconMuestra[]>;
  obtenerBaconPendientes(): Promise<{ cantidad: number; codigos: string[] }>;
  reintentarBaconPendientes(): Promise<{ exitosos: number; fallidos: number; total: number }>;

  // --- Muestras ---
  listarMuestras(): Promise<Muestra[]>;
  ingresarLote(codigos: string[]): Promise<ResultadoIngreso>;

  // --- Carga de resultados del HeliFan ---
  cargarResultadosTxt(contenidoTxt: string): Promise<ResultadoCargaTxt>;

  // --- Validación bioquímica (scope 2.7) ---
  // Aprobar: en_validacion → completado
  validarMuestra(protocolo: string): Promise<Muestra>;
  // Reiniciar: borra los resultados de una muestra con error para
  // poder recargar otro TXT (solo si tiene error y no está anulada).
  reiniciarMuestra(protocolo: string): Promise<Muestra>;

  // --- Etiquetas: marca como 'en_proceso' al imprimir (scope 2.4) ---
  imprimirEtiquetas(protocolo: string): Promise<Muestra>;

  // --- Resumen del día ---
  obtenerHistorial(): Promise<ResumenDiario[]>;
  obtenerResumenFecha(fecha: string): Promise<ResumenDiario | null>;

  // --- Informes PDF (placeholder, se implementa en próxima iteración) ---
  obtenerInformePdf(protocolo: string): Promise<Blob>;
}

// Error tipado para que los componentes puedan distinguir casos.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'NETWORK'
      | 'VALIDATION'
      | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
