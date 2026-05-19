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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-emerald-400 font-bold font-mono">τ</span>
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">
              TauKits
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setVista(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  vista === t.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900">
              {usuario.nombre}
            </div>
            <div>
              <RolBadge rol={usuario.rol} />
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
