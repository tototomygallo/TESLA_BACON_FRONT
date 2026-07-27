import type {
  AnuladoPendienteRevision,
  BaconMuestra,
  CompletadoCorreccion,
  Muestra,
  ProtocoloEditado,
  ResultadoCargaTxt,
  ResultadoIngreso,
  ResumenDiario,
  Usuario,
  UsuarioConfiguracion,
  ValidacionMuestraResponse,
} from '../types';

// ============================================
// Contrato de la API
// ============================================
// Cualquier implementación (mock o real) debe respetar esta interfaz.

export interface ApiClient {
  // --- Autenticación ---
  login(userId: string, password: string): Promise<Usuario>;
  cambiarPasswordActual(
    usuarioId: string,
    actual: string,
    nueva: string,
  ): Promise<void>;
  listarUsuariosConfiguracion(usuarioId: string): Promise<UsuarioConfiguracion[]>;
  crearUsuarioConfiguracion(
    usuarioId: string,
    usuario: Pick<
      UsuarioConfiguracion,
      'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    > & { password: string },
  ): Promise<UsuarioConfiguracion>;
  actualizarUsuarioConfiguracion(
    usuarioId: string,
    usuario: Pick<
      UsuarioConfiguracion,
      'id' | 'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    >,
  ): Promise<UsuarioConfiguracion>;
  resetPasswordUsuarioConfiguracion(
    usuarioId: string,
    usuarioEditadoId: string,
    passwordNueva: string,
  ): Promise<void>;
  eliminarUsuarioConfiguracion(
    usuarioId: string,
    usuarioEditadoId: string,
  ): Promise<void>;

  // --- BACON: control previo (scope 2.2) ---
  // Trae las muestras que BACON informó como enviadas (estado=logistica).
  // En producción: el back hace proxy a la API de BACON.
  obtenerMuestrasEnviadasBacon(): Promise<BaconMuestra[]>;

  // --- Muestras ---
  listarMuestras(): Promise<Muestra[]>;
  ingresarLote(codigos: string[], usuarioId: string): Promise<ResultadoIngreso>;

  // --- Carga de resultados del HeliFan ---
  cargarResultadosTxt(
    contenidoTxt: string,
    usuarioId: string,
  ): Promise<ResultadoCargaTxt>;

  // --- Validación del bioquímico (scope 2.7) ---
  // Aprobar: en_validacion → completado
  validarMuestra(protocolo: string, usuarioId: string): Promise<ValidacionMuestraResponse>;
  // Reiniciar: borra los resultados de una muestra con error para
  // poder recargar otro TXT (solo si tiene error y no está anulada).
  // Si este reinicio agota el contador, la muestra queda pendiente de anulación.
  // BACON se informa recién al confirmar la anulación desde Muestras.
  reiniciarMuestra(protocolo: string, usuarioId: string): Promise<ValidacionMuestraResponse>;
  listarPendientesAnulacion(): Promise<Muestra[]>;
  confirmarAnulacion(protocolo: string, usuarioId: string): Promise<ValidacionMuestraResponse>;
  marcarMalAnulado(
    protocolo: string,
    datos: { motivo: 'Error en la carga de resultados' | 'Otro'; detalle: string | null; usuarioId?: string },
  ): Promise<void>;
  revertirAnulacion(protocolo: string, motivo: string, usuarioId: string): Promise<Muestra>;

  // --- Etiquetas: marca como 'en_proceso' al imprimir (scope 2.4) ---
  imprimirEtiquetas(protocolo: string, usuarioId: string): Promise<Muestra>;

  // --- Resumen del día ---
  obtenerHistorial(): Promise<ResumenDiario[]>;
  obtenerResumenFecha(fecha: string): Promise<ResumenDiario | null>;

  // --- Informes PDF (placeholder, se implementa en próxima iteración) ---
  obtenerInformePdf(protocolo: string): Promise<Blob>;

  // --- Resultados Lactokit ---
  guardarResultadosLactokit(
    protocolo: string,
    datos: { h2: Array<number | null>; ch4: Array<number | null>; co2: Array<number | null>; confirmar?: boolean },
    usuarioId: string,
  ): Promise<Muestra>;

  // --- AdministraciÃ³n ---
  eliminarSerieAdmin(
    numeroSerie: string,
    motivo: string,
    usuarioId: string,
  ): Promise<void>;
  corregirPacienteAdmin(
    numeroSerie: string,
    datos: { nombre?: string; apellido?: string; dni?: string; motivo: string },
    usuarioId: string,
  ): Promise<Muestra>;
  listarProtocolosEditadosAdmin(usuarioId: string): Promise<ProtocoloEditado[]>;
  enviarMailBacon(
    datos: { asunto: string; mensaje: string; archivos: File[] },
    usuarioId: string,
  ): Promise<void>;
  listarAnuladosPendientesRevision(usuarioId: string): Promise<AnuladoPendienteRevision[]>;
  revertirAnuladoAEnProceso(protocolo: string, usuarioId: string): Promise<Muestra>;
  buscarCompletadosCorreccion(q: string, usuarioId: string): Promise<CompletadoCorreccion[]>;
  cargarValoresCompletadoCorreccion(
    protocolo: string,
    valores: {
      basalCO2: number;
      postCO2: number;
      basalDelta: number;
      postDelta: number;
      testValue: number;
      usuarioId: string;
    },
  ): Promise<CompletadoCorreccion>;
  generarInformeCompletadoCorreccion(
    protocolo: string,
    usuarioId: string,
  ): Promise<ValidacionMuestraResponse>;
}

// Error tipado para que los componentes puedan distinguir casos.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NETWORK'
      | 'VALIDATION'
      | 'UNKNOWN',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
