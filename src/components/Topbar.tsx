import type { Usuario } from '../types';
import { RolBadge } from './RolBadge';

export type Vista = 'resumen' | 'muestras' | 'scanner' | 'carga_txt';

interface Props {
  usuario: Usuario;
  vista: Vista;
  setVista: (v: Vista) => void;
  onLogout: () => void;
}

const tabs: Array<{ id: Vista; label: string }> = [
  { id: 'resumen', label: 'Resumen del día' },
  { id: 'muestras', label: 'Muestras' },
  { id: 'scanner', label: 'Ingreso por scanner' },
  { id: 'carga_txt', label: 'Carga de resultados' },
];

export function Topbar({ usuario, vista, setVista, onLogout }: Props) {
  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-10 shadow-[0_1px_0_rgba(15,23,42,0.04),0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between min-h-[76px] gap-6">
        <div className="flex items-center gap-7 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-lg shadow-slate-900/15 ring-1 ring-white/10">
              <span className="text-emerald-300 font-bold text-lg font-mono">τ</span>
            </div>
            <div>
              <div className="font-semibold text-slate-950 tracking-tight leading-tight">
                TauKits
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                TESLA BACON
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1 border border-slate-200/80 shadow-inner overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setVista(t.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  vista === t.id
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-900">
              {usuario.nombre}
            </div>
            <div>
              <RolBadge rol={usuario.rol} />
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50 transition-colors font-medium"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
