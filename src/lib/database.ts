import { SupabaseClient } from '@supabase/supabase-js';
import { Componente, ImportResult, ProcessingStatus, HistoricoPreco } from '../types';

const BATCH_SIZE = 100; // Inserir em lotes para melhor performance

export async function inserirComponentes(
  client: SupabaseClient,
  componentes: Componente[],
  onProgress?: (status: ProcessingStatus) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    sucesso: 0,
    erros: 0,
    mensagens: []
  };

  if (componentes.length === 0) {
    result.mensagens.push('Nenhum componente para inserir');
    return result;
  }

  console.log(`[Database] A inserir ${componentes.length} componentes em lotes de ${BATCH_SIZE}...`);

  // Processar em lotes
  const totalLotes = Math.ceil(componentes.length / BATCH_SIZE);
  let errosConsecutivos = 0;
  const MAX_ERROS_CONSECUTIVOS = 5;
  
  for (let i = 0; i < componentes.length; i += BATCH_SIZE) {
    const loteAtual = Math.floor(i / BATCH_SIZE) + 1;
    const lote = componentes.slice(i, i + BATCH_SIZE);

    onProgress?.({
      fase: 'inserindo',
      progresso: 80 + Math.floor((loteAtual / totalLotes) * 18),
      mensagem: `A inserir lote ${loteAtual} de ${totalLotes}...`,
      total: componentes.length,
      atual: i + lote.length
    });

    try {
      // Preparar dados garantindo que unidade nunca é null
      const dadosLote = lote.map(c => ({
        idmarca: c.idmarca,
        referencia: c.referencia,
        descricao: c.descricao,
        familia: c.familia,
        ean: c.ean,
        preco_tabela: c.preco_tabela,
        grupo_desconto: c.grupo_desconto,
        unidade: c.unidade || 'UN', // Garantia extra
        quantidade_minima: c.quantidade_minima,
        peso: c.peso,
        updated_at: new Date().toISOString()
      }));

      // Usar upsert para inserir ou atualizar
      const { error } = await client
        .from('tblcomponentes')
        .upsert(dadosLote, { 
          onConflict: 'referencia,idmarca',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`[Database] Erro no lote ${loteAtual}:`, error.message);
        
        // Se o lote falhar, tenta inserir um a um para salvar o máximo possível
        let sucessosIndividuais = 0;
        let errosIndividuais = 0;
        
        for (const item of dadosLote) {
          const { error: errIndiv } = await client
            .from('tblcomponentes')
            .upsert(item, { 
              onConflict: 'referencia,idmarca',
              ignoreDuplicates: false 
            });
          
          if (errIndiv) {
            errosIndividuais++;
            // Log apenas os primeiros erros para não poluir
            if (errosIndividuais <= 3) {
              console.error(`[Database] Erro na ref "${item.referencia}":`, errIndiv.message);
            }
          } else {
            sucessosIndividuais++;
          }
        }
        
        result.sucesso += sucessosIndividuais;
        result.erros += errosIndividuais;
        
        if (errosIndividuais > 0) {
          result.mensagens.push(`Lote ${loteAtual}: ${sucessosIndividuais} ok, ${errosIndividuais} erros`);
          errosConsecutivos++;
        } else {
          errosConsecutivos = 0;
        }
        
      } else {
        result.sucesso += lote.length;
        errosConsecutivos = 0;
        console.log(`[Database] Lote ${loteAtual}/${totalLotes}: ${lote.length} inseridos com sucesso`);
      }
      
      // Se muitos erros consecutivos, provavelmente há um problema estrutural
      if (errosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
        result.mensagens.push(`PARADO: Muitos erros consecutivos. Verifica o mapeamento.`);
        break;
      }
      
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Desconhecido';
      console.error(`[Database] Exceção no lote ${loteAtual}:`, errMsg);
      result.erros += lote.length;
      result.mensagens.push(`Erro no lote ${loteAtual}: ${errMsg}`);
      errosConsecutivos++;
      
      if (errosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
        result.mensagens.push(`PARADO: Muitos erros consecutivos.`);
        break;
      }
    }
  }

  console.log(`[Database] Concluído: ${result.sucesso} inseridos, ${result.erros} erros`);

  onProgress?.({
    fase: 'concluido',
    progresso: 100,
    mensagem: `Concluído! ${result.sucesso} inseridos, ${result.erros} erros`,
    total: componentes.length,
    atual: componentes.length
  });

  return result;
}

export async function contarComponentes(
  client: SupabaseClient,
  idmarca?: number
): Promise<number> {
  let query = client
    .from('tblcomponentes')
    .select('*', { count: 'exact', head: true });
  
  if (idmarca !== undefined) {
    query = query.eq('idmarca', idmarca);
  }

  const { count } = await query;
  return count || 0;
}

export async function listarComponentes(
  client: SupabaseClient,
  pagina: number = 1,
  porPagina: number = 50,
  idmarca?: number,
  pesquisa?: string
): Promise<{ data: Componente[]; total: number }> {
  const offset = (pagina - 1) * porPagina;
  
  let query = client
    .from('tblcomponentes')
    .select('*', { count: 'exact' });
  
  if (idmarca !== undefined) {
    query = query.eq('idmarca', idmarca);
  }

  if (pesquisa) {
    query = query.or(`referencia.ilike.%${pesquisa}%,descricao.ilike.%${pesquisa}%`);
  }

  const { data, count, error } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + porPagina - 1);

  if (error) {
    console.error('Erro ao listar componentes:', error);
    return { data: [], total: 0 };
  }

  return { data: data || [], total: count || 0 };
}

// ===== Histórico =====
// Nota: esta tabela é populada por SQL. A UI apenas lê os dados.
// Campos relevantes (conforme pedido):
// - referencia_backup
// - precoatual_anterior (último preço)
// - valido_ate (quando deixou de ser válido)

export async function contarComponentesHistorico(
  client: SupabaseClient,
  idmarca?: number
): Promise<number> {
  let query = client
    .from('tblcomponentes_historico')
    .select('*', { count: 'exact', head: true });

  if (idmarca !== undefined) {
    query = query.eq('idmarca', idmarca);
  }

  const { count } = await query;
  return count || 0;
}

export async function listarComponentesHistorico(
  client: SupabaseClient,
  pagina: number = 1,
  porPagina: number = 50,
  idmarca?: number,
  pesquisa?: string
): Promise<{ data: HistoricoPreco[]; total: number }> {
  const offset = (pagina - 1) * porPagina;

  let query = client
    .from('tblcomponentes_historico')
    .select('idmarca, referencia_backup, precoatual_anterior, valido_ate', { count: 'exact' });

  if (idmarca !== undefined) {
    query = query.eq('idmarca', idmarca);
  }

  if (pesquisa) {
    query = query.ilike('referencia_backup', `%${pesquisa}%`);
  }

  const { data, count, error } = await query
    .order('valido_ate', { ascending: false })
    .range(offset, offset + porPagina - 1);

  if (error) {
    console.error('Erro ao listar histórico:', error);
    return { data: [], total: 0 };
  }

  return { data: (data || []) as HistoricoPreco[], total: count || 0 };
}
