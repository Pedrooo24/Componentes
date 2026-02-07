import { useState, useEffect } from 'react';
import { Search, RefreshCw, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { listarComponentes, contarComponentes } from '../lib/database';
import { buscarMarcas } from '../lib/supabase';
import { Componente, Marca } from '../types';

interface Props {
  supabaseClient: SupabaseClient;
  refreshTrigger: number;
}

export function TabelaComponentes({ supabaseClient, refreshTrigger }: Props) {
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const [marcaSelecionada, setMarcaSelecionada] = useState<number | undefined>(undefined);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [contagens, setContagens] = useState<Record<number, number>>({});

  const porPagina = 20;

  useEffect(() => {
    carregarMarcas();
  }, [supabaseClient]);

  useEffect(() => {
    carregarDados();
    carregarContagens();
  }, [supabaseClient, pagina, pesquisa, marcaSelecionada, refreshTrigger]);

  const carregarMarcas = async () => {
    const marcasDB = await buscarMarcas(supabaseClient);
    setMarcas(marcasDB);
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
    const { data, total: totalCount } = await listarComponentes(
      supabaseClient, pagina, porPagina, marcaSelecionada, pesquisa
    );
    setComponentes(data);
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

  const thStyle: React.CSSProperties = {
    color: '#8b949e',
    borderBottom: '1px solid #30363d',
    letterSpacing: '0.05em',
    textAlign: 'center',
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
              <Package className="w-6 h-6" style={{ color: '#208080' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Componentes</h2>
              <p className="text-sm" style={{ color: '#8b949e' }}>{total.toLocaleString()} registos</p>
            </div>
          </div>
          <motion.button
            onClick={() => { carregarDados(); carregarContagens(); }}
            className="p-2 rounded-lg"
            title="Atualizar"
            style={{ color: '#8b949e' }}
            whileHover={{ backgroundColor: '#21262d' }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-4">
          <motion.button
            onClick={() => { setMarcaSelecionada(undefined); setPagina(1); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
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
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
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
                style={{
                  backgroundColor: marcaSelecionada === marca.idmarca ? 'rgba(0,0,0,0.2)' : '#30363d',
                  color: marcaSelecionada === marca.idmarca ? '#0d1117' : '#6e7681'
                }}
              >
                {contagens[marca.idmarca] || 0}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#6e7681' }} />
          <motion.input
            type="text"
            value={pesquisa}
            onChange={(e) => { setPesquisa(e.target.value); setPagina(1); }}
            placeholder="Pesquisar por referência ou descrição..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none"
            style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc' }}
            whileFocus={{ borderColor: '#208080', boxShadow: '0 0 0 2px rgba(32, 128, 128, 0.2)' }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ backgroundColor: '#0d1117' }}>
            <tr>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Referência</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Descrição</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Marca</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Família</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Preço</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Unidade</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={thStyle}>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#8b949e' }}>
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        className="w-8 h-8 rounded-full"
                        style={{ border: '2.5px solid #30363d', borderTopColor: '#208080' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <span className="text-sm">A carregar componentes...</span>
                    </div>
                  </td>
                </motion.tr>
              ) : componentes.length === 0 ? (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#6e7681' }}>
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Nenhum componente encontrado</p>
                  </td>
                </motion.tr>
              ) : (
                componentes.map((comp, index) => (
                  <motion.tr
                    key={comp.idcomponente}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.015 }}
                    className="table-row-hover"
                    style={{ borderBottom: '1px solid #21262d' }}
                  >
                    <td className="px-4 py-3 text-left">
                      <span className="font-mono text-sm font-medium" style={{ color: '#2aa0a0' }}>{comp.referencia}</span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="text-sm line-clamp-2" style={{ color: '#f0f6fc' }}>{comp.descricao || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-xs px-2 py-1 rounded-md font-medium"
                        style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)', color: '#208080' }}
                      >
                        {getNomeMarca(comp.idmarca)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm" style={{ color: '#8b949e' }}>{comp.familia || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium tabular-nums" style={{ color: '#f0f6fc' }}>{formatarPreco(comp.preco_tabela)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm" style={{ color: '#8b949e' }}>{comp.unidade || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs tabular-nums" style={{ color: '#6e7681' }}>{formatarData(comp.updated_at)}</span>
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
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
          <p className="text-sm" style={{ color: '#8b949e' }}>
            {((pagina - 1) * porPagina) + 1}–{Math.min(pagina * porPagina, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
              whileHover={pagina !== 1 ? { scale: 1.05, borderColor: '#208080' } : {}}
              whileTap={pagina !== 1 ? { scale: 0.95 } : {}}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <span className="text-sm px-2 tabular-nums" style={{ color: '#8b949e' }}>
              {pagina} / {totalPaginas}
            </span>
            <motion.button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
              whileHover={pagina !== totalPaginas ? { scale: 1.05, borderColor: '#208080' } : {}}
              whileTap={pagina !== totalPaginas ? { scale: 0.95 } : {}}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
