import { useEffect, useState } from 'react';
import { api } from '../services';
import type { BaconMuestra } from '../types';
import { etiquetaTipoEstudioMayus, tipoDesdeCodigo } from '../utils/estudios';

interface Props {
  // Set de TauKits ya ingresados al sistema, para marcar cuáles
  // de las muestras de BACON ya fueron procesadas.
  codigosIngresados: Set<string>;
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

export function ControlPrevio({ codigosIngresados }: Props) {
  const [muestrasBacon, setMuestrasBacon] = useState<BaconMuestra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);
  const [sortBy, setSortBy] = useState<'none' | 'paciente' | 'tipo' | 'serie'>('none');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

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

  // Resetear paginación cuando cambian los datos o el orden
  useEffect(() => {
    setPagina(1);
  }, [muestrasBacon.length, sortBy, sortDir]);

  const totalEnviadas = muestrasBacon.length;
  const yaIngresadas = muestrasBacon.filter((m) =>
    codigosIngresados.has(m.numero_serie),
  ).length;
  const pendientes = totalEnviadas - yaIngresadas;

  function tipoDesdeNumero(num: string) {
    return etiquetaTipoEstudioMayus(tipoDesdeCodigo(num));
  }

  const ordenadas = [...muestrasBacon].sort((a,b) => {
    if (sortBy === 'paciente') {
      const aName = (a.paciente.nombre ?? '');
      const bName = (b.paciente.nombre ?? '');
      return sortDir === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
    }
    if (sortBy === 'tipo') {
      const aTipo = tipoDesdeNumero(a.numero_serie);
      const bTipo = tipoDesdeNumero(b.numero_serie);
      return sortDir === 'asc' ? aTipo.localeCompare(bTipo) : bTipo.localeCompare(aTipo);
    }
    if (sortBy === 'serie') {
      const aSerie = a.numero_serie ?? '';
      const bSerie = b.numero_serie ?? '';
      return sortDir === 'asc'
        ? aSerie.localeCompare(bSerie, undefined, { numeric: true })
        : bSerie.localeCompare(aSerie, undefined, { numeric: true });
    }
    return 0;
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const mostradas = ordenadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

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
                  <th
                    onClick={() => {
                      if (sortBy === 'tipo') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('tipo');
                        setSortDir('asc');
                      }
                    }}
                    className="cursor-pointer text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-2"
                  >
                    Tipo de Muestra
                    <span className={`ml-1 ${sortBy === 'tipo' ? 'text-slate-700' : 'text-slate-300'}`}>
                      {sortBy === 'tipo' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th
                    onClick={() => {
                      if (sortBy === 'serie') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('serie');
                        setSortDir('asc');
                      }
                    }}
                    className="cursor-pointer text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2"
                  >
                    Nro de serie
                    <span className={`ml-1 ${sortBy === 'serie' ? 'text-slate-700' : 'text-slate-300'}`}>
                      {sortBy === 'serie' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th
                    onClick={() => {
                      if (sortBy === 'paciente') {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('paciente');
                        setSortDir('asc');
                      }
                    }}
                    className="cursor-pointer text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2"
                  >
                    Paciente
                    <span className={`ml-1 ${sortBy === 'paciente' ? 'text-slate-700' : 'text-slate-300'}`}>
                      {sortBy === 'paciente' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">DNI</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">Clínica</th>
                  <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {mostradas.map((m) => {
                  const ingresada = codigosIngresados.has(m.numero_serie);
                  return (
                    <tr
                      key={m.numero_serie}
                      className={`border-b border-slate-100 ${ingresada ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="px-5 py-2 text-xs font-mono font-medium text-slate-900">
                        {tipoDesdeNumero(m.numero_serie)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 font-mono">
                        {m.numero_serie ?? '—'}
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
          <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
            <div className="text-xs text-slate-600">Mostrando {mostradas.length} de {ordenadas.length}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina(Math.max(1, pagina - 1))}
                disabled={pagina === 1}
                className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 disabled:opacity-40"
              >
                ‹ Anterior
              </button>
              <div className="text-xs text-slate-700">{pagina} / {totalPaginas}</div>
              <button
                onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
                disabled={pagina === totalPaginas}
                className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 disabled:opacity-40"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
