import type { ReactNode } from 'react';

interface Props {
  label: string;
  valor: number;
  icono: ReactNode;
  color: 'blue' | 'amber' | 'emerald' | 'slate';
}

const colors = {
  blue:    { icon: 'text-sky-300/85' },
  amber:   { icon: 'text-amber-300/85' },
  emerald: { icon: 'text-emerald-300/85' },
  slate:   { icon: 'text-slate-300/85' },
};

export function MetricCard({ label, valor, icono, color }: Props) {
  return (
    <div className="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-xl px-5 py-4 shadow-[0_18px_34px_rgba(15,23,42,0.24)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.3)] transition-all">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" />
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2">
            {label}
          </div>
          <div className="text-3xl font-extrabold text-green-500 tracking-tight font-mono leading-none">
            {valor}
          </div>
        </div>
        <div
          className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ring-1 ring-white/10 ${colors[color].icon}`}
        >
          {icono}
        </div>
      </div>
    </div>
  );
}
