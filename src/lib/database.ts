import { SupabaseClient } from '@supabase/supabase-js';
import { Componente, ImportResult, ProcessingStatus, HistoricoPreco, Marca } from '../types';

const BATCH_SIZE = 1000; 

export async function getMarcas(client: SupabaseClient): Promise<Marca[]> {
  const { data, error } = await client
    .from('tblmarca')
    .select('*')
    .order('nome');

  if (error) {
    console.error('Erro getMarcas:', error);
    return [];
  }
  return data || [];
}

export async function inserirComponentes(
  client: SupabaseClient,
  componentes: Componente[],
  onProgress?: (status: ProcessingStatus) => void
): Promise<ImportResult> {
  const result: ImportResult = { sucesso: 0, erros: 0, mensagens: [] };

  if (componentes.length === 0) return result;

  const totalBatches = Math.ceil(componentes.length / BATCH_SIZE);

  for (let i = 0; i < componentes.length; i += BATCH_SIZE) {
    const batch = componentes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    onProgress?.({
      fase: 'inserindo',
      progresso: 80 + Math.floor((batchNum / totalBatches) * 20),
      mensagem: `A enviar lote ${batchNum}/${totalBatches}...`,
      total: componentes.length,
      atual: i + batch.length
    });

    try {
      const dadosBD = batch.map(c => ({
        idmarca: c.idmarca,
        referencia: c.referencia,
        descricao: c.descricao,
        familia: c.familia,
        ean: c.ean,
        preco_tabela: c.preco_tabela,
        grupo_desconto: c.grupo_desconto,
        unidade: c.unidade || 'UN',
        quantidade_minima: c.quantidade_minima,
        peso: c.peso,
        updated_at: new Date().toISOString()
      }));

      const { error } = await client
        .from('tblcomponentes')
        .upsert(dadosBD, { 
          onConflict: 'idmarca, referencia',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`Erro Lote ${batchNum}:`, error.message);
        result.erros += batch.length;
        if (result.mensagens.length < 10) {
            result.mensagens.push(`Erro Lote ${batchNum}: ${error.message}`);
        }
      } else {
        result.sucesso += batch.length;
      }

    } catch (err) {
      console.error('Erro de rede:', err);
      result.erros += batch.length;
    }
  }

  onProgress?.({
    fase: 'concluido',
    progresso: 100,
    mensagem: `Envio terminado. ${result.sucesso} OK.`,
    total: componentes.length,
    atual: componentes.length
  });

  return result;
}

// === FUNÇÕES DE LEITURA (COM ORDENAÇÃO SERVER-SIDE) ===

export async function contarComponentes(client: SupabaseClient, idmarca?: number) {
  let query = client.from('tblcomponentes').select('*', { count: 'exact', head: true });
  if (idmarca) query = query.eq('idmarca', idmarca);
  const { count } = await query;
  return count || 0;
}

export async function listarComponentes(
  client: SupabaseClient, 
  page = 1, 
  perPage = 50, 
  idmarca?: number, 
  pesquisa?: string,
  sortField: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ data: Componente[]; total: number }> {
  const offset = (page - 1) * perPage;
  let query = client.from('tblcomponentes').select('*', { count: 'exact' });
  
  if (idmarca) query = query.eq('idmarca', idmarca);
  if (pesquisa) query = query.or(`referencia.ilike.%${pesquisa}%,descricao.ilike.%${pesquisa}%`);

  // Aplica a ordenação dinâmica na query SQL
  const { data, count, error } = await query
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(offset, offset + perPage - 1);

  if (error) return { data: [], total: 0 };
  return { data: data || [], total: count || 0 };
}

// === HISTÓRICO ===

export async function contarComponentesHistorico(client: SupabaseClient, idmarca?: number) {
  let query = client.from('tblcomponenteshistorico').select('*', { count: 'exact', head: true });
  if (idmarca) query = query.eq('idmarca', idmarca);
  const { count } = await query;
  return count || 0;
}

export async function listarComponentesHistorico(
  client: SupabaseClient,
  pagina = 1,
  porPagina = 50,
  idmarca?: number,
  pesquisa?: string,
  sortField: string = 'valido_ate',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ data: HistoricoPreco[]; total: number }> {
  const offset = (pagina - 1) * porPagina;
  
  let query = client
    .from('tblcomponenteshistorico')
    .select('idmarca, referencia_backup, precoatual_anterior, valido_ate', { count: 'exact' });

  if (idmarca) query = query.eq('idmarca', idmarca);
  if (pesquisa) query = query.ilike('referencia_backup', `%${pesquisa}%`);

  // Aplica a ordenação dinâmica na query SQL
  const { data, count, error } = await query
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(offset, offset + porPagina - 1);

  if (error) {
    console.error("Erro histórico:", error);
    return { data: [], total: 0 };
  }
  return { data: (data || []) as HistoricoPreco[], total: count || 0 };
}