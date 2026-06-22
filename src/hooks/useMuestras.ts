import { useCallback, useEffect, useState } from 'react';
import { api } from '../services';
import type { Muestra, ResultadoIngreso } from '../types';

// Hook que encapsula el estado y operaciones sobre muestras.
// Los componentes solo se preocupan por usar los datos, no por
// cómo se obtienen.
export function useMuestras() {
  const [muestras, setMuestras] = useState<Muestra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await api.listarMuestras();
      setMuestras(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar muestras');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const ingresarLote = useCallback(
    async (codigos: string[], usuarioId: string): Promise<ResultadoIngreso> => {
      const resultado = await api.ingresarLote(codigos, usuarioId);
      // Refrescar lista después de un ingreso
      await recargar();
      return resultado;
    },
    [recargar],
  );

  return { muestras, cargando, error, recargar, ingresarLote };
}
