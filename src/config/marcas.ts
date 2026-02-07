import { MarcaConfig } from '../types';
import { SchneiderStrategy } from '../lib/brands/schneider';

export const MARCAS_PROCESSAMENTO: Record<number, MarcaConfig> = {
  // Schneider Electric (ID 1)
  1: SchneiderStrategy,
  
  // Futuras marcas entram aqui...
};

export function getMarcaConfig(idmarca: number): MarcaConfig | null {
  return MARCAS_PROCESSAMENTO[idmarca] || null;
}

export function hasMarcaConfig(idmarca: number): boolean {
  return idmarca in MARCAS_PROCESSAMENTO;
}