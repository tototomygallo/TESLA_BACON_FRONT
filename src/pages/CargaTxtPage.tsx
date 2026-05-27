import { useRef, useState } from 'react';
import { api } from '../services';
import type { ResultadoCargaTxt } from '../types';

interface Props {
  onCargado: () => void; // callback para refrescar la lista de muestras
}

export function CargaTxtPage({ onCargado }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [contenido, setContenido] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoCargaTxt | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesarArchivo = (f: File) => {
    setError(null);
    setResultado(null);

    if (!f.name.toLowerCase().endsWith('.txt')) {
      setError('El archivo debe tener extensión .txt');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máximo 5MB)');
      return;
    }

    setArchivo(f);
    const reader = new FileReader();
    reader.onload = () => setContenido(String(reader.result ?? ''));
    reader.onerror = () => setError('No se pudo leer el archivo');
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files[0];
    if (f) procesarArchivo(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) procesarArchivo(f);
  };

  const confirmarCarga = async () => {
    if (!contenido) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await api.cargarResultadosTxt(contenido);
      setResultado(res);
      onCargado();
      // Limpiar input para permitir cargar otro archivo
      setArchivo(null);
      setContenido('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el TXT');
    } finally {
      setEnviando(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setContenido('');
    setResultado(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Preview de las primeras líneas del archivo
  const preview = contenido
    ? contenido.split(/\r?\n/).slice(0, 8).join('\n')
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Carga de resultados
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Subí el archivo TXT exportado por el HeliFan. El sistema parsea
            cada muestra y la matchea con los protocolos internos.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Resultado de la carga */}
        {resultado && (
          <ResultadoCarga resultado={resultado} onCerrar={() => setResultado(null)} />
        )}

        {/* Dropzone */}
        {!archivo && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              arrastrando
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-sm font-medium text-slate-900 mb-1">
              Arrastrá el archivo TXT acá, o hacé click para seleccionar
            </div>
            <div className="text-xs text-slate-500">
              Solo archivos .txt — máximo 5MB
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Preview del archivo */}
        {archivo && contenido && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {archivo.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {(archivo.size / 1024).toFixed(1)} KB ·{' '}
                    {contenido.split(/\r?\n/).length} líneas
                  </div>
                </div>
              </div>
              <button
                onClick={limpiar}
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
              >
                Quitar
              </button>
            </div>
            <pre className="px-5 py-3 text-xs font-mono text-slate-600 bg-slate-50 overflow-x-auto max-h-48 leading-relaxed">
              {preview}
              {contenido.split(/\r?\n/).length > 8 && (
                <div className="text-slate-400 italic mt-1">
                  ... ({contenido.split(/\r?\n/).length - 8} líneas más)
                </div>
              )}
            </pre>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={limpiar}
                className="text-sm px-4 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCarga}
                disabled={enviando}
                className="text-sm px-4 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {enviando ? 'Procesando…' : 'Cargar resultados →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="bg-slate-900 text-white rounded-xl p-5">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            ¿Qué pasa al cargar?
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Se parsea el TXT y se
              extrae cada muestra (2 líneas por test)
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> El{' '}
              <span className="text-white">TestID</span> matchea con el
              protocolo interno
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Las cargadas con
              éxito pasan a{' '}
              <span className="text-violet-300">En validación</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Las que tienen error
              previo se pisan; las completadas se ignoran
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-400">·</span> Los controles del
              equipo se descartan automáticamente
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Formato esperado
          </div>
          <pre className="text-[10px] font-mono text-slate-500 leading-relaxed overflow-x-auto">
{`t/min   12CO2/%  Delta,c/‰  TestValue  TestID
   0    1,69228   -25,96      -0,2    PROTOCOLO-INTERNO
  30    1,66703   -26,15
   0    2,09735   -23,77      28,0    PROTOCOLO-INTERNO
  30    1,84998     4,17
   ...`}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Tarjeta con el resumen de la carga
// ============================================
function ResultadoCarga({
  resultado,
  onCerrar,
}: {
  resultado: ResultadoCargaTxt;
  onCerrar: () => void;
}) {
  const totalOk =
    resultado.cargadosOk.length + resultado.cargadosReintentando.length;
  const hayProblemas =
    resultado.conErrorEquipo.length > 0 ||
    resultado.anuladas.length > 0 ||
    resultado.noEncontrados.length > 0 ||
    resultado.erroresParseo > 0;

  return (
    <div
      className="rounded-xl border bg-white p-5 space-y-4"
      style={{ borderColor: hayProblemas ? '#fcd34d' : '#86efac' }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
            hayProblemas ? 'bg-amber-50' : 'bg-emerald-50'
          }`}
        >
          {hayProblemas ? '⚠️' : '✓'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-900">
            Carga procesada — {totalOk} resultado{totalOk !== 1 ? 's' : ''}{' '}
            cargado{totalOk !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Las muestras cargadas pasaron al estado{' '}
            <span className="text-violet-700 font-medium">En validación</span>{' '}
            y están listas para revisión bioquímica.
          </div>
        </div>
        <button
          onClick={onCerrar}
          className="text-slate-400 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
        <ResumenItem label="Cargados OK" valor={resultado.cargadosOk.length} color="emerald" />
        <ResumenItem label="Reintentados" valor={resultado.cargadosReintentando.length} color="violet" />
        <ResumenItem label="Error equipo" valor={resultado.conErrorEquipo.length} color="red" />
        <ResumenItem label="Anuladas" valor={resultado.anuladas.length} color="red" />
        <ResumenItem label="No encontrados" valor={resultado.noEncontrados.length} color="amber" />
        <ResumenItem label="Ya completados" valor={resultado.yaCompletados.length} color="slate" />
        <ResumenItem label="Controles" valor={resultado.controles} color="slate" />
      </div>

      {resultado.cargadosOk.length > 0 && (
        <DetalleProtocolos titulo="Cargados correctamente" protocolos={resultado.cargadosOk} color="emerald" />
      )}
      {resultado.cargadosReintentando.length > 0 && (
        <DetalleProtocolos titulo="Reintentados (pisaron error previo)" protocolos={resultado.cargadosReintentando} color="violet" />
      )}
      {resultado.conErrorEquipo.length > 0 && (
        <DetalleProtocolos titulo="Con error del equipo — quedan intentos" protocolos={resultado.conErrorEquipo} color="red" />
      )}
      {resultado.anuladas.length > 0 && (
        <DetalleProtocolos titulo="Anuladas — TauKit agotó sus 2 mediciones" protocolos={resultado.anuladas} color="red" />
      )}
      {resultado.noEncontrados.length > 0 && (
        <DetalleProtocolos titulo="TestIDs no encontrados en el sistema" protocolos={resultado.noEncontrados} color="amber" />
      )}
      {resultado.yaCompletados.length > 0 && (
        <DetalleProtocolos titulo="Ya completados (ignorados)" protocolos={resultado.yaCompletados} color="slate" />
      )}
      {resultado.yaAnuladas.length > 0 && (
        <DetalleProtocolos titulo="Ya anuladas (ignoradas)" protocolos={resultado.yaAnuladas} color="slate" />
      )}

      {resultado.erroresParseo > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          ⚠️ {resultado.erroresParseo} línea
          {resultado.erroresParseo !== 1 ? 's' : ''} del TXT no se pudieron
          parsear y fueron ignoradas.
        </div>
      )}
    </div>
  );
}

function ResumenItem({
  label,
  valor,
  color,
}: {
  label: string;
  valor: number;
  color: 'emerald' | 'violet' | 'red' | 'amber' | 'slate';
}) {
  const colors = {
    emerald: 'text-emerald-700',
    violet: 'text-violet-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    slate: 'text-slate-500',
  };
  return (
    <div className="border border-slate-200 rounded-lg py-2">
      <div className={`text-2xl font-semibold font-mono ${colors[color]}`}>
        {valor}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </div>
    </div>
  );
}

function DetalleProtocolos({
  titulo,
  protocolos,
  color,
}: {
  titulo: string;
  protocolos: string[];
  color: 'emerald' | 'violet' | 'red' | 'amber' | 'slate';
}) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  };
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
        {titulo}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {protocolos.map((p) => (
          <span
            key={p}
            className={`text-xs px-2 py-0.5 rounded border font-mono ${colors[color]}`}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
