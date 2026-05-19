import type {
  BaconMuestra,
  Muestra,
  ResultadoCargaTxt,
  ResultadoIngreso,
  ResumenDiario,
  Usuario,
} from '../types';
import { ApiError, type ApiClient } from './apiClient';
import {
  BACON_DB,
  HOY,
  MUESTRAS_INICIALES,
  USUARIOS_MOCK,
  construirMuestra,
  generarHistorialMock,
} from '../mocks/data';
import { parsearTxt } from './txtParser';

let _muestras: Muestra[] = [...MUESTRAS_INICIALES];
let _historial: ResumenDiario[] = generarHistorialMock();

const delay = <T>(value: T, ms = 50): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

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

  // ============================================
  // BACON: control previo (scope 2.2)
  // ============================================
  async obtenerMuestrasEnviadasBacon(): Promise<BaconMuestra[]> {
    return delay([...BACON_ENVIADAS_MOCK], 200);
  },

  async obtenerBaconPendientes(): Promise<{ cantidad: number; codigos: string[] }> {
    return delay({ cantidad: 0, codigos: [] });
  },

  async reintentarBaconPendientes(): Promise<{ exitosos: number; fallidos: number; total: number }> {
    return delay({ exitosos: 0, fallidos: 0, total: 0 });
  },

  async listarMuestras(): Promise<Muestra[]> {
    return delay([..._muestras]);
  },

  async ingresarLote(codigos: string[]): Promise<ResultadoIngreso> {
    const ingresadas: Muestra[] = [];
    const rechazadas: string[] = [];
    const duplicadas: string[] = [];
    const tauKitsExistentes = new Set(_muestras.map((m) => m.codigoTauKit));

    for (const c of codigos) {
      const codigo = c.trim().toUpperCase();
      if (tauKitsExistentes.has(codigo)) { duplicadas.push(codigo); continue; }
      if (!BACON_DB[codigo]) { rechazadas.push(codigo); continue; }
      const nueva = construirMuestra(codigo, 'en_proceso');
      if (nueva) {
        _muestras = [..._muestras, nueva];
        ingresadas.push(nueva);
        tauKitsExistentes.add(codigo);
      }
    }

    if (rechazadas.length > 0) {
      const ahora = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const nuevasDiscrepancias = rechazadas.map((c) => ({
        codigo: c,
        fecha: ahora,
        motivo: 'No figura como enviado en BACON',
      }));
      _historial = _historial.map((h) =>
        h.fecha === HOY
          ? {
              ...h,
              discrepancias: h.discrepancias + rechazadas.length,
              rechazados: [...h.rechazados, ...nuevasDiscrepancias],
            }
          : h,
      );
    }

    return delay({ ingresadas, rechazadas, duplicadas });
  },

  // ============================================
  // Carga de resultados del HeliFan (scope 2.6)
  // ============================================
  // Reglas:
  // - Match exacto TestID del TXT ↔ protocolo interno.
  // - Si está 'completado': ignorar (no se pisa).
  // - Si está 'recibido' o 'en_validacion' sin error:
  //     cargar resultados y pasar a 'en_validacion'.
  // - Si tieneError previo: pisar resultados (scope: "el sistema pisa
  //   solo los resultados con error previo").
  // - Si el TXT trae error del equipo (postDelta = -10000):
  //     incrementar intentosFallidos, marcar tieneError, no cambiar estado.
  // - TestIDs sin match: reportar como noEncontrados.
  async cargarResultadosTxt(contenidoTxt: string): Promise<ResultadoCargaTxt> {
    const parseado = parsearTxt(contenidoTxt);
    const ahora = new Date().toISOString().slice(0, 16).replace('T', ' ');

    const cargadosOk: string[] = [];
    const cargadosReintentando: string[] = [];
    const conErrorEquipo: string[] = [];
    const anuladas: string[] = [];
    const noEncontrados: string[] = [];
    const yaCompletados: string[] = [];
    const yaAnuladas: string[] = [];

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

      const tuvoErrorPrevio = muestra.tieneError;
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
        if (tuvoErrorPrevio) cargadosReintentando.push(muestra.protocolo);
        else cargadosOk.push(muestra.protocolo);
      }
    }

    _muestras = _muestras.map((m) => cambios.get(m.protocolo) ?? m);

    return delay({
      cargadosOk,
      cargadosReintentando,
      conErrorEquipo,
      anuladas,
      noEncontrados,
      yaCompletados,
      yaAnuladas,
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
  async validarMuestra(protocolo: string): Promise<Muestra> {
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
    return delay(actualizada);
  },

  // Reiniciar una muestra: consume un intento del TauKit.
  // Cada TauKit tiene 2 tubos = 2 oportunidades.
  // Si al reiniciar ya usó ambas oportunidades → se anula.
  async reiniciarMuestra(protocolo: string): Promise<Muestra> {
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
      return delay(anulada);
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
  async imprimirEtiquetas(protocolo: string): Promise<Muestra> {
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
