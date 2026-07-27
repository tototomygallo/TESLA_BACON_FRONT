import { useEffect, useMemo, useState } from 'react';
import { EstadoBadge, ErrorBadge } from '../components/EstadoBadge';
import { ValidacionModal } from '../components/ValidacionModal';
import { generarEtiquetasMuestra } from '../services/etiquetas';
import { api, ApiError } from '../services';
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
  { id: 'pendiente_anulacion', label: 'Pend. de anulación' },
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
    'Reinicios',
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
    reiniciosUsados(m),
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

function reiniciosUsados(muestra: Muestra): string {
  if (muestra.tipoEstudio !== 'taukit') return '';
  return `${Math.min(muestra.intentosFallidos, 2)} de 2`;
}

function ReiniciosBadge({ muestra }: { muestra: Muestra }) {
  if (muestra.tipoEstudio !== 'taukit') {
    return <span className="text-xs text-slate-300">-</span>;
  }

  const usadas = Math.min(muestra.intentosFallidos, 2);
  const clases =
    usadas >= 2
      ? 'border-red-200 bg-red-50 text-red-700'
      : usadas === 1
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-500';

  return (
    <span
      title="Cuenta reinicios manuales y errores del equipo"
      className={`inline-flex min-w-[64px] justify-center rounded-md border px-2 py-1 text-xs font-semibold ${clases}`}
    >
      {usadas}/2
    </span>
  );
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
  const [pendientesAnulacion, setPendientesAnulacion] = useState<Muestra[]>([]);
  const [pendientesAnulacionResueltas, setPendientesAnulacionResueltas] =
    useState<string[]>([]);
  const [cargandoPendientesAnulacion, setCargandoPendientesAnulacion] =
    useState(false);
  const [seleccionPendientes, setSeleccionPendientes] = useState<string[]>([]);
  const [confirmarAnulacionAbierta, setConfirmarAnulacionAbierta] =
    useState(false);
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);
  const [muestraReversion, setMuestraReversion] = useState<Muestra | null>(null);
  const [motivoReversion, setMotivoReversion] = useState(
    'Error en la carga de resultados',
  );
  const [detalleReversion, setDetalleReversion] = useState('');
  const [procesandoReversion, setProcesandoReversion] = useState(false);

  // El PDF se trae con fetch autenticado (manda el Bearer y maneja el refresh).
  // No se puede abrir por URL directa: la navegación del browser no lleva el
  // token y el back responde 401. Bajamos el blob y disparamos la descarga.
  const descargarPdf = async (protocolo: string) => {
    setErrorAccion(null);
    try {
      const blob = await api.obtenerInformePdf(protocolo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe-${protocolo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setErrorAccion(
        e instanceof ApiError ? e.message : 'No se pudo descargar el PDF',
      );
    }
  };

  const filtradas = useMemo(() => {
    return muestras.filter((m) => {
      // Las muestras dadas de baja desde Operación no se listan acá.
      if (m.estado === 'eliminado') return false;
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
      if (m.estado === 'eliminado') return false;
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
  const protocolosPendientesSeleccionados = useMemo(
    () =>
      seleccionPendientes.filter((protocolo) =>
        pendientesAnulacion.some((m) => m.protocolo === protocolo),
      ),
    [seleccionPendientes, pendientesAnulacion],
  );
  const muestraPendienteSeleccionada = useMemo(
    () =>
      pendientesAnulacion.find(
        (m) => m.protocolo === protocolosPendientesSeleccionados[0],
      ) ?? null,
    [pendientesAnulacion, protocolosPendientesSeleccionados],
  );
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

  useEffect(() => {
    if (!puedeValidar) {
      setPendientesAnulacion([]);
      setSeleccionPendientes([]);
      return;
    }

    let cancelado = false;
    async function cargarPendientes() {
      setCargandoPendientesAnulacion(true);
      try {
        const pendientes = await api.listarPendientesAnulacion();
        if (cancelado) return;
        setPendientesAnulacion(
          pendientes.filter(
            (m) => !pendientesAnulacionResueltas.includes(m.protocolo),
          ),
        );
        setSeleccionPendientes((actual) =>
          actual.filter((protocolo) =>
            pendientes.some((m) => m.protocolo === protocolo) &&
            !pendientesAnulacionResueltas.includes(protocolo),
          ),
        );
      } catch (e) {
        if (!cancelado) {
          setErrorAccion(
            e instanceof Error
              ? `No se pudieron cargar los Taukits pendientes de anulación: ${e.message}`
              : 'No se pudieron cargar los Taukits pendientes de anulación.',
          );
        }
      } finally {
        if (!cancelado) setCargandoPendientesAnulacion(false);
      }
    }

    void cargarPendientes();
    return () => {
      cancelado = true;
    };
  }, [puedeValidar, muestras, pendientesAnulacionResueltas]);

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

  const recargarPendientesAnulacion = async (protocolosResueltos: string[] = []) => {
    const pendientes = await api.listarPendientesAnulacion();
    const resueltos = new Set([
      ...pendientesAnulacionResueltas,
      ...protocolosResueltos,
    ]);
    setPendientesAnulacion(
      pendientes.filter((m) => !resueltos.has(m.protocolo)),
    );
    setSeleccionPendientes((actual) =>
      actual.filter((protocolo) =>
        pendientes.some((m) => m.protocolo === protocolo) &&
        !resueltos.has(protocolo),
      ),
    );
  };

  const togglePendienteSeleccionada = (protocolo: string) => {
    setSeleccionPendientes((actual) =>
      actual.includes(protocolo)
        ? actual.filter((p) => p !== protocolo)
        : [...actual, protocolo],
    );
  };

  const confirmarAnulacionSeleccionada = async () => {
    if (protocolosPendientesSeleccionados.length === 0) return;
    setProcesandoAnulacion(true);
    setErrorAccion(null);
    setMensajeAccion(null);
    setAdvertenciaAccion(null);
    try {
      for (const protocolo of protocolosPendientesSeleccionados) {
        await api.confirmarAnulacion(protocolo, usuario.username);
      }
      setConfirmarAnulacionAbierta(false);
      setMensajeAccion(
        protocolosPendientesSeleccionados.length === 1
          ? 'TauKit anulado e informado a BACON.'
          : `${protocolosPendientesSeleccionados.length} Taukits anulados e informados a BACON.`,
      );
      setSeleccionPendientes([]);
      await recargarPendientesAnulacion();
      onMuestraActualizada();
    } catch (e) {
      setErrorAccion(
        e instanceof Error
          ? `No se pudo confirmar la anulación: ${e.message}`
          : 'No se pudo confirmar la anulación.',
      );
      await recargarPendientesAnulacion().catch(() => undefined);
      onMuestraActualizada();
    } finally {
      setProcesandoAnulacion(false);
    }
  };

  const abrirReversionSeleccionada = () => {
    if (protocolosPendientesSeleccionados.length !== 1 || !muestraPendienteSeleccionada) {
      return;
    }
    setMotivoReversion('Error en la carga de resultados');
    setDetalleReversion('');
    setMuestraReversion(muestraPendienteSeleccionada);
  };

  const confirmarMalAnulado = async () => {
    if (!muestraReversion) return;
    const detalle = detalleReversion.trim();
    const motivo = motivoReversion as 'Error en la carga de resultados' | 'Otro';
    if (motivo === 'Otro' && !detalle) {
      setErrorAccion('Indicá el detalle cuando el motivo es Otro.');
      return;
    }

    setProcesandoReversion(true);
    setErrorAccion(null);
    setMensajeAccion(null);
    setAdvertenciaAccion(null);
    try {
      await api.marcarMalAnulado(
        muestraReversion.protocolo,
        {
          motivo,
          detalle: motivo === 'Otro' ? detalle : null,
          usuarioId: usuario.username,
        },
      );
      setMensajeAccion(
        'TauKit marcado como mal anulado. Quedó disponible para revisión administrativa en Operación.',
      );
      const protocoloResuelto = muestraReversion.protocolo;
      setPendientesAnulacionResueltas((actual) =>
        actual.includes(protocoloResuelto)
          ? actual
          : [...actual, protocoloResuelto],
      );
      setPendientesAnulacion((actual) =>
        actual.filter((m) => m.protocolo !== protocoloResuelto),
      );
      setMuestraReversion(null);
      setSeleccionPendientes([]);
      await recargarPendientesAnulacion([protocoloResuelto]);
      onMuestraActualizada();
    } catch (e) {
      setErrorAccion(
        e instanceof Error
          ? `No se pudo marcar como mal anulado: ${e.message}`
          : 'No se pudo marcar como mal anulado.',
      );
      await recargarPendientesAnulacion().catch(() => undefined);
      onMuestraActualizada();
    } finally {
      setProcesandoReversion(false);
    }
  };

  return (
    <div className="space-y-4">
      {puedeValidar && pendientesAnulacion.length > 0 && (
        <PendientesAnulacionPanel
          muestras={pendientesAnulacion}
          seleccionadas={protocolosPendientesSeleccionados}
          cargando={cargandoPendientesAnulacion}
          onToggle={togglePendienteSeleccionada}
          onConfirmar={() => setConfirmarAnulacionAbierta(true)}
          onRevertir={abrirReversionSeleccionada}
        />
      )}

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
              <th className="text-center text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                Reinicios
              </th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
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
                            onClick={() => descargarPdf(m.protocolo)}
                            className="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                          >
                            Ver PDF
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ReiniciosBadge muestra={m} />
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

      {/* Modal de validación del bioquímico */}
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

      {confirmarAnulacionAbierta && (
        <ConfirmarAnulacionModal
          cantidad={protocolosPendientesSeleccionados.length}
          procesando={procesandoAnulacion}
          onCancelar={() => setConfirmarAnulacionAbierta(false)}
          onConfirmar={confirmarAnulacionSeleccionada}
        />
      )}

      {muestraReversion && (
        <RevertirAnulacionModal
          muestra={muestraReversion}
          motivo={motivoReversion}
          detalle={detalleReversion}
          procesando={procesandoReversion}
          onMotivoChange={setMotivoReversion}
          onDetalleChange={setDetalleReversion}
          onCancelar={() => setMuestraReversion(null)}
          onConfirmar={confirmarMalAnulado}
        />
      )}
    </div>
  );
}

function PendientesAnulacionPanel({
  muestras,
  seleccionadas,
  cargando,
  onToggle,
  onConfirmar,
  onRevertir,
}: {
  muestras: Muestra[];
  seleccionadas: string[];
  cargando: boolean;
  onToggle: (protocolo: string) => void;
  onConfirmar: () => void;
  onRevertir: () => void;
}) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-red-700">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <h3 className="text-sm font-bold text-red-700">
              Taukits pendientes de anulación
            </h3>
          </div>
          <p className="mt-1 max-w-3xl text-xs text-red-700">
            Estos Taukits llegaron al límite de Reinicios 2/2 y necesitan una
            confirmación antes de ser anulados e informados a BACON.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={seleccionadas.length === 0 || cargando}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Confirmar anulación y enviar a BACON
          </button>
          <button
            type="button"
            onClick={onRevertir}
            disabled={seleccionadas.length !== 1 || cargando}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          >
            Marcar como mal anulado
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-red-100 bg-white">
        <table className="w-full">
          <thead className="bg-red-50">
            <tr>
              <th className="w-10 px-3 py-2 text-left" aria-label="Seleccionar" />
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                N° serie
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Protocolo
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Paciente
              </th>
              <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Reinicios
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Motivo
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {muestras.map((m) => (
              <tr key={m.protocolo} className="border-t border-red-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(m.protocolo)}
                    onChange={() => onToggle(m.protocolo)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    aria-label={`Seleccionar ${m.protocolo}`}
                  />
                </td>
                <td className="px-3 py-2 text-sm font-mono text-slate-700">
                  {codigoMuestra(m)}
                </td>
                <td className="px-3 py-2 text-sm font-mono font-semibold text-slate-900">
                  {m.protocolo}
                </td>
                <td className="px-3 py-2">
                  <div className="text-sm font-medium text-slate-900">
                    {m.paciente.apellido}, {m.paciente.nombre}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    DNI {m.paciente.dni}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <ReiniciosBadge muestra={m} />
                </td>
                <td className="px-3 py-2 text-sm text-slate-700">
                  {motivoPendienteAnulacion(m)}
                </td>
                <td className="px-3 py-2">
                  <EstadoBadge estado={m.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function motivoPendienteAnulacion(muestra: Muestra): string {
  if (muestra.tieneError) return 'Error del equipo + reinicio';
  return 'Reinicios 2/2';
}

function ConfirmarAnulacionModal({
  cantidad,
  procesando,
  onCancelar,
  onConfirmar,
}: {
  cantidad: number;
  procesando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h3 className="mt-5 text-lg font-bold text-slate-900">
          Confirmar anulación y envío a BACON
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Se enviará a BACON el informe de anulación de {cantidad}{' '}
          TauKit{cantidad !== 1 ? 's' : ''} seleccionado
          {cantidad !== 1 ? 's' : ''}. Esta acción no se puede deshacer.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          ¿Deseás continuar?
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando || cantidad === 0}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {procesando ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RevertirAnulacionModal({
  muestra,
  motivo,
  detalle,
  procesando,
  onMotivoChange,
  onDetalleChange,
  onCancelar,
  onConfirmar,
}: {
  muestra: Muestra;
  motivo: string;
  detalle: string;
  procesando: boolean;
  onMotivoChange: (motivo: string) => void;
  onDetalleChange: (detalle: string) => void;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Marcar Taukit como mal anulado
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Indicá el motivo por el cual este Taukit no debe ser anulado. El
              caso quedará disponible para revisión administrativa en Operación.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{muestra.protocolo}</span>{' '}
          · {codigoMuestra(muestra)}
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Motivo <span className="text-red-600">*</span>
          <select
            value={motivo}
            onChange={(e) => onMotivoChange(e.target.value)}
            disabled={procesando}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
          >
            <option>Error en la carga de resultados</option>
            <option>Otro</option>
          </select>
        </label>

        {motivo === 'Otro' && (
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Detalle <span className="text-red-600">*</span>
            <textarea
              value={detalle}
              onChange={(e) => onDetalleChange(e.target.value)}
              disabled={procesando}
              placeholder="Escribí el motivo..."
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
            />
          </label>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando || !motivo.trim() || (motivo === 'Otro' && !detalle.trim())}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {procesando ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
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
