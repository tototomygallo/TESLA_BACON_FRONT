import { useEffect, useMemo, useRef, useState } from 'react';
import { ControlPrevio } from '../components/ControlPrevio';
import type { Muestra, ResultadoIngreso } from '../types';

interface Props {
  muestras: Muestra[];
  onIngresar: (codigos: string[]) => Promise<ResultadoIngreso>;
}

export function ScannerPage({ muestras, onIngresar }: Props) {
  const [codigo, setCodigo] = useState('');
  const [codigosEscaneados, setCodigosEscaneados] = useState<string[]>([]);
  const [alerta, setAlerta] = useState<ResultadoIngreso | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set de TauKits ya ingresados al sistema (para ControlPrevio)
  const tauKitsIngresados = useMemo(
    () => new Set(muestras.map((m) => m.codigoTauKit)),
    [muestras],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const agregarCodigo = (cod: string) => {
    const limpio = cod.trim().toUpperCase();
    if (!limpio) return;
    if (codigosEscaneados.includes(limpio)) {
      setCodigo('');
      return;
    }
    setCodigosEscaneados([...codigosEscaneados, limpio]);
    setCodigo('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarCodigo(codigo);
    }
  };

  const quitarCodigo = (cod: string) => {
    setCodigosEscaneados(codigosEscaneados.filter((c) => c !== cod));
    inputRef.current?.focus();
  };

  const confirmarIngreso = async () => {
    if (codigosEscaneados.length === 0) return;
    setEnviando(true);
    try {
      const resultado = await onIngresar(codigosEscaneados);
      setAlerta(resultado);
      setCodigosEscaneados([]);
    } catch (e) {
      console.error(e);
    } finally {
      setEnviando(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Ingreso por scanner
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Escaneá códigos TauKit. BACON valida cada uno y trae los datos del
            paciente automáticamente.
          </p>
        </div>

        {/* Control previo BACON (scope 2.2) */}
        <ControlPrevio tauKitsIngresados={tauKitsIngresados} />

        {alerta && (
          <div
            className="rounded-xl border bg-white p-5 space-y-3"
            style={{
              borderColor:
                alerta.rechazadas.length > 0 ? '#fca5a5' : '#86efac',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                  alerta.rechazadas.length > 0 ? 'bg-amber-50' : 'bg-emerald-50'
                }`}
              >
                {alerta.rechazadas.length > 0 ? '⚠️' : '✓'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  Se cargó {alerta.ingresadas.length} muestra
                  {alerta.ingresadas.length !== 1 ? 's' : ''}
                </div>
                {alerta.ingresadas.length > 0 && (
                  <>
                    <div className="text-sm text-slate-600 mt-1">
                      TauKits ingresados:
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alerta.ingresadas.map((m) => (
                          <span
                            key={m.codigoTauKit}
                            className="text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-semibold"
                          >
                            {m.codigoTauKit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {alerta.rechazadas.length > 0 && (
                  <div className="text-sm text-red-700 mt-3">
                    No se cargaron {alerta.rechazadas.length} muestra
                    {alerta.rechazadas.length !== 1 ? 's' : ''} porque BACON no
                    las tiene como enviadas:
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {alerta.rechazadas.map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      Registrado en el Resumen del día.
                    </div>
                  </div>
                )}
                {alerta.duplicadas.length > 0 && (
                  <div className="text-sm text-amber-700 mt-2">
                    {alerta.duplicadas.length} ya estaban ingresadas
                    previamente.
                  </div>
                )}
              </div>
              <button
                onClick={() => setAlerta(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Código TauKit
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="2" height="14" />
                <rect x="7" y="5" width="1" height="14" />
                <rect x="10" y="5" width="2" height="14" />
                <rect x="14" y="5" width="1" height="14" />
                <rect x="17" y="5" width="2" height="14" />
                <rect x="21" y="5" width="1" height="14" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Esperando lector de código..."
              className="w-full pl-12 pr-4 py-4 border-2 border-emerald-500 rounded-lg text-lg font-mono focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Listo
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            El campo mantiene auto-focus. Cada Enter del scanner agrega el
            código al lote.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="font-medium text-slate-900">
              Lote actual{' '}
              <span className="text-slate-400 font-normal">
                ({codigosEscaneados.length})
              </span>
            </div>
            <button
              onClick={confirmarIngreso}
              disabled={codigosEscaneados.length === 0 || enviando}
              className="text-sm px-4 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {enviando ? 'Validando con BACON…' : 'Confirmar ingreso →'}
            </button>
          </div>
          {codigosEscaneados.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              Escaneá una muestra para comenzar
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {codigosEscaneados.map((c, i) => (
                <div
                  key={c}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-6 font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-slate-900 font-mono">
                      {c}
                    </span>
                  </div>
                  <button
                    onClick={() => quitarCodigo(c)}
                    className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Resumen del lote
          </div>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-600">Escaneadas</span>
              <span className="text-2xl font-semibold text-slate-900 font-mono">
                {codigosEscaneados.length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-600">Total ya ingresadas</span>
              <span className="text-2xl font-semibold text-slate-900 font-mono">
                {muestras.length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-5">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            ¿Cómo funciona?
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Escaneás los TauKits
              de un lote.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Al confirmar, BACON
              valida cada uno y devuelve datos del paciente.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> El sistema genera un
              protocolo interno{' '}
              <span className="text-white font-mono">SS-EE-NNNNNNNN</span> por
              muestra.
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Las muestras quedan
              en estado <span className="text-white">Recibido</span>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
