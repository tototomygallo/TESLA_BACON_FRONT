import { useMemo, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import type { Muestra, ResumenDiario } from '../types';

interface Props {
  historial: ResumenDiario[];
  muestras: Muestra[];
}

function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const date = new Date(`${fecha}T00:00:00`);
  return `${dias[date.getDay()]} ${parseInt(d)} de ${meses[parseInt(m) - 1]} ${y}`;
}

function fechaHoyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resumenDesdeMuestras(
  fecha: string,
  muestras: Muestra[],
  historial?: ResumenDiario,
): ResumenDiario {
  const muestrasFecha = muestras.filter((m) => m.fechaIngreso.startsWith(fecha));
  const ingresadas = muestrasFecha.length;
  const procesadas = muestrasFecha.filter(
    (m) =>
      m.estado === 'en_proceso' ||
      m.estado === 'en_validacion' ||
      m.estado === 'completado',
  ).length;
  const finalizadas = muestrasFecha.filter((m) => m.estado === 'completado').length;
  const pendientes = muestrasFecha.filter((m) => m.estado !== 'completado').length;

  if (ingresadas === 0 && historial) return historial;

  return {
    fecha,
    ingresadas,
    procesadas,
    finalizadas,
    pendientes,
    discrepancias: historial?.discrepancias ?? 0,
    rechazados: historial?.rechazados ?? [],
  };
}

