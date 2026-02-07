import { useState, useEffect } from 'react';
import { Search, RefreshCw, History, ChevronLeft, ChevronRight, X, ArrowUp, ArrowDown } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { listarComponentesHistorico, contarComponentesHistorico } from '../lib/database';
import { buscarMarcas } from '../lib/supabase';
import { HistoricoPreco, Marca } from '../types';

interface Props {
  supabaseClient: SupabaseClient;
  refreshTrigger: number;
}

type SortField = 'referencia_backup' | 'precoatual_anterior' | 'valido_ate' | 'idmarca';
type SortOrder = 'asc' | 'desc';

export function TabelaHistorico({ supabaseClient, refreshTrigger }: Props) {
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const [marcaSelecionada, setMarcaSelecionada] = useState<number | undefined>(undefined);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [contagens, setContagens] = useState<Record<number, number>>({});

  // Ordenação
  const [sortField, setSortField] = useState<SortField>('valido_ate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const porPagina = 20;

  useEffect(() => {
    carregarMarcas();
  }, [supabaseClient]);

  useEffect(() => {
    carregarDados();
    carregarContagens();
  }, [supabaseClient, pagina, pesquisa, marcaSelecionada, refreshTrigger, sortField, sortOrder, marcas.length]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRefresh = () => {
    setSortField('valido_ate');
    setSortOrder('desc');
    setPagina(1);
    setPesquisa('');
  };

  const carregarMarcas = async () => {
    const marcasDB = await buscarMarcas(supabaseClient);
    setMarcas(marcasDB);
  };

  const carregarContagens = async () => {
    if (marcas.length === 0) return;
    const novasContagens: Record<number, number> = {};
    for (const marca of marcas) {
      novasContagens[marca.idmarca] = await contarComponentesHistorico(supabaseClient, marca.idmarca);
    }
    setContagens(novasContagens);
  };

  const carregarDados = async () => {
    setLoading(true);
    const { data, total: totalCount } = await listarComponentesHistorico(
      supabaseClient, 
      pagina, 
      porPagina, 
      marcaSelecionada, 
      pesquisa,
      sortField,
      sortOrder
    );

    setHistorico(data);
    setTotal(totalCount);
    setLoading(false);
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

  const thBase = "px-6 py-4 text-xs font-semibold uppercase cursor-pointer select-none group transition-colors border-b border-[#30363d] hover:text-[#f0f6fc]";
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
      {/* Header */}
      <div className="p-5" style={{ borderBottom: '1px solid #30363d' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
              <History className="w-6 h-6" style={{ color: '#208080' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Histórico</h2>
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

        {/* Filtros */}
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
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                {contagens[marca.idmarca] || 0}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Pesquisa com 'X' */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e7681]" />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => { setPesquisa(e.target.value); setPagina(1); }}
            placeholder="Pesquisar por referência..."
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

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#0d1117]">
            <tr>
              <th onClick={() => handleSort('referencia_backup')} className={`${thBase} text-[#8b949e] hover:text-[#f0f6fc]`}>
                <div className={thContent}>Referência {renderSortIcon('referencia_backup')}</div>
              </th>
              <th onClick={() => handleSort('idmarca')} className={`${thBase} text-[#8b949e] hover:text-[#f0f6fc]`}>
                <div className={thContent}>Marca {renderSortIcon('idmarca')}</div>
              </th>
              <th onClick={() => handleSort('precoatual_anterior')} className={`${thBase} text-[#8b949e] hover:text-[#f0f6fc]`}>
                <div className={thContent}>Preço Anterior {renderSortIcon('precoatual_anterior')}</div>
              </th>
              <th onClick={() => handleSort('valido_ate')} className={`${thBase} text-[#8b949e] hover:text-[#f0f6fc]`}>
                <div className={thContent}>Válido Até {renderSortIcon('valido_ate')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={4} className="px-4 py-12 text-center text-[#8b949e]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-[2.5px] border-[#30363d] border-t-[#208080] animate-spin" />
                      <span className="text-sm">A carregar histórico...</span>
                    </div>
                  </td>
                </motion.tr>
              ) : historico.length === 0 ? (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={4} className="px-4 py-12 text-center text-[#6e7681]">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Nenhum registo de histórico encontrado</p>
                  </td>
                </motion.tr>
              ) : (
                historico.map((item, idx) => (
                  <motion.tr
                    key={`${item.idmarca}-${item.referencia_backup}-${item.valido_ate ?? idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-[#1c2128] transition-colors border-b border-[#21262d]"
                  >
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-sm font-medium text-[#2aa0a0]">
                        {item.referencia_backup}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs px-2 py-1 rounded-md font-medium bg-[#208080]/10 text-[#208080]">
                        {getNomeMarca(item.idmarca)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium tabular-nums text-[#f0f6fc]">
                        {formatarPreco(item.precoatual_anterior)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs tabular-nums text-[#6e7681]">
                        {formatarData(item.valido_ate ?? undefined)}
                      </span>
                    </td>
                  </motion.tr>
                ))
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