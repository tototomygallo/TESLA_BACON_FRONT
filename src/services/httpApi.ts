import type {
  BaconMuestra,
  Muestra,
  ResultadoCargaTxt,
  ResultadoIngreso,
  ResumenDiario,
  Usuario,
} from '../types';
import { ApiError, type ApiClient } from './apiClient';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> ?? {}),
      },
    });
  } catch {
    throw new ApiError('No se pudo conectar al servidor', 'NETWORK');
  }

  if (!response.ok) {
    if (response.status === 401)
      throw new ApiError('Usuario o contraseña incorrectos', 'UNAUTHORIZED');
    if (response.status === 404)
      throw new ApiError('Recurso no encontrado', 'NOT_FOUND');
    if (response.status === 422)
      throw new ApiError('Datos inválidos', 'VALIDATION');
    throw new ApiError(`Error ${response.status}`, 'UNKNOWN');
  }

  return response.json() as Promise<T>;
}

export const httpApi: ApiClient = {
  async login(userId: string, password: string): Promise<Usuario> {
    return request<Usuario>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
  },

  // El back hace proxy a BACON:
  // GET /api/bacon/muestras-enviadas
  //   → internamente llama a BACON con el token
  //   → devuelve el JSON tal cual
  async obtenerMuestrasEnviadasBacon(): Promise<BaconMuestra[]> {
    return request<BaconMuestra[]>('/bacon/muestras-enviadas');
  },

  async listarMuestras(): Promise<Muestra[]> {
    return request<Muestra[]>('/muestras');
  },

  async ingresarLote(codigos: string[]): Promise<ResultadoIngreso> {
    return request<ResultadoIngreso>('/muestras/ingresar-lote', {
      method: 'POST',
      body: JSON.stringify({ codigos }),
    });
  },

  async cargarResultadosTxt(contenidoTxt: string): Promise<ResultadoCargaTxt> {
    // Se envía como text/plain para que el back haga el parseo
    // (o como JSON {contenido: ...} si así lo prefiere el back).
    return request<ResultadoCargaTxt>('/muestras/cargar-txt', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: contenidoTxt,
    });
  },

  async validarMuestra(protocolo: string): Promise<Muestra> {
    return request<Muestra>(`/muestras/${protocolo}/validar`, {
      method: 'POST',
    });
  },

  async reiniciarMuestra(protocolo: string): Promise<Muestra> {
    return request<Muestra>(`/muestras/${protocolo}/reiniciar`, {
      method: 'POST',
    });
  },

  async imprimirEtiquetas(protocolo: string): Promise<Muestra> {
    return request<Muestra>(`/muestras/${protocolo}/imprimir-etiquetas`, {
      method: 'POST',
    });
  },

  async obtenerHistorial(): Promise<ResumenDiario[]> {
    return request<ResumenDiario[]>('/resumen/historial');
  },

  async obtenerResumenFecha(fecha: string): Promise<ResumenDiario | null> {
    try {
      return await request<ResumenDiario>(`/resumen/${fecha}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_FOUND') return null;
      throw err;
    }
  },

  async obtenerInformePdf(protocolo: string): Promise<Blob> {
    const response = await fetch(`${BASE_URL}/informes/${protocolo}/pdf`);
    if (!response.ok) {
      throw new ApiError('No se pudo generar el PDF', 'UNKNOWN');
    }
    return response.blob();
  },
};
