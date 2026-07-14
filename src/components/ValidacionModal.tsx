import { useEffect, useState } from 'react';
import { api, ApiError } from '../services';
import { EstadoBadge, ErrorBadge } from './EstadoBadge';
import type { Muestra } from '../types';

// Tablas de referencia de Lactokit (significado definido por el backend).
const CONDICIONES_LACTOKIT: Array<{ id: string; texto: string }> = [
  { id: 'a', texto: 'Si hay cuatro frascos o más donde el valor de CO2 es menor a 1,4%. → valoración 1' },
  { id: 'b', texto: 'Si H2 en cualquier punto es mayor a 20 ppm respecto del basal. → valoración 2' },
  { id: 'c', texto: 'Si CH4 es mayor a 10 ppm en cualquier frasco. → valoración 3' },
  { id: 'd', texto: 'Si se cumplen las condiciones "b" y "c" en simultáneo. → valoración 4' },
  { id: 'e', texto: 'Si no es "b", "c" o "d". → valoración 5' },
  { id: 'f', texto: 'Si en tres frascos el valor de CO2 es menor a 1,4%. Agrega la valoración de "b", "c", "d" o "e". → valoración 6' },
];

const VALORACIONES_LACTOKIT: Array<{ id: string; texto: string }> = [
  { id: '1', texto: 'SE DEBE REPETIR LA PRUEBA POR MALA PRÁCTICA EN LA RECOGIDA DE LAS MUESTRAS DE ALIENTO (CO2 < 1,4%).' },
  { id: '2', texto: 'RESULTADO COMPATIBLE CON MALABSORCION DE LACTOSA CON ELEVACION DE HIDROGENO. SI EL PACIENTE REPORTA SINTOMAS, ENTONCES ESTARIAMOS FRENTE A UNA INTOLERANCIA A LA LACTOSA.' },
  { id: '3', texto: 'RESULTADO COMPATIBLE CON MALABSORCION DE LACTOSA CON ELEVACION DE METANO. SI EL PACIENTE REPORTA SINTOMAS, ENTONCES ESTARIAMOS FRENTE A UNA INTOLERANCIA A LA LACTOSA.' },
  { id: '4', texto: 'RESULTADO COMPATIBLE CON MALABSORCION DE LACTOSA CON ELEVACION DE HIDROGENO Y METANO. SI EL PACIENTE REPORTA SINTOMAS, ENTONCES ESTARIAMOS FRENTE A UNA INTOLERANCIA A LA LACTOSA.' },
  { id: '5', texto: 'RESULTADO NO COMPATIBLE CON MALABSORCION DE LACTOSA.' },
  { id: '6', texto: 'La valoración que corresponda (2, 3, 4 o 5) + aviso: "DEBIDO A QUE VARIAS MUESTRAS CONTENIAN CO2 < 1,4%, SE SUGIERE REPETIR LA PRUEBA."' },
];

// Para la valoración 6, deduce la condición cumplida (b/c/d/e) a partir del
// texto del informe. Es inferencia por texto: si el back cambia el wording,
// simplemente no se muestra el sufijo (queda "6" a secas).
function condicionDeValoracion6(descripcion: string): string {
  const d = descripcion.toUpperCase();
  if (d.includes('HIDROGENO Y METANO')) return 'd';
  if (d.includes('NO COMPATIBLE')) return 'e';
  if (d.includes('HIDROGENO')) return 'b';
  if (d.includes('METANO')) return 'c';
  return '';
}

interface Props {
  muestra: Muestra;
  usuarioId: string;
  onCerrar: () => void;
  // Se llama cuando la muestra cambió (validada o reiniciada),
  // para que el padre refresque la lista.
  onActualizada: () => void;
  onValidacionExitosa?: (mensaje: string) => void;
  // La muestra se completó y verificó en BACON, pero el envío por mail falló.
  onValidacionConAdvertencia?: (mensaje: string) => void;
}

