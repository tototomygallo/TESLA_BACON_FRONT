import { useEffect, useState } from 'react';
import { api } from '../services';
import type { BaconMuestra } from '../types';

interface Props {
  // Set de TauKits ya ingresados al sistema, para marcar cuáles
  // de las muestras de BACON ya fueron procesadas.
  tauKitsIngresados: Set<string>;
}

// ============================================
// Control Previo de Muestras (scope 2.2)
// ============================================
// Consulta a BACON (vía el back) para verificar qué muestras fueron
// enviadas. Muestra una tabla con el estado de cada una:
//   - "Enviada" → todavía no fue ingresada al sistema
//   - "Ingresada" → ya se escaneó y está en el sistema
//
// Si hay discrepancia entre lo enviado y lo recibido, el sistema
// lo indica visualmente.

export function ControlPrevio({ tauKitsIngresados }: Props) {
  const [muestrasBacon, setMuestrasBacon] = useState<BaconMuestra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await api.obtenerMuestrasEnviadasBacon();
      setMuestrasBacon(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar BACON');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const totalEnviadas = muestrasBacon.length;
  const yaIngresadas = muestrasBacon.filter((m) =>
    tauKitsIngresados.has(m.numero_serie),
  ).length;
  const pendientes = totalEnviadas - yaIngresadas;

  if (!abierto) {
    return (
      <button
        onClick={() => {
          setAbierto(true);
          cargar();
        }}
        className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-900">Control previo BACON</span>
            <span className="text-xs text-slate-500 ml-2">
              {totalEnviadas} enviadas · {pendientes} pendientes
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-400">Expandir ▾</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Control previo
            </div>
            <div className="text-xs text-slate-500">
              Muestras enviadas por BACON que aún no fueron ingresadas al sistema
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            disabled={cargando}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
          >
            {cargando ? 'Consultando…' : 'Actualizar'}
          </button>
          <button
            onClick={() => setAbierto(false)}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            ▴ Colapsar
          </button>
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-700 flex items-center justify-between">
          <span>No se pudo consultar BACON — podés seguir escaneando igual. El control previo se actualizará cuando BACON responda.</span>
          <button onClick={cargar} className="text-xs px-2 py-1 rounded border border-amber-300 hover:bg-amber-100 font-medium ml-3 flex-shrink-0">
            Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          Consultando muestras enviadas por BACON…
        </div>
      ) : muestrasBacon.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          BACON no reporta muestras enviadas en este momento.
        </div>
      ) : (
        <>
          {/* Tabla de muestras */}
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-2">TauKit</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Paciente</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">DNI</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Clínica</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {muestrasBacon.map((m) => {
                  const ingresada = tauKitsIngresados.has(m.numero_serie);
                  return (
                    <tr
                      key={m.numero_serie}
                      className={`border-b border-slate-100 ${ingresada ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="px-5 py-2 text-xs font-mono font-medium text-slate-900">
                        {m.numero_serie}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {m.paciente.nombre ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 font-mono">
                        {m.paciente.documento ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {m.ctm}
                      </td>
                      <td className="px-5 py-2 text-right">
                        {ingresada ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            Ingresada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                            <span className="w-1 h-1 rounded-full bg-amber-500" />
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
