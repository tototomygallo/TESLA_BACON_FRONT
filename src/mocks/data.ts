import {
  type Estudio,
  type Muestra,
  type Paciente,
  type ResumenDiario,
  type Sucursal,
  type Usuario,
} from '../types';

export const USUARIOS_MOCK: Record<string, Usuario> = {
  tec1: { id: 'tec1', username: 'tec1', nombre: 'María López', rol: 'tecnico' },
  tec2: { id: 'tec2', username: 'tec2', nombre: 'Juan Pérez', rol: 'tecnico' },
  bio1: { id: 'bio1', username: 'bio1', nombre: 'Dra. Ana García', rol: 'bioquimico' },
  bio2: { id: 'bio2', username: 'bio2', nombre: 'Dr. Carlos Ruiz', rol: 'bioquimico' },
  adm1: { id: 'adm1', username: 'adm1', nombre: 'Laura Martínez', rol: 'admin' },
  adm2: { id: 'adm2', username: 'adm2', nombre: 'Roberto Silva', rol: 'admin' },
};

const MOCK_SUCURSAL: Sucursal = {
  codigo: 'mock-sucursal',
  nombre: 'Sucursal mock',
};

const MOCK_ESTUDIO: Estudio = {
  codigo: 'mock-estudio',
  nombre: 'Helicobacter Pylori (Urea-13C)',
};

const MOCK_ESTUDIO_LACTOKIT: Estudio = {
  codigo: '002',
  nombre: 'Malabsorcion de Lactosa',
};

export const BACON_DB: Record<
  string,
  { paciente: Paciente; estudio: Estudio }