// ============================================
// Modal de validación bioquímica (scope 2.7)
// ============================================
// Ventana exclusiva de la bioquímica para revisar una muestra
// en estado 'en_validacion'. Muestra los datos del paciente y los
// resultados del HeliFan, con tres acciones:
//   - Aceptar  → estado pasa a 'completado'
//   - Cancelar → cierra sin cambios (queda 'en_validacion')
//   - Reiniciar → solo si tiene error; borra resultados para recargar

export function ValidacionModal({
  muestra,
  usuarioId,
  onCerrar,
  onActualizada,
  onValidacionExitosa,
  onValidacionConAdvertencia,
}: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !enviando) onCerrar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCerrar, enviando]);

  const bloqueada = muestra.intentosFallidos >= 2;
  const r = muestra.resultados;
  const resultadosLactokit = muestra.resultadosLactokit;

  const handleAceptar = async () => {
    setEnviando(true);
    setError(null);
    try {
      // validar solo pasa en_validacion → completado (nunca anula).
      const respuesta = await api.validarMuestra(muestra.protocolo, usuarioId);
      if (respuesta.pdfVerificado !== true) {
        setError('No se pudo verificar la subida del PDF en BACON. La muestra no se marcó como completada.');
        return;
      }
      onActualizada();
      onCerrar();
      // El backend puede avisar que el informe no se pudo enviar por mail. En
      // ese caso mostramos un aviso amarillo en vez del mensaje de éxito.
      if (respuesta.advertencia) {
        onValidacionConAdvertencia?.(respuesta.advertencia);
      } else {
        onValidacionExitosa?.('PDF subido correctamente. Verificación exitosa.');
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Error al validar la muestra',
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleReiniciar = async () => {
    if (!confirmandoReinicio) {
      setConfirmandoReinicio(true);
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const respuesta = await api.reiniciarMuestra(muestra.protocolo, usuarioId);
      onActualizada();

      // Si este reinicio lleva el contador a 2/2, la muestra queda
      // anulada y el informe de anulación se sube/verifica en BACON.
      if (respuesta.estado === 'anulado' && respuesta.pdfVerificado !== true) {
        // Se anuló, pero el informe NO se pudo verificar en BACON. No cerramos
        // el modal para que el aviso quede visible.
        setError('La muestra se anuló, pero el informe de anulación no se pudo verificar en BACON. Revisá BACON.');
        return;
      }

      onCerrar();
      // Anulada + informe verificado OK: confirmación (o aviso amarillo si el
      // mail falló pero la subida a BACON sí se verificó).
      if (respuesta.estado === 'anulado') {
        if (respuesta.advertencia) {
          onValidacionConAdvertencia?.(respuesta.advertencia);
        } else {
          onValidacionExitosa?.('Informe de anulación subido correctamente. Verificación exitosa.');
        }
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Error al reiniciar la muestra',
      );
    } finally {
      setEnviando(false);
      setConfirmandoReinicio(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={() => !enviando && onCerrar()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              Validación bioquímica
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Revisá los resultados antes de aprobar el informe
            </p>
          </div>
          <button
            onClick={() => !enviando && onCerrar()}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-4 space-y-4">
          {/* Identificación */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 font-mono">
              {muestra.protocolo}
            </span>
            <div className="flex gap-1.5">
              <EstadoBadge estado={muestra.estado} />
              {muestra.tieneError && <ErrorBadge />}
            </div>
          </div>

          {/* Datos del paciente */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paciente
            </div>
            <div className="text-sm font-medium text-slate-900">
              {muestra.paciente.apellido}, {muestra.paciente.nombre}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">DNI:</span>{' '}
                <span className="font-mono">{muestra.paciente.dni}</span>
              </div>
              <div>
                <span className="text-slate-400">Toma:</span>{' '}
                <span className="font-mono">
                  {muestra.paciente.fechaTomaMuestra}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Tipo de estudio:</span>{' '}
                <span className="font-mono">{muestra.tipoEstudio.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-slate-400">Código:</span>{' '}
                <span className="font-mono">{muestra.tipoEstudio === 'lactokit' ? (muestra.codigoLactokit ?? muestra.codigoTauKit) : muestra.codigoTauKit}</span>
              </div>
              <div>
                <span className="text-slate-400">Estudio:</span>{' '}
                {muestra.estudio.nombre}
              </div>
            </div>
          </div>
          {/* Resultados bioquímicos */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Resultados
            </div>
            {muestra.tipoEstudio === 'lactokit' ? (
              resultadosLactokit ? (
                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Condiciones</div>
                    <div className="overflow-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-left text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="px-3 py-2 border-b border-slate-200">Condición</th>
                            <th className="px-3 py-2 border-b border-slate-200">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CONDICIONES_LACTOKIT.map((c, i) => (
                            <tr
                              key={c.id}
                              className={i < CONDICIONES_LACTOKIT.length - 1 ? 'border-b border-slate-200' : ''}
                            >
                              <td className="px-3 py-2 align-top font-semibold">{c.id}</td>
                              <td className="px-3 py-2">{c.texto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Valoración</div>
                    <div className="overflow-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-left text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="px-3 py-2 border-b border-slate-200">Valoración</th>
                            <th className="px-3 py-2 border-b border-slate-200">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {VALORACIONES_LACTOKIT.map((v, i) => (
                            <tr
                              key={v.id}
                              className={i < VALORACIONES_LACTOKIT.length - 1 ? 'border-b border-slate-200' : ''}
                            >
                              <td className="px-3 py-2 align-top font-semibold">{v.id}</td>
                              <td className="px-3 py-2">{v.texto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Resultados por toma</div>
                    <div className="overflow-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-left text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="px-3 py-2 border-b border-slate-200">Tiempo (min)</th>
                            <th className="px-3 py-2 border-b border-slate-200">H2 (ppm) corregido</th>
                            <th className="px-3 py-2 border-b border-slate-200">CH4 (ppm) corregido</th>
                            <th className="px-3 py-2 border-b border-slate-200">CO2 (%) muestra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultadosLactokit.h2.map((_, i) => {
                            const time = i * 25;
                            return (
                              <tr key={i} className="border-b border-slate-200">
                                <td className="px-3 py-2 align-top">{time}</td>
                                <td className="px-3 py-2 font-mono">{String(resultadosLactokit.h2[i] ?? '—')}</td>
                                <td className="px-3 py-2 font-mono">{String(resultadosLactokit.ch4[i] ?? '—')}</td>
                                <td className="px-3 py-2 font-mono">{String(resultadosLactokit.co2[i] ?? '—')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="font-semibold">Valoración del informe</div>
                    <div className="mt-2 text-2xl font-bold">
                      {resultadosLactokit.valoracion === '6'
                        ? `6${resultadosLactokit.condicion ?? condicionDeValoracion6(resultadosLactokit.descripcion ?? '')}`
                        : resultadosLactokit.valoracion}
                    </div>
                    <div className="mt-2 whitespace-pre-line text-slate-700">{resultadosLactokit.descripcion}</div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-400 text-center">Esta muestra todavía no tiene resultados de Lactokit cargados.</div>
              )
            ) : (
              // Taukit (HeliFan)
              r ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between bg-slate-900 text-white rounded-lg px-4 py-3">
                    <span className="text-sm text-slate-300">Incremento sobre basal (Δ ‰)</span>
                    <span className="text-2xl font-semibold font-mono">{r.testValue.toFixed(1)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Minuto 0 (basal)</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">CO₂</span><span className="font-mono text-slate-900">{r.basalCO2.toFixed(5)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Delta</span><span className="font-mono text-slate-900">{r.basalDelta.toFixed(2)}</span></div>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">Minuto 30 (post)</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">CO₂</span><span className="font-mono text-slate-900">{r.postCO2.toFixed(5)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Delta</span><span className="font-mono text-slate-900">{r.postDelta.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">Cargado el <span className="font-mono">{r.cargadoEn}</span></div>
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-400 text-center">Esta muestra todavía no tiene resultados cargados.</div>
              )
            )}
          </div>

          {/* Aviso de bloqueo */}
          {bloqueada && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <div className="text-sm font-medium text-red-700">
                No es posible generar el informe requerido con esta muestra.
              </div>
              <div className="text-xs text-red-600 mt-1">
                El TauKit llegó a Reinicios 2/2. Se debe usar otro TauKit
                para este paciente.
              </div>
            </div>
          )}

          {/* Aviso de error del equipo con detalle de QUÉ causó el error */}
          {muestra.tieneError && !bloqueada && r && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-2">
              <div className="text-sm font-semibold text-amber-800">
                Error detectado en los resultados
              </div>
              <div className="text-xs text-amber-700 space-y-1">
                {r.postDelta <= -9999 && (
                  <div>
                    → <span className="font-medium">Delta post 30 min = {r.postDelta.toFixed(2)}</span> — el equipo no pudo medir la muestra.
                  </div>
                )}
                {r.postDelta > -9999 && (
                  <div>
                    → Valores fuera de lo esperado. Revisá basal ({r.basalDelta.toFixed(2)}) y post ({r.postDelta.toFixed(2)}).
                  </div>
                )}
              </div>
              <div className="text-xs text-amber-600 pt-1 border-t border-amber-200">
                Reinicios: <span className="font-semibold">{muestra.intentosFallidos}/2</span>.
                Esta medición quedó registrada con error del equipo.
              </div>
            </div>
          )}

          {/* Info de reinicios para muestras sin error pero con 1 registro previo */}
          {!muestra.tieneError && muestra.intentosFallidos > 0 && !bloqueada && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
              Reinicios: <span className="font-semibold">{muestra.intentosFallidos}/2</span>.
              La muestra ya fue reiniciada o tuvo un error previo.
            </div>
          )}

          {/* Error de la operación */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

        </div>

        {/* Confirmación de reinicio (reemplaza el footer mientras está activa) */}
        {confirmandoReinicio ? (
          <div className="px-6 py-4 border-t border-amber-200 bg-amber-50 space-y-3">
            <div className="text-sm text-amber-900 font-medium">
              ¿Confirmar reinicio de la muestra?
            </div>
            <div className="text-xs text-amber-700">
              {muestra.intentosFallidos >= 1 ? (
                <>
                  Este TauKit ya tiene <span className="font-semibold">1 reinicio/error registrado</span>.
                  Si confirmás este reinicio, llegará a <span className="font-semibold">2 de 2</span> y el TauKit quedará <span className="font-semibold">ANULADO ahora</span>.
                </>
              ) : (
                <>
                  Se borrarán los resultados y la muestra volverá a "En proceso"
                  para cargar nuevos resultados del HeliFan.
                  Este será el <span className="font-semibold">primer reinicio</span> registrado del TauKit.
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmandoReinicio(false)}
                disabled={enviando}
                className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50 transition-colors font-medium"
              >
                No, volver
              </button>
              <button
                onClick={handleReiniciar}
                disabled={enviando}
                className="text-sm px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium"
              >
                {enviando ? 'Reiniciando…' : 'Sí, reiniciar'}
              </button>
            </div>
          </div>
        ) : (
          /* Footer normal con acciones */
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {muestra.resultados &&
                muestra.estado !== 'anulado' &&
                muestra.estado !== 'completado' && (
                <button
                  onClick={handleReiniciar}
                  disabled={enviando || bloqueada}
                  className="text-sm px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Reiniciar muestra
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => !enviando && onCerrar()}
                disabled={enviando}
                className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              {muestra.estado === 'en_validacion' && (
                <button
                  onClick={handleAceptar}
                  disabled={enviando || bloqueada}
                  className="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {enviando ? 'Procesando…' : 'Aceptar y completar'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
