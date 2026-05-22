import { useState } from 'react';
import consultersLogo from '../assets/consulters-logo.png';
import teslaLogo from '../assets/lab-tesla-logo.png';
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
  const [usuarioPendiente, setUsuarioPendiente] = useState<Usuario | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [errorCambioPassword, setErrorCambioPassword] = useState('');

  const reglasPassword = validarPassword(nuevaPassword);

  const intentarLogin = async () => {
    if (!userId.trim() || !password) return;
    setCargando(true);
    setError('');
    try {
      const usuario = await api.login(userId, password);
      if (usuario.passwordExpired) {
        setUsuarioPendiente(usuario);
        setNuevaPassword('');
        setConfirmarPassword('');
        setErrorCambioPassword('');
        return;
      }
      onLogin(usuario);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    intentarLogin();
  };

  const cambiarPasswordObligatoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioPendiente) return;
    setErrorCambioPassword('');

    if (!reglasPassword.esValida) {
      setErrorCambioPassword('La contraseña no cumple los requisitos de seguridad.');
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      setErrorCambioPassword('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setCambiandoPassword(true);
    try {
      await api.cambiarPasswordActual(usuarioPendiente.id, password, nuevaPassword);
      onLogin({ ...usuarioPendiente, passwordExpired: false });
      setUsuarioPendiente(null);
      setPassword('');
      setNuevaPassword('');
      setConfirmarPassword('');
    } catch (e) {
      if (e instanceof ApiError) setErrorCambioPassword(e.message);
      else setErrorCambioPassword('No se pudo cambiar la contraseña');
    } finally {
      setCambiandoPassword(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 font-sans bg-slate-950"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.26) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="max-w-md w-full relative z-10">
        <div className="p-8 shadow-2xl shadow-black/50 border border-white/10 bg-white/95 backdrop-blur-sm rounded-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center gap-6 mx-auto mb-5">
              <img
                src={teslaLogo}
                alt="Tesla Laboratorio"
                className="h-14 object-contain"
              />
              <div className="h-14 w-px bg-slate-300/60" />
              <img
                src={consultersLogo}
                alt="Consulters"
                className="h-14 object-contain"
              />
            </div>
            <p className="text-slate-700 text-sm font-semibold">
              Ingresá tus credenciales.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Usuario o Email
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-slate-50/50 text-slate-900 disabled:bg-slate-100"
                  placeholder="nombre@diagnosticotesla.com"
                  disabled={cargando}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8.5a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.5 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1.1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8.5a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1.1.4H22a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 20.4 15Z" />
                </svg>
                <input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-slate-50/50 text-slate-900 disabled:bg-slate-100"
                  placeholder="••••••••"
                  disabled={cargando}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || !userId.trim() || !password}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              Acceso restringido
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-8">
          © 2026 Diagnósticos Tesla S.A. Todos los derechos reservados.
        </p>
      </div>

      {usuarioPendiente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-950">
                Cambiar contraseña
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tu contraseña venció. Para ingresar, primero tenés que definir una nueva.
              </p>
            </div>

            <form onSubmit={cambiarPasswordObligatoria} className="space-y-4">
              <CampoPasswordModal
                label="Nueva contraseña"
                value={nuevaPassword}
                onChange={setNuevaPassword}
                disabled={cambiandoPassword}
              />
              <PasswordRules reglas={reglasPassword} />
              <CampoPasswordModal
                label="Confirmar nueva contraseña"
                value={confirmarPassword}
                onChange={setConfirmarPassword}
                disabled={cambiandoPassword}
              />

              {errorCambioPassword && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorCambioPassword}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  cambiandoPassword ||
                  !nuevaPassword ||
                  !confirmarPassword ||
                  !reglasPassword.esValida
                }
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800 disabled:opacity-60"
              >
                {cambiandoPassword ? 'Guardando...' : 'Cambiar e ingresar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function validarPassword(value: string) {
  const reglas = [
    { texto: 'Más de 6 caracteres', ok: value.length > 6 },
    { texto: 'Al menos 1 mayúscula', ok: /[A-ZÁÉÍÓÚÑ]/.test(value) },
    { texto: 'Al menos 1 número', ok: /\d/.test(value) },
    { texto: 'Al menos 1 carácter especial', ok: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(value) },
  ];
  return {
    reglas,
    esValida: reglas.every((regla) => regla.ok),
  };
}

function PasswordRules({ reglas }: { reglas: ReturnType<typeof validarPassword> }) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:grid-cols-2">
      {reglas.reglas.map((regla) => (
        <div
          key={regla.texto}
          className={`text-xs font-medium ${
            regla.ok ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          {regla.ok ? '✓' : '•'} {regla.texto}
        </div>
      ))}
    </div>
  );
}

function CampoPasswordModal({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type="password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
      />
    </label>
  );
}
