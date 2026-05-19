import { useState } from 'react';
import { api, ApiError } from '../services';
import type { Usuario } from '../types';

interface Props {
  onLogin: (u: Usuario) => void;
}

export function LoginPage({ onLogin }: Props) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const intentarLogin = async () => {
    if (!userId.trim() || !password) return;
    setCargando(true);
    setError('');
    try {
      const usuario = await api.login(userId, password);
      onLogin(usuario);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-xl font-mono">τ</span>
            </div>
            <div className="text-left">
              <div className="text-2xl font-semibold text-slate-900 tracking-tight">
                TauKits
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-widest">
                Lab Management
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Ingresá con tu usuario y contraseña
          </p>

          <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2">
            Usuario
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('password-input')?.focus()}
            placeholder="ej: bio1, tec1, adm1"
            disabled={cargando}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 disabled:bg-slate-50"
            autoFocus
          />

          <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-2 mt-4">
            Contraseña
          </label>
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && intentarLogin()}
            placeholder="••••••••"
            disabled={cargando}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 disabled:bg-slate-50"
          />

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={intentarLogin}
            disabled={cargando || !userId.trim() || !password}
            className="w-full mt-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
              Usuarios de prueba (contraseña = mismo ID)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-600">
                <span className="font-mono text-slate-900">tec1</span> · Técnico
              </div>
              <div className="text-slate-600">
                <span className="font-mono text-slate-900">bio1</span> ·
                Bioquímico
              </div>
              <div className="text-slate-600">
                <span className="font-mono text-slate-900">adm1</span> · Admin
              </div>
              <div className="text-slate-600">
                <span className="font-mono text-slate-900">tec2/bio2/adm2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
