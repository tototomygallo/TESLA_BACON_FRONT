import type { ReactNode } from 'react';

interface Props {
  label: string;
  valor: number;
  icono: ReactNode;
  color: 'blue' | 'amber' | 'emerald' | 'slate';
}

const colors = {
  blue:    { icon: 'bg-blue-100 text-blue-700' },
  amber:   { icon: 'bg-amber-100 text-amber-700' },
  emerald: { icon: 'bg-emerald-100 text-emerald-700' },
  slate:   { icon: 'bg-slate-100 text-slate-700' },
};

export function MetricCard({ label, valor, icono, color }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color].icon}`}
        >
          {icono}
        </div>
      </div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-3xl font-semibold text-slate-900 tracking-tight font-mono">
        {valor}
      </div>
    </div>
  );
}
