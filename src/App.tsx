import { useCallback, useEffect, useState } from 'react';
import { Topbar, type Vista } from './components/Topbar';
import { useHistorial } from './hooks/useHistorial';
import { useMuestras } from './hooks/useMuestras';
import { AdministracionPage } from './pages/AdministracionPage';
import { CargaTxtPage } from './pages/CargaTxtPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MuestrasPage } from './pages/MuestrasPage';
import { ScannerPage } from './pages/ScannerPage';
import { clearTokens } from './services/authToken';
import type { Usuario } from './types';

// Tiempo de inactividad (app abierta) antes de cerrar la sesión.
// La validez real de la sesión la gobiernan los tokens JWT del back: un F5
// la conserva (access vencido → se renueva con el refresh token).
const TIMEOUT_INACTIVIDAD_MS = 15 * 60 * 1000; // 15 minutos

// Restaura el usuario persistido para que un F5 no cierre la sesión.
// Si los tokens ya no sirven, la primera request dará 401 → refresh → logout.
function leerSesionGuardada(): Usuario | null {
  try {
    const raw = localStorage.getItem('usuario');
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

function guardarSesion(u: Usuario) {
  // Los tokens los guarda httpApi.login; acá solo el objeto usuario para la UI.
  localStorage.setItem('usuario', JSON.stringify(u));
}

export default function App() {
  // Se restaura desde localStorage para que un F5 no cierre la sesión.
  const [usuario, setUsuario] = useState<Usuario | null>(() => leerSesionGuardada());
  const [vista, setVista] = useState<Vista>('scanner');
  const [mensajeLogin, setMensajeLogin] = useState<string | null>(null);

  const {
    muestras,
    cargando: cargandoMuestras,
    ingresarLote,
    recargar: recargarMuestras,
  } = useMuestras();
  const { historial, recargar: recargarHistorial } = useHistorial();

  const cerrarSesion = useCallback((mensaje?: string) => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('sessionExpira');
    clearTokens();
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    setVista('scanner');
    setUsuario(null);
    setMensajeLogin(mensaje ?? null);
  }, []);

  // El cliente HTTP dispara este evento cuando el token vence/ es inválido y
  // el refresh también falla. Ahí cerramos la sesión y mostramos el aviso.
  useEffect(() => {
    const handler = (e: Event) => {
      const mensaje = (e as CustomEvent<{ mensaje?: string }>).detail?.mensaje;
      cerrarSesion(mensaje ?? 'Tu sesión expiró. Iniciá sesión de nuevo.');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [cerrarSesion]);

  useEffect(() => {
    if (!usuario) return;

    let timeoutId: number | undefined;

    const logoutByIdle = () => {
      cerrarSesion('Sesión cerrada por inactividad.');
    };

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(logoutByIdle, TIMEOUT_INACTIVIDAD_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [cerrarSesion, usuario]);

  if (!usuario) {
    return (
      <LoginPage
        mensaje={mensajeLogin}
        onLogin={(u) => {
          setMensajeLogin(null);
          setVista('scanner');
          guardarSesion(u);
          setUsuario(u);
        }}
      />
    );
  }

  const handleIngresar = async (codigos: string[]) => {
    const resultado = await ingresarLote(codigos, usuario.username);
    if (resultado.rechazadas.length > 0) {
      await recargarHistorial();
    }
    return resultado;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <Topbar
        usuario={usuario}
        onLogout={() => cerrarSesion()}
        vista={vista}
        setVista={setVista}
      />
      <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {cargandoMuestras && muestras.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            Cargando datos…
          </div>
        ) : (
          <>
            {vista === 'resumen' && (
              <DashboardPage
                historial={historial}
                muestras={muestras}
              />
            )}
            {vista === 'muestras' && (
              <MuestrasPage
                muestras={muestras}
                usuario={usuario}
                onMuestraActualizada={recargarMuestras}
              />
            )}
            {vista === 'scanner' && (
              <ScannerPage muestras={muestras} onIngresar={handleIngresar} />
            )}
            {vista === 'carga_txt' && (
              <CargaTxtPage usuario={usuario} onCargado={recargarMuestras} />
            )}
            {vista === 'administracion' && usuario.rol === 'admin' && (
              <AdministracionPage
                usuario={usuario}
                muestras={muestras}
                onActualizada={recargarMuestras}
              />
            )}
            {vista === 'configuracion' && (
              <ConfiguracionPage usuario={usuario} />
            )}
          </>
        )}
      </main>
      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-slate-400">
          Diseño y Desarrollo{' '}
          <a
            href="https://consulters.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="uppercase tracking-wide text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
          >
            Technological Consulters
          </a>
          <span className="mx-1.5 text-slate-300">|</span>©{' '}
          Tesla Laboratorio {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
