import { useCallback, useEffect, useState } from 'react';
import { api } from '../services';
import type { ResumenDiario } from '../types';

export function useHistorial() {
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
    recargar();
  }, [recargar]);

  return { historial, cargando, error, recargar };
}
