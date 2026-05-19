import type { Rol } from '../types';

const labels: Record<Rol, string> = {
  tecnico: 'Técnico',
  bioquimico: 'Bioquímico',
  admin: 'Administrador',
};

export function RolBadge({ rol }: { rol: Rol }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
      {labels[rol]}
    </span>
  );
}
