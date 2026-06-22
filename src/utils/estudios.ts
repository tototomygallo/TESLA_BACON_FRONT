import type { Muestra } from '../types';

export type FiltroEstudio = 'todos' | Muestra['tipoEstudio'];

export function etiquetaTipoEstudio(tipo: Muestra['tipoEstudio']): string {
  return tipo === 'lactokit' ? 'Lactokit' : 'Taukit';
}

export function etiquetaTipoEstudioMayus(tipo: Muestra['tipoEstudio']): string {
  return etiquetaTipoEstudio(tipo).toUpperCase();
}

export function codigoMuestra(muestra: Muestra): string {
  return muestra.tipoEstudio === 'lactokit'
    ? muestra.codigoLactokit ?? muestra.codigoTauKit
    : muestra.codigoTauKit;
}

export function tipoDesdeCodigo(codigo: string): Muestra['tipoEstudio'] {
  return codigo.trim().startsWith('2') ? 'lactokit' : 'taukit';
}
