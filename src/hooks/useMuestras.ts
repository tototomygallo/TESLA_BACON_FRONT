import { useCallback, useEffect, useState } from 'react';
import { api } from '../services';
import type { Muestra, ResultadoIngreso } from '../types';

// Hook que encapsula el estado y operaciones sobre muestras.
// Los componentes solo se preocupan por usar los datos, no por
// cómo se obtienen.
// `habilitado` evita pedir datos antes de tener sesión (token). Si no, la
// primera carga saldría sin Authorization y el back respondería 401.
export function useMuestras(habilitado: boolean) {
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
    if (!habilitado) return;
    recargar();
  }, [habilitado, recargar]);

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
