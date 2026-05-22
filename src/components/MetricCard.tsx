import type { ReactNode } from 'react';

interface Props {
  label: string;
  valor: number;
  icono: ReactNode;
  color: 'blue' | 'amber' | 'emerald' | 'slate';
}

export function MetricCard({ label, valor, icono, color }: Props) {
  void icono;
  void color;

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 text-center shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
      <div className="text-center">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {label}
          </div>
          <div className="text-3xl font-extrabold text-green-600 tracking-tight font-mono leading-none">
            {valor}
          </div>
      </div>
    </div>
  );
}
