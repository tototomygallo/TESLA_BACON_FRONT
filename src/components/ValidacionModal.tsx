import { useEffect, useState } from 'react';
import { api, ApiError } from '../services';
import { EstadoBadge, ErrorBadge } from './EstadoBadge';
import type { Muestra } from '../types';

interface Props {
  muestra: Muestra;
  onCerrar: () => void;
  // Se llama cuando la muestra cambió (validada o reiniciada),
  // para que el padre refresque la lista.
  onActualizada: () => void;
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

export function ValidacionModal({ muestra, onCerrar, onActualizada }: Props) {
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

  const handleAceptar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await api.validarMuestra(muestra.protocolo);
      onActualizada();
      onCerrar();
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
      await api.reiniciarMuestra(muestra.protocolo);
      onActualizada();
      onCerrar();
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
                <span className="text-slate-400">TauKit:</span>{' '}
                <span className="font-mono">{muestra.codigoTauKit}</span>
              </div>
              <div>
                <span className="text-slate-400">Estudio:</span>{' '}
                {muestra.estudio.nombre}
              </div>
            </div>
          </div>

          {/* Resultados del HeliFan */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Resultados del HeliFan
            </div>
            {r ? (
              <div className="p-4 space-y-3">
                {/* TestValue destacado */}
                <div className="flex items-center justify-between bg-slate-900 text-white rounded-lg px-4 py-3">
                  <span className="text-sm text-slate-300">
                    Incremento sobre basal (Δ ‰)
                  </span>
                  <span className="text-2xl font-semibold font-mono">
                    {r.testValue.toFixed(1)}
                  </span>
                </div>

                {/* Detalle basal / post */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                      Minuto 0 (basal)
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">CO₂</span>
                        <span className="font-mono text-slate-900">
                          {r.basalCO2.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delta</span>
                        <span className="font-mono text-slate-900">
                          {r.basalDelta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                      Minuto 30 (post)
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">CO₂</span>
                        <span className="font-mono text-slate-900">
                          {r.postCO2.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delta</span>
                        <span className="font-mono text-slate-900">
                          {r.postDelta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Cargado el{' '}
                  <span className="font-mono">{r.cargadoEn}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-400 text-center">
                Esta muestra todavía no tiene resultados cargados.
              </div>
            )}
          </div>

          {/* Aviso de bloqueo */}
          {bloqueada && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <div className="text-sm font-medium text-red-700">
                No es posible generar el informe requerido con esta muestra.
              </div>
              <div className="text-xs text-red-600 mt-1">
                El TauKit agotó sus 2 mediciones. Se debe usar otro
                TauKit para este paciente.
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
                Intento {muestra.intentosFallidos} de 2 · Queda {2 - muestra.intentosFallidos} oportunidad{2 - muestra.intentosFallidos !== 1 ? 'es' : ''}.
                Al reiniciar se usa el 2do tubo del TauKit.
              </div>
            </div>
          )}

          {/* Info de intentos para muestras sin error pero ya con 1 intento gastado */}
          {!muestra.tieneError && muestra.intentosFallidos > 0 && !bloqueada && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
              Este TauKit ya usó {muestra.intentosFallidos} de 2 oportunidades. Si se reinicia, esta será la última.
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
                  Este TauKit ya usó <span className="font-semibold">1 de sus 2 oportunidades</span>.
                  Si la segunda muestra también falla, el TauKit se <span className="font-semibold">ANULARÁ</span> y
                  deberán usar otro.
                </>
              ) : (
                <>
                  Se borrarán los resultados y la muestra volverá a "En proceso"
                  para cargar nuevos resultados del HeliFan.
                  Este TauKit tiene <span className="font-semibold">2 oportunidades</span>; esta será la primera usada.
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
