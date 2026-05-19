import type { Estado } from '../types';

interface Props {
  estado: Estado;
}

const config: Record<
  Estado,
  { label: string; bg: string; text: string; dot: string }
> = {
  recibido:      { label: 'Recibido',      bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  en_proceso:    { label: 'En proceso',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  en_validacion: { label: 'En validación', bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500' },
  completado:    { label: 'Completado',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  anulado:       { label: 'Anulado',       bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400' },
};

export function EstadoBadge({ estado }: Props) {
  const c = config[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// Badge separado para el flag de error (es ortogonal al estado).
export function ErrorBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Con error
    </span>
  );
}
