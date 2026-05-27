import { useState } from 'react';
import { Topbar, type Vista } from './components/Topbar';
import { useHistorial } from './hooks/useHistorial';
import { useMuestras } from './hooks/useMuestras';
import { CargaTxtPage } from './pages/CargaTxtPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MuestrasPage } from './pages/MuestrasPage';
import { ScannerPage } from './pages/ScannerPage';
import type { Usuario } from './types';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vista, setVista] = useState<Vista>('scanner');

  const {
    muestras,
    cargando: cargandoMuestras,
    ingresarLote,
    recargar: recargarMuestras,
  } = useMuestras();
  const { historial, recargar: recargarHistorial } = useHistorial();

  if (!usuario) {
    return (
      <LoginPage
        onLogin={(u) => {
          setVista('scanner');
          setUsuario(u);
        }}
      />
    );
  }

  const handleIngresar = async (codigos: string[]) => {
    const resultado = await ingresarLote(codigos);
    if (resultado.rechazadas.length > 0) {
      await recargarHistorial();
    }
    return resultado;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Topbar
        usuario={usuario}
        onLogout={() => {
          setVista('scanner');
          setUsuario(null);
        }}
        vista={vista}
        setVista={setVista}
      />
      <main className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
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
              <CargaTxtPage onCargado={recargarMuestras} />
            )}
            {vista === 'configuracion' && (
              <ConfiguracionPage usuario={usuario} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
