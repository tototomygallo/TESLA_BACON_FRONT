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

type UsuarioBackend = Partial<Usuario> & {
  user?: string;
  username?: string;
  usuario?: string;
  userId?: string;
  name?: string;
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

async function requestFormData<T>(
  path: string,
  formData: FormData,
  usuarioId: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
      body: formData,
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
    throw new ApiError(detail, response.status === 422 ? 'VALIDATION' : 'UNKNOWN');
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

function normalizarUsuario(usuario: UsuarioBackend): Usuario {
  const id = String(
    usuario.id ??
      usuario.userId ??
      usuario.username ??
      usuario.usuario ??
      usuario.user ??
      '',
  );
  const username = String(
    usuario.username ??
      usuario.usuario ??
      usuario.user ??
      usuario.userId ??
      usuario.id ??
      id,
  );

  return {
    id,
    username,
    nombre: String(usuario.nombre ?? usuario.name ?? username),
    rol: (usuario.rol ?? 'tecnico') as Usuario['rol'],
    passwordExpired: usuario.passwordExpired,
  };
}

export const httpApi: ApiClient = {
  async login(userId: string, password: string): Promise<Usuario> {
    const usuario = await request<UsuarioBackend>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: userId, password }),
    });
    return normalizarUsuario(usuario);
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

  async ingresarLote(codigos: string[], usuarioId: string): Promise<ResultadoIngreso> {
    return request<ResultadoIngreso>('/muestras/ingresar-lote', {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
      body: JSON.stringify({ codigos }),
    });
  },

  async cargarResultadosTxt(
    contenidoTxt: string,
    usuarioId: string,
  ): Promise<ResultadoCargaTxt> {
    // Se envía como text/plain para que el back haga el parseo
    // (o como JSON {contenido: ...} si así lo prefiere el back).
    return request<ResultadoCargaTxt>('/muestras/cargar-txt', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-User-Id': usuarioId },
      body: contenidoTxt,
    });
  },

  async validarMuestra(
    protocolo: string,
    usuarioId: string,
  ): Promise<ValidacionMuestraResponse> {
    return request<ValidacionMuestraResponse>(`/muestras/${protocolo}/validar`, {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
    });
  },

  async reiniciarMuestra(protocolo: string, usuarioId: string): Promise<Muestra> {
    return request<Muestra>(`/muestras/${protocolo}/reiniciar`, {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
    });
  },

  async imprimirEtiquetas(protocolo: string, usuarioId: string): Promise<Muestra> {
    return request<Muestra>(`/muestras/${protocolo}/imprimir-etiquetas`, {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
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
    const response = await fetch(`${BASE_URL}/muestras/${encodeURIComponent(protocolo)}/pdf`);
    if (!response.ok) {
      throw new ApiError('No se pudo generar el PDF', 'UNKNOWN');
    }
    return response.blob();
  },

  async guardarResultadosLactokit(
    protocolo: string,
    datos: { h2: Array<number | null>; ch4: Array<number | null>; co2: Array<number | null>; confirmar?: boolean },
    usuarioId: string,
  ): Promise<Muestra> {
    return request<Muestra>(`/muestras/${encodeURIComponent(protocolo)}/resultados-lactokit`, {
      method: 'POST',
      headers: { 'X-User-Id': usuarioId },
      body: JSON.stringify(datos),
    });
  },

  async eliminarSerieAdmin(
    numeroSerie: string,
    motivo: string,
    usuarioId: string,
  ): Promise<void> {
    await request<unknown>(`/admin/series/${encodeURIComponent(numeroSerie)}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': usuarioId },
      body: JSON.stringify({ motivo }),
    });
  },

  async corregirPacienteAdmin(
    numeroSerie: string,
    datos: { nombre?: string; apellido?: string; dni?: string; motivo: string },
    usuarioId: string,
  ): Promise<Muestra> {
    return request<Muestra>(
      `/admin/series/${encodeURIComponent(numeroSerie)}/paciente`,
      {
        method: 'PATCH',
        headers: { 'X-User-Id': usuarioId },
        body: JSON.stringify(datos),
      },
    );
  },

  async listarProtocolosEditadosAdmin(
    usuarioId: string,
  ): Promise<ProtocoloEditado[]> {
    return request<ProtocoloEditado[]>('/admin/protocolos-editados', {
      headers: { 'X-User-Id': usuarioId },
    });
  },

  async enviarMailBacon(
    datos: { asunto: string; mensaje: string; archivos: File[] },
    usuarioId: string,
  ): Promise<void> {
    const formData = new FormData();
    formData.append('asunto', datos.asunto);
    formData.append('mensaje', datos.mensaje);
    datos.archivos.forEach((archivo) => {
      formData.append('archivos', archivo);
    });
    await requestFormData<unknown>('/admin/contacto-bacon', formData, usuarioId);
  },
};
