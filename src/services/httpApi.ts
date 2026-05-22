import type {
  BaconMuestra,
  Muestra,
  ResultadoCargaTxt,
  ResultadoIngreso,
  ResumenDiario,
  Usuario,
  UsuarioConfiguracion,
} from '../types';
import { ApiError, type ApiClient } from './apiClient';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type UsuarioConfiguracionBackend = Partial<UsuarioConfiguracion> & {
  user?: string;
  username?: string;
  userId?: string;
  nombre_usuario?: string;
  mail?: string;
  name?: string;
  active?: boolean;
  estado?: string | boolean;
};

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
  let detail = `Error ${response.status}`;

  try {
    const data = await response.json();
    detail = data.detail || detail;
  } catch {}

  if (response.status === 401)
    throw new ApiError(detail, 'UNAUTHORIZED');

  if (response.status === 403)
    throw new ApiError(detail, 'FORBIDDEN');

  if (response.status === 404)
    throw new ApiError(detail, 'NOT_FOUND');

  if (response.status === 422)
    throw new ApiError(detail, 'VALIDATION');

  throw new ApiError(detail, 'UNKNOWN');
}

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function normalizarUsuarioConfiguracion(
  usuario: UsuarioConfiguracionBackend,
): UsuarioConfiguracion {
  const estadoTexto =
    typeof usuario.estado === 'string' ? usuario.estado.toLowerCase() : '';

  return {
    id: String(usuario.id ?? usuario.userId ?? usuario.usuario ?? usuario.username ?? ''),
    usuario: String(
      usuario.usuario ??
        usuario.username ??
        usuario.user ??
        usuario.nombre_usuario ??
        usuario.userId ??
        usuario.id ??
        '',
    ),
    email: String(usuario.email ?? usuario.mail ?? ''),
    nombre: usuario.nombre ?? usuario.name ?? '',
    rol: usuario.rol ?? 'tecnico',
    activo:
      typeof usuario.activo === 'boolean'
        ? usuario.activo
        : typeof usuario.active === 'boolean'
          ? usuario.active
        : typeof usuario.estado === 'boolean'
          ? usuario.estado
          : estadoTexto
            ? estadoTexto === 'activo' || estadoTexto === 'active'
            : true,
  };
}

export const httpApi: ApiClient = {
  async login(userId: string, password: string): Promise<Usuario> {
    return request<Usuario>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
  },

  async cambiarPasswordActual(
    usuarioId: string,
    actual: string,
    nueva: string,
  ): Promise<void> {
    await request<unknown>('/auth/cambiar-password', {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
      body: JSON.stringify({
        passwordActual: actual,
        passwordNueva: nueva,
      }),
    });
  },

  async listarUsuariosConfiguracion(
    usuarioId: string,
  ): Promise<UsuarioConfiguracion[]> {
    const usuarios = await request<UsuarioConfiguracionBackend[]>(
      '/configuracion/usuarios',
      {
        headers: { 'X-User-Id': usuarioId },
      },
    );
    return usuarios.map(normalizarUsuarioConfiguracion);
  },

  async crearUsuarioConfiguracion(
    usuarioId: string,
    usuario: Pick<
      UsuarioConfiguracion,
      'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    > & { password: string },
  ): Promise<UsuarioConfiguracion> {
    const creado = await request<UsuarioConfiguracionBackend>(
      '/configuracion/usuarios',
      {
        method: 'POST',
        headers: { 'X-User-Id': usuarioId },
        body: JSON.stringify({
          username: usuario.usuario,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          password: usuario.password,
          active: usuario.activo,
        }),
      },
    );
    return normalizarUsuarioConfiguracion(creado);
  },

  async actualizarUsuarioConfiguracion(
    usuarioId: string,
    usuario: Pick<
      UsuarioConfiguracion,
      'id' | 'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    >,
  ): Promise<UsuarioConfiguracion> {
    const actualizado = await request<UsuarioConfiguracionBackend>(
      `/configuracion/usuarios/${encodeURIComponent(usuario.id)}`,
      {
        method: 'PATCH',
        headers: { 'X-User-Id': usuarioId },
        body: JSON.stringify({
          username: usuario.usuario,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          active: usuario.activo,
        }),
      },
    );
    return normalizarUsuarioConfiguracion({ ...usuario, ...actualizado });
  },

  async resetPasswordUsuarioConfiguracion(
    usuarioId: string,
    usuarioEditadoId: string,
    passwordNueva: string,
  ): Promise<void> {
    await request<unknown>(
      `/configuracion/usuarios/${encodeURIComponent(usuarioEditadoId)}/reset-password`,
      {
        method: 'POST',
        headers: { 'X-User-Id': usuarioId },
        body: JSON.stringify({ passwordNueva }),
      },
    );
  },

  async eliminarUsuarioConfiguracion(
    usuarioId: string,
    usuarioEditadoId: string,
  ): Promise<void> {
    await request<unknown>(
      `/configuracion/usuarios/${encodeURIComponent(usuarioEditadoId)}`,
      {
        method: 'DELETE',
        headers: { 'X-User-Id': usuarioId },
      },
    );
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
