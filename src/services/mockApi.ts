import type {
  BaconMuestra,
  Muestra,
  ProtocoloEditado,
  ResultadoCargaTxt,
  ResultadoIngreso,
  ResumenDiario,
  Usuario,
  UsuarioConfiguracion,
  ValidacionMuestraResponse,
} from '../types';
import { ApiError, type ApiClient } from './apiClient';
import {
  BACON_DB,
  MUESTRAS_INICIALES,
  USUARIOS_MOCK,
  construirMuestra,
  generarHistorialMock,
} from '../mocks/data';
import { parsearTxt } from './txtParser';

let _muestras: Muestra[] = [...MUESTRAS_INICIALES];
let _historial: ResumenDiario[] = generarHistorialMock();
// Último TXT procesado: sirve para detectar recargas idénticas (txtDuplicado).
let _ultimoTxt: string | null = null;
let _protocolosEditados: ProtocoloEditado[] = [];
let _usuariosConfig: UsuarioConfiguracion[] = [
  { id: 'tec1', usuario: 'tec1', email: 'tec1@diagnosticotesla.com', nombre: 'Técnico 1', rol: 'tecnico', activo: true },
  { id: 'bio1', usuario: 'bio1', email: 'bio1@diagnosticotesla.com', nombre: 'Bioquímico 1', rol: 'bioquimico', activo: true },
  { id: 'adm1', usuario: 'adm1', email: 'adm1@diagnosticotesla.com', nombre: 'Admin 1', rol: 'admin', activo: true },
];

const delay = <T>(value: T, ms = 50): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

function fechaHoyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fechaHoraLocal(): string {
  const d = new Date();
  const fecha = fechaHoyLocal();
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');
  return `${fecha} ${horas}:${minutos}`;
}

// Mock de la respuesta de BACON: simula lo que devuelve
// GET /api/getSerialNumbers?estado=logistica
// Basado en los datos reales del endpoint demo de BaconTrack.
const BACON_ENVIADAS_MOCK: BaconMuestra[] = Object.entries(BACON_DB).map(
  ([tauKit, datos]) => ({
    REM: 'REM00001-00000001-1',
    numero_serie: tauKit,
    ctm: 'CLINICA DEMO',
    medico: null,
    estado: 'Logística',
    fecha_carga: '13/05/2026 08:00am',
    paciente: {
      nombre: `${datos.paciente.apellido} ${datos.paciente.nombre}`,
      codigo: null,
      documento: datos.paciente.dni,
    },
  }),
);

