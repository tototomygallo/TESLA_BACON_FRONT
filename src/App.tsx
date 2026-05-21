import { useState } from 'react';
import { Topbar, type Vista } from './components/Topbar';
import { useHistorial } from './hooks/useHistorial';
import { useMuestras } from './hooks/useMuestras';
import { CargaTxtPage } from './pages/CargaTxtPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MuestrasPage } from './pages/MuestrasPage';
import { ScannerPage } from './pages/ScannerPage';
import type { Usuario } from './types';

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vista, setVista] = useState<Vista>('resumen');

  const {
    muestras,
    cargando: cargandoMuestras,
    ingresarLote,
    recargar: recargarMuestras,
  } = useMuestras();
  const { historial, recargar: recargarHistorial } = useHistorial();

  if (!usuario) {
    return <LoginPage onLogin={setUsuario} />;
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
        onLogout={() => setUsuario(null)}
        vista={vista}
        setVista={setVista}
      />
      <main className="max-w-[1400px] mx-auto px-6 py-8 lg:py-10">
        {cargandoMuestras && muestras.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            Cargando datos…
          </div>
        ) : (
          <>
            {vista === 'resumen' && (
              <DashboardPage historial={historial} muestras={muestras} />
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
          </>
        )}
      </main>
    </div>
  );
}
