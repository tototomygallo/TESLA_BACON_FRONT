import { useEffect, useState } from 'react';
import { api } from '../services';
import type { Muestra } from '../types';
import { codigoMuestra } from '../utils/estudios';

type LactokitParametro = 'h2' | 'ch4' | 'co2';

interface LactokitFila {
  protocolo: string;
  codigo: string;
  h2: Array<number | null>;
  ch4: Array<number | null>;
  co2: Array<number | null>;
  valoracion: string | null;
  descripcion: string | null;
  guardando: boolean;
}

const FRASCOS = Array.from({ length: 8 }, (_, i) => i);
const TIEMPOS = [0, 25, 50, 75, 100, 125, 150, 175];

// Unidades por parámetro (se muestran bajo cada subcolumna)
const UNIDADES: Record<'H2' | 'CH4' | 'CO2', string> = {
  H2: 'ppm',
  CH4: 'ppm',
  CO2: '%',
};

// Banda de color suave por frasco (efecto "colorcitos")
const FRASCO_TINT = [
  'bg-slate-50',
  'bg-blue-50',
  'bg-amber-50',
  'bg-emerald-50',
  'bg-violet-50',
  'bg-rose-50',
  'bg-cyan-50',
  'bg-orange-50',
];

function valoresIniciales(muestra: Muestra, campo: LactokitParametro) {
  return Array.from(
    { length: 8 },
    (_, i) => muestra.resultadosLactokit?.[campo]?.[i] ?? null,
  );
}

function filaCompleta(fila: LactokitFila) {
  return FRASCOS.every(
    (i) => fila.h2[i] !== null && fila.ch4[i] !== null && fila.co2[i] !== null,
  );
}

function tieneValoresCargados(fila: LactokitFila) {
  return FRASCOS.some(
    (i) => fila.h2[i] !== null || fila.ch4[i] !== null || fila.co2[i] !== null,
  );
}

