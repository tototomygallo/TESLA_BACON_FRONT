import { httpApi } from './httpApi';
import { mockApi } from './mockApi';
import type { ApiClient } from './apiClient';

// ============================================
// Selector de implementación
// ============================================
// Controlado por la variable de entorno VITE_API_MODE.
// - 'mock' (default): datos simulados en memoria
// - 'real':            backend Python vía HTTP
//
// Toda la app importa `api` desde acá. Cambiar entre mock y real
// no requiere tocar componentes, solo el .env.

const mode = import.meta.env.VITE_API_MODE ?? 'mock';

export const api: ApiClient = mode === 'real' ? httpApi : mockApi;

// Re-export para conveniencia
export { ApiError } from './apiClient';
export type { ApiClient } from './apiClient';