export function DashboardPage({ historial, muestras }: Props) {
  const hoy = fechaHoyLocal();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  const resumenesDiarios = useMemo<ResumenDiario[]>(() => {
    const historialPorFecha = new Map(historial.map((h) => [h.fecha, h]));
    const fechas = new Set<string>([
      ...historial.map((h) => h.fecha),
      ...muestras.map((m) => m.fechaIngreso.slice(0, 10)),
      hoy,
    ]);

    return [...fechas].map((fecha) =>
      resumenDesdeMuestras(fecha, muestras, historialPorFecha.get(fecha)),
    );
  }, [historial, muestras, hoy]);

  const resumenHoy = useMemo<ResumenDiario>(() => {
    if (fechaSeleccionada === hoy) {
      // Cálculo en vivo desde las muestras actuales (3 estados oficiales).
      const muestrasHoy = muestras.filter((m) =>
        m.fechaIngreso.startsWith(hoy),
      );
      const ingresadas = muestrasHoy.length;
      // Procesadas = ya pasó del estado "Recibido" (carga de TXT completada).
      const procesadas = muestrasHoy.filter(
        (m) =>
          m.estado === 'en_proceso' ||
          m.estado === 'en_validacion' ||
          m.estado === 'completado',
      ).length;
      const finalizadas = muestrasHoy.filter(
        (m) => m.estado === 'completado',
      ).length;
      // Pendientes = todavía no completadas (sigue en pipeline).
      const pendientes = muestrasHoy.filter(
        (m) => m.estado !== 'completado',
      ).length;
      const historialHoy = historial.find((h) => h.fecha === hoy);
      const discrepancias = historialHoy?.discrepancias ?? 0;
      const rechazados = historialHoy?.rechazados ?? [];
      return {
        fecha: hoy,
        ingresadas,
        procesadas,
        finalizadas,
        pendientes,
        discrepancias,
        rechazados,
      };
    }
    return (
      resumenesDiarios.find((h) => h.fecha === fechaSeleccionada) ?? {
        fecha: fechaSeleccionada,
        ingresadas: 0,
        procesadas: 0,
        finalizadas: 0,
        pendientes: 0,
        discrepancias: 0,
        rechazados: [],
      }
    );
  }, [fechaSeleccionada, historial, muestras, hoy, resumenesDiarios]);

  const esHoy = fechaSeleccionada === hoy;

  const historialOrdenado = useMemo(() => {
    return [...resumenesDiarios]
      .filter(
        (h) => !busquedaHistorial || h.fecha.includes(busquedaHistorial),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [resumenesDiarios, busquedaHistorial]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Resumen del día
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">
            {formatearFecha(fechaSeleccionada)}{' '}
            {esHoy && (
              <span className="text-emerald-600 font-medium not-italic">
                · en vivo
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Ver fecha:
          </label>
          <input
            type="date"
            value={fechaSeleccionada}
            max={hoy}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {!esHoy && (
            <button
              onClick={() => setFechaSeleccionada(hoy)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Ingresadas"
          valor={resumenHoy.ingresadas}
          color="blue"
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <MetricCard
          label="Procesadas"
          valor={resumenHoy.procesadas}
          color="amber"
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6" />
            </svg>
          }
        />
        <MetricCard
          label="Finalizadas"
          valor={resumenHoy.finalizadas}
          color="emerald"
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />
        <MetricCard
          label="Pendientes"
          valor={resumenHoy.pendientes}
          color="slate"
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {resumenHoy.discrepancias > 0 ? (
        <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden">
          <div className="p-5 flex items-start gap-5">
            <div className="w-12 h-12 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">
                Discrepancias del día
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-slate-900 font-mono">
                  {resumenHoy.discrepancias}
                </span>
                <span className="text-sm text-slate-600">
                  código{resumenHoy.discrepancias !== 1 ? 's' : ''} rechazado
                  {resumenHoy.discrepancias !== 1 ? 's' : ''} por no figurar como enviado{resumenHoy.discrepancias !== 1 ? 's' : ''} en BACON
                </span>
              </div>
            </div>
          </div>

          {/* Detalle de cada código rechazado */}
          {resumenHoy.rechazados.length > 0 && (
            <div className="border-t border-red-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-red-50/50">
                    <th className="text-left text-[10px] font-semibold text-red-600 uppercase tracking-wider px-5 py-2">
                      Código ingresado
                    </th>
                    <th className="text-left text-[10px] font-semibold text-red-600 uppercase tracking-wider px-3 py-2">
                      Hora
                    </th>
                    <th className="text-left text-[10px] font-semibold text-red-600 uppercase tracking-wider px-5 py-2">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumenHoy.rechazados.map((d, i) => (
                    <tr key={`${d.codigo}-${i}`} className="border-t border-red-100">
                      <td className="px-5 py-2 text-sm font-mono font-semibold text-slate-900">
                        {d.codigo}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-500">
                        {d.fecha.includes(' ') ? d.fecha.split(' ')[1] : d.fecha}
                      </td>
                      <td className="px-5 py-2 text-xs text-slate-600">
                        {d.motivo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-sm text-emerald-900 font-medium">
            Sin discrepancias registradas en esta fecha.
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              Historial diario
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Últimos 14 días registrados
            </p>
          </div>
          <input
            type="text"
            placeholder="Filtrar por fecha (ej: 2026-05)"
            value={busquedaHistorial}
            onChange={(e) => setBusquedaHistorial(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950">
                <th className="text-left text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                  Fecha
                </th>
                <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                  Ingresadas
                </th>
                <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                  Procesadas
                </th>
                <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                  Finalizadas
                </th>
                <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                  Pendientes
                </th>
                <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3">
                  Discrepancias
                </th>
                <th className="text-right text-xs font-semibold text-slate-200 uppercase tracking-wider px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {historialOrdenado.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-slate-400 text-sm"
                  >
                    Sin registros para los filtros aplicados
                  </td>
                </tr>
              ) : (
                historialOrdenado.map((h) => {
                  const esHoyFila = h.fecha === hoy;
                  const esSeleccionada = h.fecha === fechaSeleccionada;
                  return (
                    <tr
                      key={h.fecha}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                        esSeleccionada ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 font-mono">
                            {h.fecha}
                          </span>
                          {esHoyFila && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wider">
                              Hoy
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900 font-medium font-mono">
                        {h.ingresadas}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700 font-mono">
                        {h.procesadas}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-700 font-medium font-mono">
                        {h.finalizadas}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700 font-mono">
                        {h.pendientes}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {h.discrepancias > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm text-red-700 font-medium font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {h.discrepancias}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300 font-mono">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setFechaSeleccionada(h.fecha)}
                          className="text-xs px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
