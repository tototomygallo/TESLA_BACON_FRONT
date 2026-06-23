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
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './authToken';

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

// Respuesta del nuevo /auth/login (el usuario viene anidado y trae los tokens).
type LoginResponse = {
  usuario: UsuarioBackend;
  token: string;
  tokenType?: string;
  expiresIn?: number;
  refreshToken: string;
  refreshExpiresIn?: number;
};

type RefreshResponse = {
  token: string;
  refreshToken: string;
};

// ============================================
// Núcleo de auth: Bearer + refresh + logout
// ============================================

// Avisa a la app que la sesión se cayó (token vencido/ inválido y el refresh
// también falló). App.tsx escucha este evento y hace el logout.
function emitirLogout(mensaje: string): void {
  clearTokens();
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { mensaje } }));
}

// Un único refresh en vuelo: si varias requests reciben 401 a la vez,
// comparten el mismo intento de refresh.
let refreshEnCurso: Promise<boolean> | null = null;

async function intentarRefresh(): Promise<boolean> {
  if (refreshEnCurso) return refreshEnCurso;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshEnCurso = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as RefreshResponse;
      if (!data.token || !data.refreshToken) return false;
      setTokens(data.token, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshEnCurso;
  } finally {
    refreshEnCurso = null;
  }
}

// fetch con Authorization: Bearer. Ante un 401 intenta refrescar una vez y
// reintenta la request original; si el refresh falla, dispara el logout.
async function fetchConAuth(
  path: string,
  options: RequestInit,
  reintento = false,
): Promise<Response> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('No se pudo conectar al servidor', 'NETWORK');
  }

  if (response.status === 401 && !reintento && getRefreshToken()) {
    const refrescado = await intentarRefresh();
    if (refrescado) {
      return fetchConAuth(path, options, true);
    }
    emitirLogout('Tu sesión expiró. Iniciá sesión de nuevo.');
  }

  return response;
}