export const mockApi: ApiClient = {
  async login(userId: string, _password: string): Promise<Usuario> {
    const usuario = USUARIOS_MOCK[userId.trim().toLowerCase()];
    if (!usuario) throw new ApiError('Usuario no encontrado', 'NOT_FOUND');
    return delay(usuario);
  },

  async cambiarPasswordActual(): Promise<void> {
    return delay(undefined);
  },

  async listarUsuariosConfiguracion(usuarioId: string): Promise<UsuarioConfiguracion[]> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') {
      throw new ApiError('No autorizado', 'FORBIDDEN');
    }
    return delay([..._usuariosConfig]);
  },

  async crearUsuarioConfiguracion(
    usuarioId: string,
    nuevo: Pick<
      UsuarioConfiguracion,
      'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    > & { password: string },
  ): Promise<UsuarioConfiguracion> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') {
      throw new ApiError('No autorizado', 'FORBIDDEN');
    }
    if (!nuevo.password.trim()) {
      throw new ApiError('La contraseÃ±a es requerida', 'VALIDATION');
    }

    const creado: UsuarioConfiguracion = {
      id: crypto.randomUUID(),
      usuario: nuevo.usuario,
      email: nuevo.email,
      nombre: nuevo.nombre,
      rol: nuevo.rol,
      activo: nuevo.activo,
    };
    _usuariosConfig = [..._usuariosConfig, creado];
    return delay(creado);
  },

  async actualizarUsuarioConfiguracion(
    usuarioId: string,
    cambios: Pick<
      UsuarioConfiguracion,
      'id' | 'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    >,
  ): Promise<UsuarioConfiguracion> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') {
      throw new ApiError('No autorizado', 'FORBIDDEN');
    }

    const existente = _usuariosConfig.find((u) => u.id === cambios.id);
    if (!existente) {
      throw new ApiError('Usuario no encontrado', 'NOT_FOUND');
    }

    const actualizado: UsuarioConfiguracion = {
      ...existente,
      usuario: cambios.usuario,
      email: cambios.email,
      nombre: cambios.nombre,
      rol: cambios.rol,
      activo: cambios.activo,
    };
    _usuariosConfig = _usuariosConfig.map((u) =>
      u.id === cambios.id ? actualizado : u,
    );
    return delay(actualizado);
  },

  async resetPasswordUsuarioConfiguracion(
    usuarioId: string,
    usuarioEditadoId: string,
    passwordNueva: string,
  ): Promise<void> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') {
      throw new ApiError('No autorizado', 'FORBIDDEN');
    }
    if (!_usuariosConfig.some((u) => u.id === usuarioEditadoId)) {
      throw new ApiError('Usuario no encontrado', 'NOT_FOUND');
    }
    if (!passwordNueva.trim()) {
      throw new ApiError('La nueva contraseÃ±a es requerida', 'VALIDATION');
    }
    return delay(undefined);
  },

  async eliminarUsuarioConfiguracion(
    usuarioId: string,
    usuarioEditadoId: string,
  ): Promise<void> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') {
      throw new ApiError('No autorizado', 'FORBIDDEN');
    }
    if (!_usuariosConfig.some((u) => u.id === usuarioEditadoId)) {
      throw new ApiError('Usuario no encontrado', 'NOT_FOUND');
    }
    _usuariosConfig = _usuariosConfig.filter((u) => u.id !== usuarioEditadoId);
    return delay(undefined);
  },

  // ============================================
  // BACON: control previo (scope 2.2)
  // ============================================
  async obtenerMuestrasEnviadasBacon(): Promise<BaconMuestra[]> {
    return delay([...BACON_ENVIADAS_MOCK], 200);
  },

  async listarMuestras(): Promise<Muestra[]> {
    return delay([..._muestras]);
  },

  async ingresarLote(codigos: string[], _usuarioId: string): Promise<ResultadoIngreso> {
    const ingresadas: Muestra[] = [];
    const rechazadas: string[] = [];
    const duplicadas: string[] = [];
    const tauKitsExistentes = new Set(_muestras.map((m) => m.codigoTauKit));

    for (const c of codigos) {
      const codigo = c.trim().toUpperCase();
      if (tauKitsExistentes.has(codigo)) { duplicadas.push(codigo); continue; }
      if (!BACON_DB[codigo]) { rechazadas.push(codigo); continue; }
      const nueva = construirMuestra(codigo, 'recibido');
      if (nueva) {
        _muestras = [..._muestras, nueva];
        ingresadas.push(nueva);
        tauKitsExistentes.add(codigo);
      }
    }

    if (rechazadas.length > 0) {
      const ahora = fechaHoraLocal();
      const fechaHoy = fechaHoyLocal();
      const nuevasDiscrepancias = rechazadas.map((c) => ({
        codigo: c,
        fecha: ahora,
        motivo: 'No figura como enviado en BACON',
      }));
      const existeResumenHoy = _historial.some((h) => h.fecha === fechaHoy);
      _historial = existeResumenHoy
        ? _historial.map((h) =>
            h.fecha === fechaHoy
              ? {
                  ...h,
                  discrepancias: h.discrepancias + rechazadas.length,
                  rechazados: [...h.rechazados, ...nuevasDiscrepancias],
                }
              : h,
          )
        : [
            ..._historial,
            {
              fecha: fechaHoy,
              ingresadas: 0,
              procesadas: 0,
              finalizadas: 0,
              pendientes: 0,
              discrepancias: rechazadas.length,
              rechazados: nuevasDiscrepancias,
            },
          ];
    }

    return delay({ ingresadas, rechazadas, duplicadas });
  },

  // ============================================
  // Carga de resultados del HeliFan (scope 2.6)
  // ============================================
  // Reglas:
  // - Match exacto TestID del TXT ↔ protocolo interno.
  // - Si está 'completado': ignorar (no se pisa).
  // - Si NO tiene resultados aún ('recibido' o recién reiniciada):
  //     cargar resultados y pasar a 'en_validacion'.
  // - Si YA tiene resultados ('en_validacion' o con error): NO se pisa;
  //   se reporta en requierenReinicio. Para volver a cargarla hay que
  //   apretar "Reiniciar muestra" primero (eso limpia los resultados).
  // - Si el TXT trae error del equipo (postDelta = -10000):
  //     incrementar intentosFallidos, marcar tieneError, no cambiar estado.
  // - TestIDs sin match: reportar como noEncontrados.
  async cargarResultadosTxt(
    contenidoTxt: string,
    _usuarioId: string,
  ): Promise<ResultadoCargaTxt> {
    // Si el TXT es idéntico al último subido, no se procesa nada (txtDuplicado).
    if (_ultimoTxt !== null && contenidoTxt === _ultimoTxt) {
      return delay({
        txtDuplicado: true,
        cargadosOk: [],
        cargadosReintentando: [],
        conErrorEquipo: [],
        anuladas: [],
        noEncontrados: [],
        yaCompletados: [],
        yaAnuladas: [],
        requierenReinicio: [],
        controles: 0,
        erroresParseo: 0,
      });
    }

    const parseado = parsearTxt(contenidoTxt);
    const ahora = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const cargadosOk: string[] = [];
    const cargadosReintentando: string[] = [];
    const conErrorEquipo: string[] = [];
    const anuladas: string[] = [];
    const noEncontrados: string[] = [];
    const yaCompletados: string[] = [];
    const yaAnuladas: string[] = [];
    const requierenReinicio: string[] = [];

    const indice = new Map(_muestras.map((m) => [m.protocolo, m] as const));
    const cambios = new Map<string, Muestra>();

    for (const r of parseado.resultados) {
      const muestra = indice.get(r.testId);
      if (!muestra) { noEncontrados.push(r.testId); continue; }
      if (muestra.estado === 'completado') {
        yaCompletados.push(muestra.protocolo);
        continue;
      }
      // Una muestra anulada ya agotó el TauKit: no se le cargan resultados.
      if (muestra.estado === 'anulado') {
        yaAnuladas.push(muestra.protocolo);
        continue;
      }
      // Una muestra que YA tiene resultados cargados no se puede recargar por
      // TXT: hay que apretar "Reiniciar muestra" primero (el reinicio limpia
      // los resultados). Cubre tanto 'en_validacion' como 'con error'. Así se
      // garantiza una sola carga por reinicio y no se pisan datos existentes.
      if (muestra.resultados) {
        requierenReinicio.push(muestra.protocolo);
        continue;
      }
      const resultadoCargado = {
        basalCO2: r.basalCO2,
        postCO2: r.postCO2,
        basalDelta: r.basalDelta,
        postDelta: r.postDelta,
        testValue: r.testValue,
        cargadoEn: ahora,
      };

      if (r.tieneErrorEquipo) {
        const nuevosIntentos = muestra.intentosFallidos + 1;
        // Si llega a 2 intentos fallidos, el TauKit queda anulado:
        // agotó sus 2 mediciones y hay que usar otro TauKit.
        const quedaAnulada = nuevosIntentos >= 2;
        cambios.set(muestra.protocolo, {
          ...muestra,
          tieneError: true,
          intentosFallidos: nuevosIntentos,
          estado: quedaAnulada ? 'anulado' : muestra.estado,
          resultados: resultadoCargado,
        });
        if (quedaAnulada) anuladas.push(muestra.protocolo);
        else conErrorEquipo.push(muestra.protocolo);
      } else {
        cambios.set(muestra.protocolo, {
          ...muestra,
          estado: 'en_validacion',
          tieneError: false,
          resultados: resultadoCargado,
        });
        // Si ya gastó algún intento, esta carga viene de una muestra reiniciada
        // (reintento); si no, es la primera carga.
        if (muestra.intentosFallidos > 0) cargadosReintentando.push(muestra.protocolo);
        else cargadosOk.push(muestra.protocolo);
      }
    }

    _muestras = _muestras.map((m) => cambios.get(m.protocolo) ?? m);
    _ultimoTxt = contenidoTxt;

    return delay({
      cargadosOk,
      cargadosReintentando,
      conErrorEquipo,
      anuladas,
      noEncontrados,
      yaCompletados,
      yaAnuladas,
      requierenReinicio,
      controles: parseado.controles,
      erroresParseo: parseado.errores.length,
    });
  },

  // ============================================
  // Validación bioquímica (scope 2.7)
  // ============================================

  // Aprobar una muestra: en_validacion → completado.
  // No se puede validar una muestra bloqueada (intentosFallidos >= 2)
  // ni una que no esté en estado en_validacion.
  async validarMuestra(
    protocolo: string,
    _usuarioId: string,
  ): Promise<ValidacionMuestraResponse> {
    const muestra = _muestras.find((m) => m.protocolo === protocolo);
    if (!muestra) {
      throw new ApiError('Muestra no encontrada', 'NOT_FOUND');
    }
    if (muestra.estado !== 'en_validacion') {
      throw new ApiError(
        'Solo se pueden validar muestras en estado "En validación"',
        'VALIDATION',
      );
    }
    if (muestra.intentosFallidos >= 2) {
      throw new ApiError(
        'No es posible generar el informe requerido con esta muestra',
        'VALIDATION',
      );
    }
    const actualizada: Muestra = {
      ...muestra,
      estado: 'completado',
      tieneError: false,
    };
    _muestras = _muestras.map((m) =>
      m.protocolo === protocolo ? actualizada : m,
    );
    return delay({
      ...actualizada,
      pdfGenerado: true,
      pdfVerificado: true,
      pdfVerificacion: {
        success: true,
        nombre_esperado: `${muestra.codigoTauKit}.pdf`,
        archivo: {
          nombre: `${muestra.codigoTauKit}.pdf`,
          fecha_subida: fechaHoraLocal(),
          tamaño: '224.13 KB',
          url: `/storage/resultados/${muestra.codigoTauKit}.pdf`,
        },
      },
    });
  },

  // Reiniciar una muestra: consume un intento del TauKit.
  // Cada TauKit tiene 2 tubos = 2 oportunidades.
  // Si al reiniciar ya usó ambas oportunidades → se anula.
  async reiniciarMuestra(protocolo: string, _usuarioId: string): Promise<ValidacionMuestraResponse> {
    const muestra = _muestras.find((m) => m.protocolo === protocolo);
    if (!muestra) {
      throw new ApiError('Muestra no encontrada', 'NOT_FOUND');
    }
    if (muestra.estado === 'anulado') {
      throw new ApiError(
        'La muestra está anulada: el TauKit agotó sus 2 mediciones',
        'VALIDATION',
      );
    }
    if (muestra.estado === 'completado') {
      throw new ApiError(
        'No se puede reiniciar una muestra ya completada',
        'VALIDATION',
      );
    }
    if (muestra.estado === 'recibido') {
      throw new ApiError(
        'La muestra todavía no fue procesada',
        'VALIDATION',
      );
    }

    const nuevosIntentos = muestra.intentosFallidos + 1;

    // Si ya gastó las 2 oportunidades del TauKit → anular
    if (nuevosIntentos >= 2) {
      const anulada: Muestra = {
        ...muestra,
        estado: 'anulado',
        tieneError: true,
        intentosFallidos: nuevosIntentos,
        // Conserva los resultados para que se puedan consultar
      };
      _muestras = _muestras.map((m) =>
        m.protocolo === protocolo ? anulada : m,
      );
      // El informe de anulación se sube/verifica en BACON (mock: OK directo).
      return delay({ ...anulada, pdfGenerado: true, pdfVerificado: true });
    }

    // Todavía tiene 1 oportunidad más: reiniciar
    const actualizada: Muestra = {
      ...muestra,
      estado: 'en_proceso',
      tieneError: false,
      intentosFallidos: nuevosIntentos,
      resultados: null,
    };
    _muestras = _muestras.map((m) =>
      m.protocolo === protocolo ? actualizada : m,
    );
    return delay(actualizada);
  },

  // ============================================
  // Etiquetas: recibido → en_proceso (scope 2.4)
  // ============================================
  async imprimirEtiquetas(protocolo: string, _usuarioId: string): Promise<Muestra> {
    const muestra = _muestras.find((m) => m.protocolo === protocolo);
    if (!muestra) {
      throw new ApiError('Muestra no encontrada', 'NOT_FOUND');
    }
    if (muestra.estado !== 'recibido') {
      // Si ya pasó de recibido, no cambiamos el estado, solo devolvemos
      return delay(muestra);
    }
    const actualizada: Muestra = {
      ...muestra,
      estado: 'en_proceso',
    };
    _muestras = _muestras.map((m) =>
      m.protocolo === protocolo ? actualizada : m,
    );
    return delay(actualizada);
  },

  async guardarResultadosLactokit(
    protocolo: string,
    datos: { h2: Array<number | null>; ch4: Array<number | null>; co2: Array<number | null>; confirmar?: boolean },
    _usuarioId: string,
  ): Promise<Muestra> {
    const idx = _muestras.findIndex((m) => m.protocolo === protocolo);
    if (idx === -1) throw new ApiError('Muestra no encontrada', 'NOT_FOUND');
    const muestra = _muestras[idx];
    const ahora = fechaHoraLocal();
    const resultados = {
      h2: datos.h2,
      ch4: datos.ch4,
      co2: datos.co2,
      valoracion: '1' as const,
      descripcion: 'Resultado mock',
      cargadoEn: ahora,
    };
    const actualizado: Muestra = {
      ...muestra,
      resultadosLactokit: resultados,
      estado: datos.confirmar ? 'en_validacion' : muestra.estado,
    };
    _muestras = _muestras.map((m, i) => (i === idx ? actualizado : m));
    return delay(actualizado, 100);
  },

  async eliminarSerieAdmin(
    numeroSerie: string,
    _motivo: string,
    usuarioId: string,
  ): Promise<void> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') throw new ApiError('No autorizado', 'FORBIDDEN');
    _muestras = _muestras.filter(
      (m) => m.codigoTauKit !== numeroSerie && m.codigoLactokit !== numeroSerie,
    );
    return delay(undefined);
  },

  async corregirPacienteAdmin(
    numeroSerie: string,
    datos: { nombre?: string; apellido?: string; dni?: string; motivo: string },
    usuarioId: string,
  ): Promise<Muestra> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') throw new ApiError('No autorizado', 'FORBIDDEN');
    const muestra = _muestras.find(
      (m) => m.codigoTauKit === numeroSerie || m.codigoLactokit === numeroSerie,
    );
    if (!muestra) throw new ApiError('Muestra no encontrada', 'NOT_FOUND');
    const actualizada: Muestra = {
      ...muestra,
      paciente: {
        ...muestra.paciente,
        nombre: datos.nombre ?? muestra.paciente.nombre,
        apellido: datos.apellido ?? muestra.paciente.apellido,
        dni: datos.dni ?? muestra.paciente.dni,
      },
    };
    const camposEditados = [
      datos.nombre !== undefined ? 'nombre' : null,
      datos.apellido !== undefined ? 'apellido' : null,
      datos.dni !== undefined ? 'dni' : null,
    ].filter((campo): campo is string => Boolean(campo));
    _protocolosEditados = [
      {
        protocolo: muestra.protocolo,
        numeroSerie: numeroSerie,
        tipoEstudio: muestra.tipoEstudio,
        fechaIngreso: muestra.fechaIngreso,
        fechaEdicion: fechaHoraLocal(),
        motivo: datos.motivo,
        usuario: usuarioId,
        camposEditados,
      },
      ..._protocolosEditados,
    ];
    _muestras = _muestras.map((m) =>
      m.protocolo === muestra.protocolo ? actualizada : m,
    );
    return delay(actualizada);
  },

  async listarProtocolosEditadosAdmin(
    usuarioId: string,
  ): Promise<ProtocoloEditado[]> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') throw new ApiError('No autorizado', 'FORBIDDEN');
    return delay([..._protocolosEditados]);
  },

  async enviarMailBacon(
    _datos: { asunto: string; mensaje: string; archivos: File[] },
    usuarioId: string,
  ): Promise<void> {
    const usuario = USUARIOS_MOCK[usuarioId.trim().toLowerCase()];
    if (usuario?.rol !== 'admin') throw new ApiError('No autorizado', 'FORBIDDEN');
    return delay(undefined);
  },

  async obtenerHistorial(): Promise<ResumenDiario[]> {
    return delay([..._historial]);
  },

  async obtenerResumenFecha(fecha: string): Promise<ResumenDiario | null> {
    const encontrado = _historial.find((h) => h.fecha === fecha) ?? null;
    return delay(encontrado);
  },

  async obtenerInformePdf(_protocolo: string): Promise<Blob> {
    throw new ApiError(
      'La generación de PDF se integra en la próxima iteración',
      'UNKNOWN',
    );
  },
};