export function LactokitCargaGrid({
  usuarioId,
  onGuardado,
}: {
  usuarioId: string;
  onGuardado: () => void;
}) {
  const [filas, setFilas] = useState<LactokitFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoParcial, setGuardandoParcial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const todas = await api.listarMuestras();
      const lactokits = todas
        .filter(
          (m) =>
            m.tipoEstudio === 'lactokit' &&
            (m.estado === 'recibido' || m.estado === 'en_proceso'),
        )
        .slice(0, 20)
        .map<LactokitFila>((m) => ({
          protocolo: m.protocolo,
          codigo: codigoMuestra(m),
          h2: valoresIniciales(m, 'h2'),
          ch4: valoresIniciales(m, 'ch4'),
          co2: valoresIniciales(m, 'co2'),
          valoracion: m.resultadosLactokit?.valoracion ?? null,
          descripcion: m.resultadosLactokit?.descripcion ?? null,
          guardando: false,
        }));
      setFilas(lactokits);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al listar Lactokits');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const actualizarValor = (
    idx: number,
    parametro: LactokitParametro,
    frasco: number,
    valor: string,
  ) => {
    setFilas((prev) =>
      prev.map((fila, i) => {
        if (i !== idx) return fila;
        const num = valor.trim() === '' ? null : Number(valor.replace(',', '.'));
        const valores = [...fila[parametro]];
        valores[frasco] = num !== null && Number.isFinite(num) ? num : null;
        return { ...fila, [parametro]: valores };
      }),
    );
  };

  const guardarFila = async (idx: number, removerAlGuardar = false) => {
    const fila = filas[idx];
    if (!fila || (removerAlGuardar ? !filaCompleta(fila) : !tieneValoresCargados(fila))) return;

    setFilas((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, guardando: true } : f)),
    );
    setError(null);

    try {
      const actualizada = await api.guardarResultadosLactokit(fila.protocolo, {
        h2: fila.h2,
        ch4: fila.ch4,
        co2: fila.co2,
        confirmar: removerAlGuardar,
      }, usuarioId);

      setFilas((prev) =>
        removerAlGuardar
          ? prev.filter((f) => f.protocolo !== fila.protocolo)
          : prev.map((f, i) =>
              i === idx
                ? {
                    ...f,
                    valoracion:
                      actualizada.resultadosLactokit?.valoracion ?? f.valoracion,
                    descripcion:
                      actualizada.resultadosLactokit?.descripcion ?? f.descripcion,
                    guardando: false,
                  }
                : f,
            ),
      );
      onGuardado();
    } catch (e) {
      setFilas((prev) =>
        prev.map((f, i) => (i === idx ? { ...f, guardando: false } : f)),
      );
      setError(e instanceof Error ? e.message : 'Error al guardar resultados');
    }
  };

  const guardarParcial = async () => {
    const indicesConDatos = filas
      .map((fila, idx) => (tieneValoresCargados(fila) ? idx : -1))
      .filter((idx) => idx >= 0);
    if (indicesConDatos.length === 0) return;

    setGuardandoParcial(true);
    for (const idx of indicesConDatos) {
      await guardarFila(idx);
    }
    setGuardandoParcial(false);
  };

  const hayValoresCargados = filas.some(tieneValoresCargados);

  if (cargando) {
    return <div className="text-sm text-slate-500">Cargando Lactokits...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Carga de resultados - Lactokit
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Completa los valores de cada frasco. La valoracion la devuelve el backend.
          </p>
        </div>
        <button
          onClick={guardarParcial}
          disabled={!hayValoresCargados || guardandoParcial}
          className="text-sm px-4 py-2 rounded-lg bg-violet-700 text-white hover:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {guardandoParcial ? 'Guardando...' : 'Guardar parcial'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[680px]">
          <table className="min-w-[1100px] w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-left font-semibold text-slate-700 border-r border-slate-300"
                >
                  Codigo Lactokit
                </th>
                {FRASCOS.map((i) => (
                  <th
                    key={i}
                    colSpan={3}
                    className={`px-2 py-2 text-center font-semibold text-slate-700 border-l border-slate-300 ${FRASCO_TINT[i]}`}
                  >
                    Frasco {i + 1}
                    <div className="text-[10px] text-slate-500 font-normal">
                      ({TIEMPOS[i]} min)
                    </div>
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-center font-semibold text-slate-700 border-l border-slate-200"
                >
                  Valoracion
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-right font-semibold text-slate-700"
                >
                  Confirmar
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {FRASCOS.flatMap((i) =>
                  (['H2', 'CH4', 'CO2'] as const).map((label, j) => (
                    <th
                      key={`${i}-${label}`}
                      className={`px-0.5 py-1.5 text-center text-[10px] font-semibold text-slate-600 border-r border-slate-200 ${FRASCO_TINT[i]} ${j === 0 ? 'border-l border-slate-300' : ''}`}
                    >
                      {label}
                      <div className="text-[9px] text-slate-400 font-normal leading-tight">
                        ({UNIDADES[label]})
                      </div>
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td
                    colSpan={27}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    No hay Lactokits pendientes para cargar.
                  </td>
                </tr>
              ) : (
                filas.map((fila, idx) => {
                  const completa = filaCompleta(fila);
                  return (
                    <tr
                      key={fila.protocolo}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-3 font-mono font-semibold text-slate-800 border-r border-slate-300">
                        {fila.codigo}
                      </td>
                      {FRASCOS.flatMap((frasco) =>
                        (['h2', 'ch4', 'co2'] as const).map((parametro, j) => (
                          <td
                            key={`${fila.protocolo}-${frasco}-${parametro}`}
                            className={`px-0.5 py-2 border-r border-slate-200 ${FRASCO_TINT[frasco]} ${j === 0 ? 'border-l border-slate-300' : ''}`}
                          >
                            <input
                              type="number"
                              step="0.1"
                              value={fila[parametro][frasco] ?? ''}
                              onChange={(e) =>
                                actualizarValor(
                                  idx,
                                  parametro,
                                  frasco,
                                  e.target.value,
                                )
                              }
                              className="w-11 px-1 py-1.5 border border-slate-200 rounded-md text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )),
                      )}
                      <td className="px-3 py-2 text-center font-mono text-slate-700 border-l border-slate-100">
                        {fila.valoracion ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => guardarFila(idx, true)}
                          disabled={!completa || fila.guardando}
                          className="text-xs px-3 py-1.5 rounded-md bg-violet-700 text-white hover:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
                          title={fila.descripcion ?? undefined}
                        >
                          {fila.guardando ? 'Guardando' : 'Confirmar'}
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

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800 space-y-2">
        <p>Confirmar se habilita unicamente cuando los 8 frascos tienen H2, CH4 y CO2.</p>
        <p>Guardar parcial conserva los valores cargados hasta el momento sin confirmar el Lactokit.</p>
      </div>
    </div>
  );
}
