import { useState, useEffect } from 'react';
import { Search, RefreshCw, Package, ChevronLeft, ChevronRight, AlertTriangle, X, ArrowUp, ArrowDown } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { listarComponentes, contarComponentes } from '../lib/database';
import { buscarMarcas } from '../lib/supabase';
import { Componente, Marca } from '../types';

interface Props {
  supabaseClient: SupabaseClient;
  refreshTrigger: number;
}

export type SortField = 'referencia' | 'descricao' | 'preco_tabela' | 'updated_at' | 'unidade' | 'grupo_desconto' | 'idmarca';
export type SortOrder = 'asc' | 'desc';

export function TabelaComponentes({ supabaseClient, refreshTrigger }: Props) {
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const [marcaSelecionada, setMarcaSelecionada] = useState<number | undefined>(undefined);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [contagens, setContagens] = useState<Record<number, number>>({});
  
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [dataMaisRecenteGlobal, setDataMaisRecenteGlobal] = useState<string | null>(null);

  const porPagina = 20;

  useEffect(() => {
    carregarMarcas();
    verificarDataMaisRecente();
  }, [supabaseClient, refreshTrigger]);

  useEffect(() => {
    carregarDados();
    carregarContagens();
  }, [supabaseClient, pagina, pesquisa, marcaSelecionada, refreshTrigger, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRefresh = () => {
    setSortField('updated_at');
    setSortOrder('desc');
    setPagina(1);
    setPesquisa('');
    verificarDataMaisRecente();
  };

  const carregarMarcas = async () => {
    const marcasDB = await buscarMarcas(supabaseClient);
    setMarcas(marcasDB);
  };

  const verificarDataMaisRecente = async () => {
    try {
      const { data } = await supabaseClient
        .from('tblcomponentes')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) setDataMaisRecenteGlobal(data.updated_at);
    } catch (err) {
      console.error('Erro data recente:', err);
    }
  };

  const carregarContagens = async () => {
    const novasContagens: Record<number, number> = {};
    for (const marca of marcas) {
      novasContagens[marca.idmarca] = await contarComponentes(supabaseClient, marca.idmarca);
    }
    setContagens(novasContagens);
  };

  const carregarDados = async () => {
    setLoading(true);
    // Chama a função atualizada que aceita os argumentos de ordenação
    const { data, total: totalCount } = await listarComponentes(
      supabaseClient, 
      pagina, 
      porPagina, 
      marcaSelecionada, 
      pesquisa,
      sortField, 
      sortOrder  
    );
    setComponentes(data);
    setTotal(totalCount);
    setLoading(false);
  };

  const isProdutoAntigo = (dataProduto?: string) => {
    if (!dataProduto || !dataMaisRecenteGlobal) return false;
    const dataRef = new Date(dataMaisRecenteGlobal).getTime();
    const dataProd = new Date(dataProduto).getTime();
    return (dataRef - dataProd) > (10 * 60 * 1000); // 10 min tolerância
  };

  const totalPaginas = Math.ceil(total / porPagina);

  const getNomeMarca = (idmarca: number) => {
    const marca = marcas.find(m => m.idmarca === idmarca);
    return marca?.nome || `Marca ${idmarca}`;
  };

  const formatarPreco = (preco: number | null) => {
    if (preco === null) return '—';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(preco);
  };

  const formatarData = (data: string | undefined) => {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Header style - sem verde nojento
  const thBase = "px-4 py-3 text-xs font-semibold uppercase cursor-pointer select-none group transition-colors border-b border-[#30363d] hover:text-[#f0f6fc]";
  const thContent = "flex items-center justify-center gap-1";

  const renderSortIcon = (field: SortField) => {
    const active = sortField === field;
    return (
      <span className={`flex flex-col items-center justify-center w-3 h-3 transition-opacity ${active ? 'opacity-100' : 'opacity-20 group-hover:opacity-50'}`}>
        {active && sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#208080]" /> : 
         active && sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-[#208080]" /> : 
         <div className="flex flex-col"><ArrowUp className="w-2 h-2" /><ArrowDown className="w-2 h-2" /></div>}
      </span>
    );
  };

  return (
    <motion.div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="p-5" style={{ borderBottom: '1px solid #30363d' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
              <Package className="w-6 h-6" style={{ color: '#208080' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Componentes</h2>
              <p className="text-sm" style={{ color: '#8b949e' }}>{total.toLocaleString()} registos</p>
            </div>
          </div>
          <motion.button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#8b949e] transition-colors"
            title="Limpar Filtros e Atualizar"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <motion.button
            onClick={() => { setMarcaSelecionada(undefined); setPagina(1); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: marcaSelecionada === undefined ? '#208080' : '#21262d',
              color: marcaSelecionada === undefined ? '#0d1117' : '#8b949e',
              border: '1px solid ' + (marcaSelecionada === undefined ? '#208080' : '#30363d')
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Todas
          </motion.button>
          {marcas.map(marca => (
            <motion.button
              key={marca.idmarca}
              onClick={() => { setMarcaSelecionada(marca.idmarca); setPagina(1); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{
                backgroundColor: marcaSelecionada === marca.idmarca ? '#208080' : '#21262d',
                color: marcaSelecionada === marca.idmarca ? '#0d1117' : '#8b949e',
                border: '1px solid ' + (marcaSelecionada === marca.idmarca ? '#208080' : '#30363d')
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {marca.nome}
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                {contagens[marca.idmarca] || 0}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e7681]" />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => { setPesquisa(e.target.value); setPagina(1); }}
            placeholder="Pesquisar por referência ou descrição..."
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm focus:outline-none bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] focus:border-[#208080] transition-colors"
          />
          {pesquisa && (
            <button
              onClick={() => { setPesquisa(''); setPagina(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#0d1117]">
            <tr>
              <th onClick={() => handleSort('referencia')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Referência {renderSortIcon('referencia')}</div>
              </th>
              <th onClick={() => handleSort('descricao')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Descrição {renderSortIcon('descricao')}</div>
              </th>
              <th onClick={() => handleSort('idmarca')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Marca {renderSortIcon('idmarca')}</div>
              </th>
              <th onClick={() => handleSort('grupo_desconto')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Grupo Desconto {renderSortIcon('grupo_desconto')}</div>
              </th>
              <th onClick={() => handleSort('preco_tabela')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Preço {renderSortIcon('preco_tabela')}</div>
              </th>
              <th onClick={() => handleSort('unidade')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Unidade {renderSortIcon('unidade')}</div>
              </th>
              <th onClick={() => handleSort('updated_at')} className={`${thBase} text-[#8b949e]`}>
                <div className={thContent}>Atualizado {renderSortIcon('updated_at')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#8b949e]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-[2.5px] border-[#30363d] border-t-[#208080] animate-spin" />
                      <span className="text-sm">A carregar componentes...</span>
                    </div>
                  </td>
                </motion.tr>
              ) : componentes.length === 0 ? (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#6e7681]">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Nenhum componente encontrado</p>
                  </td>
                </motion.tr>
              ) : (
                componentes.map((comp, index) => {
                  const isRisk = isProdutoAntigo(comp.updated_at);
                  
                  return (
                    <motion.tr
                      key={comp.idcomponente}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.01 }}
                      className="hover:bg-[#1c2128] transition-colors border-b border-[#21262d]"
                    >
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-mono text-sm font-medium ${isRisk ? 'text-red-400/80' : 'text-[#2aa0a0]'}`}>
                            {comp.referencia}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm line-clamp-2 ${isRisk ? 'text-[#8b949e]' : 'text-[#f0f6fc]'}`}>
                          {comp.descricao || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2 py-1 rounded-md font-medium bg-[#208080]/10 text-[#208080]">
                          {getNomeMarca(comp.idmarca)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-[#8b949e]">{comp.grupo_desconto || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium tabular-nums ${isRisk ? 'text-red-300/60' : 'text-[#f0f6fc]'}`}>
                          {formatarPreco(comp.preco_tabela)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-[#8b949e]">{comp.unidade || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-xs tabular-nums px-2 py-1 rounded ${isRisk ? 'text-red-400/70 font-medium' : 'text-[#6e7681]'}`}>
                            {formatarData(comp.updated_at)}
                          </span>
                          {/* ALERTA SUBTIL */}
                          {isRisk && (
                            <div className="relative group" title="Risco: Dados antigos">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500/60 cursor-help hover:text-red-500 transition-colors" />
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="px-5 py-3 flex items-center justify-between border-t border-[#30363d] bg-[#0d1117]">
          <p className="text-sm text-[#8b949e]">
            {((pagina - 1) * porPagina) + 1}–{Math.min(pagina * porPagina, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="p-2 rounded-lg bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:border-[#208080] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm px-2 tabular-nums text-[#8b949e]">
              {pagina} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="p-2 rounded-lg bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:border-[#208080] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}