> = {
  'TK-2026-0001': {
    paciente: { nombre: 'Roberto', apellido: 'González', dni: '28456789', fechaTomaMuestra: '2026-05-12' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0002': {
    paciente: { nombre: 'Lucía', apellido: 'Fernández', dni: '32145678', fechaTomaMuestra: '2026-05-12' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0003': {
    paciente: { nombre: 'Martín', apellido: 'Rodríguez', dni: '35789012', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0004': {
    paciente: { nombre: 'Carmen', apellido: 'López', dni: '29876543', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0005': {
    paciente: { nombre: 'Diego', apellido: 'Martínez', dni: '31234567', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0006': {
    paciente: { nombre: 'Sofía', apellido: 'Ramírez', dni: '33456789', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0007': {
    paciente: { nombre: 'Pablo', apellido: 'Acosta', dni: '27890123', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO,
  },
  'TK-2026-0008': {
    paciente: { nombre: 'Valeria', apellido: 'Suárez', dni: '34567891', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO,
  },
  '20000001': {
    paciente: { nombre: 'Mariana', apellido: 'Ferreyra', dni: '30123456', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO_LACTOKIT,
  },
  '20000002': {
    paciente: { nombre: 'Lucas', apellido: 'Ramirez', dni: '33222111', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO_LACTOKIT,
  },
  '20000003': {
    paciente: { nombre: 'Analia', apellido: 'Diaz', dni: '26578901', fechaTomaMuestra: '2026-05-13' },
    estudio: MOCK_ESTUDIO_LACTOKIT,
  },
};

export function construirMuestra(
  codigoTauKit: string,
  estado: Muestra['estado'] = 'recibido',
  opciones: Partial<
    Pick<Muestra, 'tieneError' | 'intentosFallidos' | 'fechaIngreso' | 'protocolo' | 'resultados'>
  > = {},
): Muestra | null {
  const datos = BACON_DB[codigoTauKit];
  if (!datos) return null;
  return {
    protocolo: opciones.protocolo ?? codigoTauKit,
    codigoTauKit,
    // Determinar tipo de estudio por prefijo (mock): códigos que empiezan con '2' son Lactokit
    tipoEstudio: codigoTauKit.trim().startsWith('2') ? 'lactokit' : 'taukit',

    // Para Lactokit guardamos el código alternativo; en Taukit queda null
    codigoLactokit: codigoTauKit.trim().startsWith('2') ? codigoTauKit : null,
    paciente: datos.paciente,
    estudio: datos.estudio,
    sucursal: MOCK_SUCURSAL,
    estado,
    fechaIngreso:
      opciones.fechaIngreso ??
      new Date().toISOString().slice(0, 16).replace('T', ' '),
    tieneError: opciones.tieneError ?? false,
    intentosFallidos: opciones.intentosFallidos ?? 0,
    resultados: opciones.resultados ?? null,
  };
}

export const HOY = '2026-05-13';

// Muestras iniciales mock. En modo real el protocolo siempre viene del backend.
// Matchean con el TXT de ejemplo (public/sample-helifan.txt).
export const MUESTRAS_INICIALES: Muestra[] = [
  // Ya completada → el TXT debe ignorarla
  construirMuestra('TK-2026-0001', 'completado', {
    protocolo: 'TK-2026-0001',
    fechaIngreso: `${HOY} 08:14`,
    resultados: {
      basalCO2: 1.69228, postCO2: 1.66703, basalDelta: -25.96, postDelta: -26.15,
      testValue: -0.2, cargadoEn: '2026-05-12 14:30',
    },
  })!,
  // En 'en_validacion' con resultados → lista para validar en el modal
  construirMuestra('TK-2026-0002', 'en_validacion', {
    protocolo: 'TK-2026-0002',
    fechaIngreso: `${HOY} 08:22`,
    resultados: {
      basalCO2: 2.09735, postCO2: 1.84998, basalDelta: -23.77, postDelta: 4.17,
      testValue: 28.0, cargadoEn: `${HOY} 11:40`,
    },
  })!,
  // En 'recibido' → esperando carga de TXT
  construirMuestra('TK-2026-0003', 'recibido', { fechaIngreso: `${HOY} 08:35` })!,
  construirMuestra('TK-2026-0004', 'recibido', { fechaIngreso: `${HOY} 09:01` })!,
  // Con 1 error previo del HeliFan → en proceso, esperando reintento
  construirMuestra('TK-2026-0005', 'en_proceso', {
    protocolo: 'TK-2026-0005',
    fechaIngreso: `${HOY} 09:15`,
    tieneError: true,
    intentosFallidos: 1,
  })!,
  construirMuestra('TK-2026-0006', 'recibido', { fechaIngreso: `${HOY} 09:30` })!,
  construirMuestra('TK-2026-0007', 'recibido', { fechaIngreso: `${HOY} 09:45` })!,
  construirMuestra('20000001', 'en_proceso', { fechaIngreso: `${HOY} 10:10` })!,
  construirMuestra('20000002', 'en_proceso', { fechaIngreso: `${HOY} 10:18` })!,
  construirMuestra('20000003', 'recibido', { fechaIngreso: `${HOY} 10:25` })!,
  // Su protocolo NO está en el TXT → queda en 'recibido' sin resultados
  construirMuestra('TK-2026-0008', 'recibido', { fechaIngreso: `${HOY} 10:00` })!,
];

export function generarHistorialMock(): ResumenDiario[] {
  const historial: ResumenDiario[] = [];
  const hoy = new Date(HOY);
  for (let i = 13; i >= 1; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const fechaStr = fecha.toISOString().slice(0, 10);
    const ingresadas = 18 + Math.floor(Math.random() * 25);
    const finalizadas = ingresadas - Math.floor(Math.random() * 4);
    const procesadas = ingresadas - Math.floor(Math.random() * 2);
    const pendientes = Math.max(0, ingresadas - finalizadas);
    const numDisc = Math.floor(Math.random() * 5);
    // Generar códigos de ejemplo para las discrepancias
    const rechazados = Array.from({ length: numDisc }, (_, j) => ({
      codigo: `TK-ERR-${String(i).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`,
      fecha: `${fechaStr} ${8 + j}:${15 + j * 10}`,
      motivo: 'No figura como enviado en BACON',
    }));
    historial.push({
      fecha: fechaStr,
      ingresadas, procesadas, finalizadas, pendientes,
      discrepancias: numDisc,
      rechazados,
    });
  }
  historial.push({ fecha: HOY, ingresadas: 8, procesadas: 2, finalizadas: 1, pendientes: 7, discrepancias: 0, rechazados: [] });
  return historial;
}
