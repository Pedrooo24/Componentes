import { useState, useEffect } from 'react';
import { Percent, RefreshCw, AlertCircle } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { listarDescontos } from '../lib/database';
import { buscarMarcas } from '../lib/supabase';
import { Desconto, Marca } from '../types';

interface Props {
  supabaseClient: SupabaseClient;
  refreshTrigger: number;
}

export function TabelaDescontos({ supabaseClient, refreshTrigger }: Props) {
  const [descontos, setDescontos] = useState<Desconto[]>([]);
  const [loading, setLoading] = useState(false);
  const [marcaSelecionada, setMarcaSelecionada] = useState<number | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  useEffect(() => {
    carregarMarcas();
  }, [supabaseClient]);

  useEffect(() => {
    if (marcaSelecionada) {
      carregarDescontos(marcaSelecionada);
    } else {
      setDescontos([]);
    }
  }, [supabaseClient, marcaSelecionada, refreshTrigger]);

  const carregarMarcas = async () => {
    const marcasDB = await buscarMarcas(supabaseClient);
    // Ordena por ID da marca (Crescente)
    const marcasOrdenadas = marcasDB.sort((a, b) => a.idmarca - b.idmarca);
    setMarcas(marcasOrdenadas);
    
    if (marcasOrdenadas.length > 0 && !marcaSelecionada) {
      setMarcaSelecionada(marcasOrdenadas[0].idmarca);
    }
  };

  const carregarDescontos = async (idmarca: number) => {
    setLoading(true);
    const dados = await listarDescontos(supabaseClient, idmarca);
    setDescontos(dados);
    setLoading(false);
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
              <Percent className="w-6 h-6" style={{ color: '#208080' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Tabela de Descontos</h2>
              <p className="text-sm" style={{ color: '#8b949e' }}>Condições comerciais por Grupo</p>
            </div>
          </div>
          <motion.button
            onClick={() => marcaSelecionada && carregarDescontos(marcaSelecionada)}
            className="p-2 rounded-lg hover:bg-[#21262d] text-[#8b949e] transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Seletor de Marca */}
        <div className="flex gap-2 flex-wrap mb-4">
          {marcas.map(marca => (
            <motion.button
              key={marca.idmarca}
              onClick={() => setMarcaSelecionada(marca.idmarca)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: marcaSelecionada === marca.idmarca ? '#208080' : '#21262d',
                color: marcaSelecionada === marca.idmarca ? '#0d1117' : '#8b949e',
                border: '1px solid ' + (marcaSelecionada === marca.idmarca ? '#208080' : '#30363d')
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {marca.nome}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#0d1117]">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-center text-[#8b949e] border-b border-[#30363d]">Grupo Desconto</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-center text-[#8b949e] border-b border-[#30363d]">Desconto (%)</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-center text-[#8b949e] border-b border-[#30363d]">Última Atualização</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={3} className="px-4 py-12 text-center text-[#8b949e]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-[2.5px] border-[#30363d] border-t-[#208080] animate-spin" />
                      <span className="text-sm">A carregar descontos...</span>
                    </div>
                  </td>
                </motion.tr>
              ) : descontos.length === 0 ? (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={3} className="px-4 py-12 text-center text-[#6e7681]">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Nenhum desconto configurado para esta marca.</p>
                    <p className="text-sm mt-1">Usa o separador Upload para importar.</p>
                  </td>
                </motion.tr>
              ) : (
                descontos.map((item, idx) => {
                  // Lógica de visualização: se for <= 1 (ex: 0.71), multiplica por 100.
                  const valorVisual = item.valor_desconto <= 1 && item.valor_desconto > 0 
                    ? item.valor_desconto * 100 
                    : item.valor_desconto;

                  return (
                    <motion.tr
                      key={item.iddesconto || idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.01 }}
                      className="hover:bg-[#1c2128] transition-colors border-b border-[#21262d]"
                    >
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-sm font-medium text-[#f0f6fc]">
                          {item.grupo_desconto}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-base font-bold text-[#2aa0a0]">
                          {Number(valorVisual).toLocaleString('pt-PT', { maximumFractionDigits: 2 })}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-[#6e7681]">
                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '-'}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}