import { useEffect, useMemo, useState } from 'react';
import { EstadoBadge, ErrorBadge } from '../components/EstadoBadge';
import { ValidacionModal } from '../components/ValidacionModal';
import { generarEtiquetasMuestra } from '../services/etiquetas';
import { api } from '../services';
import type { Estado, Muestra, Usuario } from '../types';
import { codigoMuestra, etiquetaTipoEstudio, type FiltroEstudio } from '../utils/estudios';

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

function haceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function haceMeses(meses: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}

function exportarCsv(muestras: Muestra[]): void {
  const sep = ';';
  const headers = [
    'Protocolo',
    'Tipo de Muestra',
    'N° Serie',
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
    m.tipoEstudio.toUpperCase(),
    codigoMuestra(m),
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
  const [rangoFechaActivo, setRangoFechaActivo] = useState('Últimos 3 días');
  const [filtroEstudio, setFiltroEstudio] = useState<FiltroEstudio>('todos');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [mesesPersonalizados, setMesesPersonalizados] = useState(3);
  const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  // Aviso amarillo: la validación fue exitosa pero algo secundario falló
  // (p.ej. el informe quedó completo pero no se pudo enviar por mail).
  const [advertenciaAccion, setAdvertenciaAccion] = useState<string | null>(null);
  // Muestra cuyo modal de validación está abierto (null = cerrado)
  const [muestraEnValidacion, setMuestraEnValidacion] =
    useState<Muestra | null>(null);

  const filtradas = useMemo(() => {
    return muestras.filter((m) => {
      // Filtro por tipo de estudio
      const matchEstudio = filtroEstudio === 'todos' || m.tipoEstudio === filtroEstudio;
      if (!matchEstudio) return false;
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
        codigoMuestra(m).toLowerCase().includes(q) ||
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
  }, [muestras, filtroEstado, filtroEstudio, busqueda, fechaDesde, fechaHasta]);

  const puedeValidar =
    usuario.rol === 'bioquimico' || usuario.rol === 'admin';
  const resumenPeriodo = useMemo(() => {
    const q = busqueda.toLowerCase();
    const base = muestras.filter((m) => {
      const matchEstudio = filtroEstudio === 'todos' || m.tipoEstudio === filtroEstudio;
      const matchBusqueda =
        !q ||
        m.protocolo.toLowerCase().includes(q) ||
        codigoMuestra(m).toLowerCase().includes(q) ||
        m.paciente.nombre.toLowerCase().includes(q) ||
        m.paciente.apellido.toLowerCase().includes(q) ||
        m.paciente.dni.includes(q) ||
        m.estudio.nombre.toLowerCase().includes(q);
      const fechaIngreso = m.fechaIngreso.slice(0, 10);
      const matchFecha = fechaIngreso >= fechaDesde && fechaIngreso <= fechaHasta;

      return matchEstudio && matchBusqueda && matchFecha;
    });

    return {
      total: base.length,
      recibidas: base.filter((m) => m.estado === 'recibido').length,
      proceso: base.filter((m) => m.estado === 'en_proceso').length,
      validacion: base.filter((m) => m.estado === 'en_validacion').length,
      completadas: base.filter((m) => m.estado === 'completado').length,
      conError: base.filter((m) => m.tieneError).length,
    };
  }, [muestras, filtroEstudio, busqueda, fechaDesde, fechaHasta]);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const inicioPagina = (pagina - 1) * porPagina;
  const finPagina = inicioPagina + porPagina;
  const paginadas = filtradas.slice(inicioPagina, finPagina);
  const primeraVisible = filtradas.length === 0 ? 0 : inicioPagina + 1;
  const ultimaVisible = Math.min(finPagina, filtradas.length);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, fechaDesde, fechaHasta, filtroEstado, filtroEstudio, porPagina]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const aplicarRangoFecha = (dias: number) => {
    setFechaDesde(haceDias(dias));
    setFechaHasta(hoy());
    setRangoFechaActivo(
      dias === 3 ? 'Últimos 3 días' : dias === 7 ? 'Última semana' : 'Último mes',
    );
  };

  const aplicarRangoMeses = (meses: number) => {
    setFechaDesde(haceMeses(meses));
    setFechaHasta(hoy());
    setRangoFechaActivo(meses === 12 ? 'Último año' : `Últimos ${meses} meses`);
  };
  const claseBotonRango = (label: string) =>
    `text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
      rangoFechaActivo === label
        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
    }`;

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

      {errorAccion && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorAccion}
        </div>
      )}

      {mensajeAccion && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {mensajeAccion}
        </div>
      )}

      {advertenciaAccion && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span aria-hidden>⚠️</span>
            <span>{advertenciaAccion}</span>
          </div>
          <button
            onClick={() => setAdvertenciaAccion(null)}
            className="text-amber-500 hover:text-amber-700 leading-none"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por protocolo, muestra, paciente, DNI o estudio..."
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
              Tipo de estudio
            </label>
            <select
              value={filtroEstudio}
              onChange={(e) => setFiltroEstudio(e.target.value as FiltroEstudio)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="taukit">Taukit</option>
              <option value="lactokit">Lactokit</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setRangoFechaActivo('Personalizado');
              }}
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
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setRangoFechaActivo('Personalizado');
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => aplicarRangoFecha(3)}
            className={claseBotonRango('Últimos 3 días')}
          >
            Últimos 3 días
          </button>
          <button
            onClick={() => aplicarRangoFecha(7)}
            className={claseBotonRango('Última semana')}
          >
            Última semana
          </button>
          <button
            onClick={() => aplicarRangoFecha(30)}
            className={claseBotonRango('Último mes')}
          >
            Último mes
          </button>
          <button
            onClick={() => aplicarRangoMeses(12)}
            className={claseBotonRango('Último año')}
          >
            Último año
          </button>
          <div
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${
              rangoFechaActivo === `Últimos ${mesesPersonalizados} meses`
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-slate-300'
            }`}
          >
            <span className="text-xs font-semibold text-slate-500">Últimos</span>
            <input
              type="number"
              min={1}
              max={60}
              value={mesesPersonalizados}
              onChange={(e) => setMesesPersonalizados(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 border-0 p-0 text-center text-sm font-mono text-slate-900 focus:outline-none"
            />
            <span className="text-xs font-semibold text-slate-500">meses</span>
            <button
              type="button"
              onClick={() => aplicarRangoMeses(mesesPersonalizados)}
              className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Aplicar
            </button>
          </div>

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ResumenPeriodoCard label="Total" valor={resumenPeriodo.total} />
        <ResumenPeriodoCard label="Recibidas" valor={resumenPeriodo.recibidas} />
        <ResumenPeriodoCard label="En proceso" valor={resumenPeriodo.proceso} />
        <ResumenPeriodoCard label="En validacion" valor={resumenPeriodo.validacion} />
        <ResumenPeriodoCard label="Completadas" valor={resumenPeriodo.completadas} />
        <ResumenPeriodoCard label="Con error" valor={resumenPeriodo.conError} tono="error" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-900 bg-slate-950">
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Protocolo
              </th>
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Tipo de Muestra
              </th>
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                N° Serie
              </th>
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Paciente
              </th>
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Estudio
              </th>
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Estado
              </th>
              <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Δ ‰
              </th>
              <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Ingreso
              </th>
              <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-12 text-slate-400 text-sm"
                >
                  No se encontraron muestras con los filtros aplicados
                </td>
              </tr>
            ) : (
              paginadas.map((m) => {
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
                        {etiquetaTipoEstudio(m.tipoEstudio)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 font-mono">
                        {codigoMuestra(m)}
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
                        {(m.estado === 'recibido' || m.estado === 'en_proceso') && (
                          <button
                            onClick={async () => {
                              setErrorAccion(null);
                              setMensajeAccion(null);
                              try {
                                const actualizada = await api.imprimirEtiquetas(
                                  m.protocolo,
                                  usuario.username,
                                );
                                await generarEtiquetasMuestra(actualizada);
                                onMuestraActualizada();
                              } catch (e) {
                                setErrorAccion(
                                  e instanceof Error
                                    ? `No se pudo cambiar el estado en BACON: ${e.message}`
                                    : 'No se pudo cambiar el estado en BACON.',
                                );
                              }
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
                            onClick={() => {
                              setErrorAccion(null);
                              setMensajeAccion(null);
                              setMuestraEnValidacion(m);
                            }}
                            className="text-xs px-2.5 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
                          >
                            Validar
                          </button>
                        )}
                        {(m.estado === 'completado' || m.estado === 'anulado') && (
                          <button
                            onClick={() => {
                              const base = import.meta.env.VITE_API_BASE_URL ?? '/api';
                              window.open(`${base}/muestras/${encodeURIComponent(m.protocolo)}/pdf`, '_blank');
                            }}
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <div>
          Mostrando {primeraVisible} a {ultimaVisible} de {filtradas.length} muestra
          {filtradas.length !== 1 ? 's' : ''}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Por pagina
            <select
              value={porPagina}
              onChange={(e) => setPorPagina(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal normal-case text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          >
            Anterior
          </button>
          <span className="min-w-[92px] text-center text-xs font-semibold text-slate-500">
            Pagina {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          >
            Siguiente
          </button>
        </div>
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
          usuarioId={usuario.username}
          onCerrar={() => setMuestraEnValidacion(null)}
          onActualizada={onMuestraActualizada}
          onValidacionExitosa={(mensaje) => {
            setErrorAccion(null);
            setAdvertenciaAccion(null);
            setMensajeAccion(mensaje);
          }}
          onValidacionConAdvertencia={(mensaje) => {
            setErrorAccion(null);
            setMensajeAccion(null);
            setAdvertenciaAccion(mensaje);
          }}
        />
      )}
    </div>
  );
}

function ResumenPeriodoCard({
  label,
  valor,
  tono = 'normal',
}: {
  label: string;
  valor: number;
  tono?: 'normal' | 'error';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-extrabold tracking-tight ${
          tono === 'error' ? 'text-red-600' : 'text-emerald-600'
        }`}
      >
        {valor}
      </div>
    </div>
  );
}
