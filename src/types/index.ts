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

// Histórico de preços (tblcomponentes_historico)
export interface HistoricoPreco {
  idmarca: number;
  referencia_backup: string;
  precoatual_anterior: number | null;
  valido_ate: string | null;
}

export interface MarcaConfig {
  id: number;
  nome: string;
  sheetName: string;
  colunaMap: Record<string, string>;
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
