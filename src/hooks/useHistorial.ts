import { useCallback, useEffect, useState } from 'react';
import { api } from '../services';
import type { ResumenDiario } from '../types';

// `habilitado` evita pedir datos antes de tener sesión (token). Si no, la
// primera carga saldría sin Authorization y el back respondería 401.
export function useHistorial(habilitado: boolean) {
  const [historial, setHistorial] = useState<ResumenDiario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await api.obtenerHistorial();
      setHistorial(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar historial');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!habilitado) return;
    recargar();
  }, [habilitado, recargar]);

  return { historial, cargando, error, recargar };
}
