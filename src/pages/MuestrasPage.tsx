import { useMemo, useState } from 'react';
import { EstadoBadge, ErrorBadge } from '../components/EstadoBadge';
import { ValidacionModal } from '../components/ValidacionModal';
import { generarEtiquetasMuestra } from '../services/etiquetas';
import { generarInformePdf } from '../services/informe';
import { api } from '../services';
import type { Estado, Muestra, Usuario } from '../types';

// Fecha real de hoy (no la constante mock)
const hoy = () => new Date().toISOString().slice(0, 10);

interface Props {
  muestras: Muestra[];
  usuario: Usuario;
  onMuestraActualizada: () => void;
}

type FiltroEstado = Estado | 'todos' | 'con_error';

const filtros: Array<{ id: FiltroEstado; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'recibido', label: 'Recibidos' },
  { id: 'en_proceso', label: 'En proceso' },
  { id: 'en_validacion', label: 'En validación' },
  { id: 'completado', label: 'Completados' },
  { id: 'anulado', label: 'Anulados' },
  { id: 'con_error', label: 'Con error' },
];

// Default: últimos 3 días (scope 2.5)
function hace3Dias(): string {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().slice(0, 10);
}

function exportarCsv(muestras: Muestra[]): void {
  const sep = ';';
  const headers = [
    'Protocolo',
    'TauKit',
    'Apellido',
    'Nombre',
    'DNI',
    'Estudio',
    'Estado',
    'Error',
    'Intentos fallidos',
    'Δ ‰ (TestValue)',
    'Lectura basal',
    'Lectura post 30 min',
    'Fecha ingreso',
    'Fecha toma muestra',
  ];

  const filas = muestras.map((m) => [
    m.protocolo,
    m.codigoTauKit,
    m.paciente.apellido,
    m.paciente.nombre,
    m.paciente.dni,
    m.estudio.nombre,
    m.estado,
    m.tieneError ? 'Sí' : 'No',
    String(m.intentosFallidos),
    m.resultados ? String(m.resultados.testValue) : '',
    m.resultados ? String(m.resultados.basalDelta) : '',
    m.resultados ? String(m.resultados.postDelta) : '',
    m.fechaIngreso,
    m.paciente.fechaTomaMuestra,
  ]);

  const bom = '\uFEFF'; // BOM para que Excel reconozca UTF-8
  const csv =
    bom +
    headers.join(sep) +
    '\n' +
    filas.map((f) => f.join(sep)).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `muestras-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MuestrasPage({
  muestras,
  usuario,
  onMuestraActualizada,
}: Props) {
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState(hace3Dias);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  // Muestra cuyo modal de validación está abierto (null = cerrado)
  const [muestraEnValidacion, setMuestraEnValidacion] =
    useState<Muestra | null>(null);

  const filtradas = useMemo(() => {
    return muestras.filter((m) => {
      // Filtro por estado
      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'con_error' && m.tieneError) ||
        m.estado === filtroEstado;

      // Filtro por búsqueda de texto
      const q = busqueda.toLowerCase();
      const matchBusqueda =
        !q ||
        m.protocolo.toLowerCase().includes(q) ||
        m.codigoTauKit.toLowerCase().includes(q) ||
        m.paciente.nombre.toLowerCase().includes(q) ||
        m.paciente.apellido.toLowerCase().includes(q) ||
        m.paciente.dni.includes(q) ||
        m.estudio.nombre.toLowerCase().includes(q);

      // Filtro por rango de fechas (compara la parte YYYY-MM-DD del ingreso)
      const fechaIngreso = m.fechaIngreso.slice(0, 10);
      const matchFecha =
        fechaIngreso >= fechaDesde && fechaIngreso <= fechaHasta;

      return matchEstado && matchBusqueda && matchFecha;
    });
  }, [muestras, filtroEstado, busqueda, fechaDesde, fechaHasta]);

  const puedeValidar =
    usuario.rol === 'bioquimico' || usuario.rol === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Muestras
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtradas.length} de {muestras.length} muestras
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por protocolo, TauKit, paciente, DNI o estudio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {filtros.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroEstado(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filtroEstado === f.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde}
              max={hoy()}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              setFechaDesde(hace3Dias());
              setFechaHasta(hoy());
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Últimos 3 días
          </button>

          <div className="flex-1" />

          <button
            onClick={() => exportarCsv(filtradas)}
            disabled={filtradas.length === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Protocolo
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                TauKit
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Paciente
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Estudio
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Estado
              </th>
              <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Δ ‰
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Ingreso
              </th>
              <th className="text-right text-xs font-semibold text-slate-600 uppercase tracking-wider px-4 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-12 text-slate-400 text-sm"
                >
                  No se encontraron muestras con los filtros aplicados
                </td>
              </tr>
            ) : (
              filtradas.map((m) => {
                const bloqueada = m.intentosFallidos >= 2;
                return (
                  <tr
                    key={m.protocolo}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900 font-mono">
                        {m.protocolo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 font-mono">
                        {m.codigoTauKit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900 font-medium">
                        {m.paciente.apellido}, {m.paciente.nombre}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        DNI {m.paciente.dni}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        {m.estudio.nombre}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {m.estudio.codigo}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1.5">
                          <EstadoBadge estado={m.estado} />
                          {m.tieneError && m.estado !== 'recibido' && <ErrorBadge />}
                        </div>
                        {bloqueada && (
                          <div className="text-xs text-red-600 font-medium">
                            No es posible generar el informe requerido con esta
                            muestra.
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.resultados ? (
                        <span className="text-sm font-mono text-slate-900 font-medium">
                          {m.resultados.testValue.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm font-mono text-slate-300">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                      {m.fechaIngreso}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {m.estado === 'recibido' && (
                          <button
                            onClick={async () => {
                              await generarEtiquetasMuestra(m);
                              await api.imprimirEtiquetas(m.protocolo);
                              onMuestraActualizada();
                            }}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                          >
                            Etiquetas
                          </button>
                        )}
                        {m.estado === 'en_proceso' && m.tieneError && puedeValidar && (
                          <button
                            onClick={() => setMuestraEnValidacion(m)}
                            className="text-xs px-2.5 py-1 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors font-medium"
                          >
                            Ver error
                          </button>
                        )}
                        {m.estado === 'en_validacion' && puedeValidar && (
                          <button
                            onClick={() => setMuestraEnValidacion(m)}
                            className="text-xs px-2.5 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
                          >
                            Validar
                          </button>
                        )}
                        {m.estado === 'completado' && (
                          <button
                            onClick={() => generarInformePdf(m)}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                          >
                            Ver PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!puedeValidar && (
        <div className="text-xs text-slate-500 px-1">
          ℹ️ La acción <span className="font-medium">Validar</span> solo está
          disponible para bioquímicos y administradores.
        </div>
      )}

      {/* Modal de validación bioquímica */}
      {muestraEnValidacion && (
        <ValidacionModal
          muestra={muestraEnValidacion}
          onCerrar={() => setMuestraEnValidacion(null)}
          onActualizada={onMuestraActualizada}
        />
      )}
    </div>
  );
}
