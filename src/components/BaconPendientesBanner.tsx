import { useCallback, useEffect, useState } from 'react';
import { api } from '../services';

// ============================================
// Banner de pendientes BACON
// ============================================
// Muestra un aviso cuando hay muestras que no pudimos notificar
// a BACON como recibidas. Incluye botón para reintentar manualmente.
// Se actualiza cada 60 segundos y después de cada reintento.

export function BaconPendientesBanner() {
  const [cantidad, setCantidad] = useState(0);
  const [codigos, setCodigos] = useState<string[]>([]);
  const [reintentando, setReintentando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    try {
      const data = await api.obtenerBaconPendientes();
      setCantidad(data.cantidad);
      setCodigos(data.codigos);
    } catch {
      // Si falla la consulta, no mostramos nada (no bloquear la UI)
    }
  }, []);

  useEffect(() => {
    consultar();
    const interval = setInterval(consultar, 60_000); // cada 60 segundos
    return () => clearInterval(interval);
  }, [consultar]);

  const reintentar = async () => {
    setReintentando(true);
    setUltimoResultado(null);
    try {
      const resultado = await api.reintentarBaconPendientes();
      setUltimoResultado(
        `${resultado.exitosos} notificados OK, ${resultado.fallidos} fallidos`,
      );
      await consultar(); // Refrescar la cantidad
    } catch {
      setUltimoResultado('Error al reintentar');
    } finally {
      setReintentando(false);
    }
  };

  if (cantidad === 0) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="text-sm text-amber-900">
            <span className="font-semibold">{cantidad}</span> muestra
            {cantidad !== 1 ? 's' : ''} sin confirmar en BACON
            <span className="text-xs text-amber-700 ml-2">
              ({codigos.slice(0, 5).join(', ')}
              {codigos.length > 5 ? ` y ${codigos.length - 5} más` : ''})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ultimoResultado && (
            <span className="text-xs text-amber-700">{ultimoResultado}</span>
          )}
          <button
            onClick={reintentar}
            disabled={reintentando}
            className="text-xs px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium"
          >
            {reintentando ? 'Reintentando…' : 'Reintentar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
}
