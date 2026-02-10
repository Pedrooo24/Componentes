import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Marca } from '../types';
import { supabaseConfig } from './config';

// Cliente Singleton
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true, // Agora queremos persistência!
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Factory para criar cliente Supabase dinâmico (usado no SetupPage) */
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}


function hintRLS(table: string): string {
  return `Se tens dados mas a app devolve 0 linhas, é muito provável ser RLS/policies. Confirma que a role anon consegue SELECT em ${table}.`;
}

export type TesteConexaoResult = {
  sucesso: boolean;
  mensagem: string;
  marcasVisiveis?: number;
  componentesVisiveis?: number;
};

// Função para testar a conexão (validação REAL)
// Critério: conseguir ler a tblmarca (porque a app depende dela) e conseguir consultar tblcomponentes.
export async function testarConexao(client: SupabaseClient): Promise<TesteConexaoResult> {
  try {
    // 1) Validar tblmarca (essencial)
    // Usamos um SELECT real (não HEAD) para evitar falsos “0”/timing e validar de facto a leitura.
    const marcasRes = await client
      .from('tblmarca')
      .select('idmarca, nome')
      .limit(5);

    if (marcasRes.error) {
      return {
        sucesso: false,
        mensagem: `Não foi possível ler tblmarca: ${marcasRes.error.message}. ${hintRLS('tblmarca')}`,
      };
    }

    const marcasVisiveis = marcasRes.data?.length ?? 0;

    // Se não houver marcas visíveis, para este caso de uso consideramos a conexão “não pronta”.
    // Isto evita “conectar com sucesso” mas depois não conseguir escolher marca.
    if (marcasVisiveis === 0) {
      return {
        sucesso: false,
        mensagem: `Conexão OK, mas 0 marcas visíveis em tblmarca. Verifica se tens registos e/ou RLS/policies. ${hintRLS('tblmarca')}`,
        marcasVisiveis: 0,
      };
    }

    // 2) Validar tblcomponentes (pode estar vazia — isso é ok)
    const componentesRes = await client
      .from('tblcomponentes')
      .select('idcomponente')
      .limit(1);

    if (componentesRes.error) {
      return {
        sucesso: false,
        mensagem: `Não foi possível consultar tblcomponentes: ${componentesRes.error.message}. ${hintRLS('tblcomponentes')}`,
        marcasVisiveis,
      };
    }

    return {
      sucesso: true,
      mensagem: `Conectado com sucesso! Marcas visíveis (amostra): ${marcasVisiveis}.`,
      marcasVisiveis,
      componentesVisiveis: (componentesRes.data?.length ?? 0),
    };
  } catch (e) {
    return {
      sucesso: false,
      mensagem: `Erro: ${e instanceof Error ? e.message : 'Desconhecido'}`,
    };
  }
}

export type BuscarMarcasResult = {
  data: Marca[];
  error: string | null;
  count: number;
};

// Buscar marcas da tabela tblmarca (com detalhe de erro)
export async function buscarMarcasResult(client: SupabaseClient): Promise<BuscarMarcasResult> {
  try {
    const { data, error, count } = await client
      .from('tblmarca')
      .select('idmarca, nome', { count: 'exact' })
      .order('nome');

    if (error) {
      return {
        data: [],
        error: `${error.message}. ${hintRLS('tblmarca')}`,
        count: 0,
      };
    }

    return {
      data: data || [],
      error: null,
      count: count || 0,
    };
  } catch (e) {
    return {
      data: [],
      error: `${e instanceof Error ? e.message : 'Erro desconhecido'}. ${hintRLS('tblmarca')}`,
      count: 0,
    };
  }
}

// Backwards-compatible (mantém assinatura antiga)
export async function buscarMarcas(client: SupabaseClient): Promise<Marca[]> {
  const res = await buscarMarcasResult(client);
  if (res.error) console.error('Erro ao buscar marcas:', res.error);
  return res.data;
}

/** Grava configuração Supabase em localStorage para persistência entre sessões */
export function saveSupabaseConfig(config: { url: string; anonKey: string }): void {
  try {
    localStorage.setItem('supabase_config', JSON.stringify(config));
  } catch (err) {
    console.error('Erro ao guardar configuração Supabase:', err);
  }
}

/** Lê configuração Supabase de localStorage */
export function loadSupabaseConfig(): { url: string; anonKey: string } | null {
  try {
    const raw = localStorage.getItem('supabase_config');
    if (!raw) return null;
    const config = JSON.parse(raw);
    if (config && typeof config.url === 'string' && typeof config.anonKey === 'string') {
      return config;
    }
    return null;
  } catch {
    return null;
  }
}
