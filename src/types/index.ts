// Tipos base para a aplicação

export interface Componente {
  idcomponente?: number;
  idmarca: number;
  referencia: string;
  descricao: string | null;
  familia: string | null;
  ean: string | null;
  preco_tabela: number | null;
  grupo_desconto: string | null;
  unidade: string | null;
  quantidade_minima: number | null;
  peso: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Marca {
  idmarca: number;
  nome: string;
}

export interface Desconto {
  iddesconto?: number;
  idmarca: number;
  grupo_desconto: string;
  valor_desconto: number;
  updated_at?: string;
}

// Histórico de preços (tblcomponentes_historico)
export interface HistoricoPreco {
  idmarca: number;
  referencia_backup: string;
  precoatual_anterior: number | null;
  valido_ate: string | null;
}

export interface ImportResult {
  sucesso: number;
  erros: number;
  mensagens: string[];
}

export interface ProcessingStatus {
  fase: 'idle' | 'lendo' | 'processando' | 'inserindo' | 'concluido' | 'erro';
  progresso: number;
  mensagem: string;
  total?: number;
  atual?: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// ============================================================================
// NOVOS TIPOS — Upload System v2
// ============================================================================

/** Cenário de desconto detetado a partir dos headers */
export type CenarioDesconto =
  | 'cod_mpg_only'        // Apenas COD MPG → componentes com grupo_desconto
  | 'cod_mpg_e_desconto'  // Ambos → componentes + auto-upsert tbldescontos
  | 'desconto_only';      // Só desconto → auto-gera grupos ("D35")
// NOTA: sem_desconto removido — ficheiro REJEITADO se não tiver headers de desconto

/** Linha ignorada durante o parsing — para review do utilizador */
export interface LinhaIgnorada {
  linhaExcel: number;      // nº da linha original no Excel (1-indexed para user)
  referencia: string | null;
  motivo: string;
}

/** Resultado da validação de headers do ficheiro/texto */
export interface HeaderValidation {
  headersEncontrados: Record<string, number>;   // campo BD → índice coluna
  headersDesconhecidos: string[];               // headers que não mapearam
  headersObrigatoriosEmFalta: string[];
  headersOpcionaisEmFalta: string[];
  cenarioDesconto: CenarioDesconto;
  valido: boolean;
  erros: string[];
  avisos: string[];
  linhaHeader: number;                          // índice da linha de header encontrada
}

/** Dados parsed prontos para upload */
export interface ParsedUploadData {
  componentes: Componente[];
  descontos: Desconto[];                        // auto-gerados nos cenários B e C
  cenarioDesconto: CenarioDesconto;
  totalLinhas: number;
  linhasIgnoradas: number;
  linhasIgnoradasDetalhe: LinhaIgnorada[];       // detalhes para review do user
  erros: string[];
  avisos: string[];
}

/** Dados parsed para upload de descontos standalone */
export interface ParsedDescontosData {
  descontos: Desconto[];
  totalLinhas: number;
  linhasIgnoradas: number;
  erros: string[];
}