function mapearError(status: number, detail: string): ApiError {
  if (status === 401) return new ApiError(detail, 'UNAUTHORIZED');
  if (status === 403) return new ApiError(detail, 'FORBIDDEN');
  if (status === 404) return new ApiError(detail, 'NOT_FOUND');
  if (status === 422) return new ApiError(detail, 'VALIDATION');
  return new ApiError(detail, 'UNKNOWN');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetchConAuth(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `Error ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    throw mapearError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function requestFormData<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  // Sin Content-Type: el browser arma el multipart/form-data con su boundary.
  const response = await fetchConAuth(path, { method: 'POST', body: formData });

  if (!response.ok) {
    let detail = `Error ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {}
    throw mapearError(response.status, detail);
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
    // Empezamos limpio para no arrastrar tokens de una sesión anterior.
    clearTokens();
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: userId, password }),
    });
    if (data.token && data.refreshToken) {
      setTokens(data.token, data.refreshToken);
    }
    return normalizarUsuario(data.usuario);
  },

  async cambiarPasswordActual(
    _usuarioId: string,
    actual: string,
    nueva: string,
  ): Promise<void> {
    // El back cambia la contraseña del usuario del token; userId se ignora.
    await request<unknown>('/auth/cambiar-password', {
      method: 'POST',
      body: JSON.stringify({
        passwordActual: actual,
        passwordNueva: nueva,
      }),
    });
  },

  async listarUsuariosConfiguracion(
    _usuarioId: string,
  ): Promise<UsuarioConfiguracion[]> {
    const usuarios = await request<UsuarioConfiguracionBackend[]>(
      '/configuracion/usuarios',
    );
    return usuarios.map(normalizarUsuarioConfiguracion);
  },

  async crearUsuarioConfiguracion(
    _usuarioId: string,
    usuario: Pick<
      UsuarioConfiguracion,
      'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    > & { password: string },
  ): Promise<UsuarioConfiguracion> {
    const creado = await request<UsuarioConfiguracionBackend>(
      '/configuracion/usuarios',
      {
        method: 'POST',
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
    _usuarioId: string,
    usuario: Pick<
      UsuarioConfiguracion,
      'id' | 'usuario' | 'email' | 'nombre' | 'rol' | 'activo'
    >,
  ): Promise<UsuarioConfiguracion> {
    const actualizado = await request<UsuarioConfiguracionBackend>(
      `/configuracion/usuarios/${encodeURIComponent(usuario.id)}`,
      {
        method: 'PATCH',
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
    _usuarioId: string,
    usuarioEditadoId: string,
    passwordNueva: string,
  ): Promise<void> {
    await request<unknown>(
      `/configuracion/usuarios/${encodeURIComponent(usuarioEditadoId)}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ passwordNueva }),
      },
    );
  },

  async eliminarUsuarioConfiguracion(
    _usuarioId: string,
    usuarioEditadoId: string,
  ): Promise<void> {
    await request<unknown>(
      `/configuracion/usuarios/${encodeURIComponent(usuarioEditadoId)}`,
      {
        method: 'DELETE',
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

  async ingresarLote(codigos: string[], _usuarioId: string): Promise<ResultadoIngreso> {
    return request<ResultadoIngreso>('/muestras/ingresar-lote', {
      method: 'POST',
      body: JSON.stringify({ codigos }),
    });
  },

  async cargarResultadosTxt(
    contenidoTxt: string,
    _usuarioId: string,
  ): Promise<ResultadoCargaTxt> {
    // Se envía como text/plain para que el back haga el parseo
    // (o como JSON {contenido: ...} si así lo prefiere el back).
    return request<ResultadoCargaTxt>('/muestras/cargar-txt', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: contenidoTxt,
    });
  },

  async validarMuestra(
    protocolo: string,
    _usuarioId: string,
  ): Promise<ValidacionMuestraResponse> {
    return request<ValidacionMuestraResponse>(`/muestras/${protocolo}/validar`, {
      method: 'POST',
    });
  },

  async reiniciarMuestra(protocolo: string, _usuarioId: string): Promise<Muestra> {
    return request<Muestra>(`/muestras/${protocolo}/reiniciar`, {
      method: 'POST',
    });
  },

  async imprimirEtiquetas(protocolo: string, _usuarioId: string): Promise<Muestra> {
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
    const response = await fetchConAuth(
      `/muestras/${encodeURIComponent(protocolo)}/pdf`,
      { method: 'GET' },
    );
    if (!response.ok) {
      throw mapearError(response.status, 'No se pudo generar el PDF');
    }
    return response.blob();
  },

  async guardarResultadosLactokit(
    protocolo: string,
    datos: { h2: Array<number | null>; ch4: Array<number | null>; co2: Array<number | null>; confirmar?: boolean },
    _usuarioId: string,
  ): Promise<Muestra> {
    return request<Muestra>(`/muestras/${encodeURIComponent(protocolo)}/resultados-lactokit`, {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  async eliminarSerieAdmin(
    numeroSerie: string,
    motivo: string,
    _usuarioId: string,
  ): Promise<void> {
    await request<unknown>(`/admin/series/${encodeURIComponent(numeroSerie)}`, {
      method: 'DELETE',
      body: JSON.stringify({ motivo }),
    });
  },

  async corregirPacienteAdmin(
    numeroSerie: string,
    datos: { nombre?: string; apellido?: string; dni?: string; motivo: string },
    _usuarioId: string,
  ): Promise<Muestra> {
    return request<Muestra>(
      `/admin/series/${encodeURIComponent(numeroSerie)}/paciente`,
      {
        method: 'PATCH',
        body: JSON.stringify(datos),
      },
    );
  },

  async listarProtocolosEditadosAdmin(
    _usuarioId: string,
  ): Promise<ProtocoloEditado[]> {
    return request<ProtocoloEditado[]>('/admin/protocolos-editados');
  },

  async enviarMailBacon(
    datos: { asunto: string; mensaje: string; archivos: File[] },
    _usuarioId: string,
  ): Promise<void> {
    const formData = new FormData();
    formData.append('asunto', datos.asunto);
    formData.append('mensaje', datos.mensaje);
    datos.archivos.forEach((archivo) => {
      formData.append('archivos', archivo);
    });
    await requestFormData<unknown>('/admin/contacto-bacon', formData);
  },
};
