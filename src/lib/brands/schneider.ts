import { MarcaConfig } from '../../types';

// ============================================================================
// ESTRATÉGIA SCHNEIDER
// ============================================================================

const SCHNEIDER_MAPEAMENTO: Record<string, string> = {
  // === PREÇO (Prioridade) ===
  'pvp': 'preco_tabela',
  'preco': 'preco_tabela',
  'precio': 'preco_tabela',
  
  // === FAMÍLIA (Todas as variações possíveis) ===
  'actividad': 'familia', 
  'actividade': 'familia',
  'familia': 'familia',
  'fam': 'familia',
  'fam.': 'familia',
  'family': 'familia',

  // === IDENTIFICAÇÃO ===
  'referência': 'referencia',
  'referencia': 'referencia',
  'ref': 'referencia',
  'ref.': 'referencia',
  'ean-13': 'ean',
  'ean': 'ean',
  
  // === DESCRITIVOS ===
  'descrição': 'descricao',
  'descricao': 'descricao',
  
  // === OUTROS ===
  'cod mpg': 'grupo_desconto',
  'mpg': 'grupo_desconto',
  'unidad': 'unidade',
  'unidade': 'unidade',
  'un': 'unidade',
  'quantidade indivisible': 'quantidade_minima',
  'quantidade': 'quantidade_minima',
  'peso bruto': 'peso',
  'peso': 'peso'
};

export const SchneiderStrategy: MarcaConfig = {
  id: 1,
  nome: 'Schneider Electric',
  sheetName: 'TP', 
  colunaMap: SCHNEIDER_MAPEAMENTO
};