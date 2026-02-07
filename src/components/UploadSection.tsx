import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, Clipboard, Percent, Package } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarcaConfig } from '../config/marcas';
import { processarExcel } from '../lib/excelProcessor';
import { inserirComponentes, upsertDescontos } from '../lib/database';
import { buscarMarcasResult } from '../lib/supabase';
import { ProcessingStatus, ImportResult, Marca, Desconto } from '../types';
import { MarcaModal } from './MarcaModal';
import { AnimatedBorder } from './effects';

interface FicheiroInfo {
  file: File;
  marca: Marca | null;
  status: 'aguardando_marca' | 'pendente' | 'processando' | 'sucesso' | 'erro';
  resultado?: ImportResult;
  erroMensagem?: string;
  processingStatus?: ProcessingStatus;
}

interface Props {
  supabaseClient: SupabaseClient;
  onImportCompleta: () => void;
}

type TipoImportacao = 'precos' | 'descontos';

export function UploadSection({ supabaseClient, onImportCompleta }: Props) {
  const [tipoImportacao, setTipoImportacao] = useState<TipoImportacao>('precos');
  
  // Estados para Upload de Preços
  const [ficheiros, setFicheiros] = useState<FicheiroInfo[]>([]);
  const [processando, setProcessando] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [ficheiroParaModal, setFicheiroParaModal] = useState<number | null>(null);
  
  // Estados para Descontos (Paste)
  const [textoDescontos, setTextoDescontos] = useState('');
  const [marcaDesconto, setMarcaDesconto] = useState<number | null>(null);
  const [statusDesconto, setStatusDesconto] = useState<'idle' | 'processando' | 'sucesso' | 'erro'>('idle');
  const [resultadoDesconto, setResultadoDesconto] = useState<{total: number} | null>(null);
  const [erroDesconto, setErroDesconto] = useState<string | null>(null);

  // Comuns
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    carregarMarcas();
  }, [supabaseClient]);

  const carregarMarcas = async () => {
    const res = await buscarMarcasResult(supabaseClient);
    setMarcas(res.data);
    
    // Auto-select primeira marca para descontos se existir
    if (res.data.length > 0 && !marcaDesconto) {
      setMarcaDesconto(res.data[0].idmarca);
    }
  };

  // --- LÓGICA DE UPLOAD DE FICHEIROS (PREÇOS) ---
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (tipoImportacao !== 'precos') return;
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    adicionarFicheiros(files);
  }, [tipoImportacao]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) adicionarFicheiros(Array.from(e.target.files));
  };

  const adicionarFicheiros = (files: File[]) => {
    files.forEach((file, index) => {
      const novoFicheiro: FicheiroInfo = { file, marca: null, status: 'aguardando_marca' };
      setFicheiros(prev => {
        const novaLista = [...prev, novoFicheiro];
        setTimeout(() => { setFicheiroParaModal(prev.length + index); setModalOpen(true); }, 100 * index);
        return novaLista;
      });
    });
  };

  const processarTodos = async () => {
    setProcessando(true);
    for (let i = 0; i < ficheiros.length; i++) {
      const ficheiro = ficheiros[i];
      if (ficheiro.status !== 'pendente' || !ficheiro.marca) continue;

      setFicheiros(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processando' as const } : f));

      try {
        const marcaConfig = getMarcaConfig(ficheiro.marca.idmarca);
        if (!marcaConfig) throw new Error('Configuração de mapeamento não encontrada para esta marca');

        const { componentes, erros } = await processarExcel(
          ficheiro.file, marcaConfig, ficheiro.marca.idmarca,
          (status) => { setFicheiros(prev => prev.map((f, idx) => idx === i ? { ...f, processingStatus: status } : f)); }
        );

        if (componentes.length === 0) throw new Error(erros.join('; ') || 'Nenhum componente encontrado');

        const resultado = await inserirComponentes(supabaseClient, componentes,
          (status) => { setFicheiros(prev => prev.map((f, idx) => idx === i ? { ...f, processingStatus: status } : f)); }
        );

        resultado.mensagens = [...erros, ...resultado.mensagens];
        setFicheiros(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: resultado.erros > 0 ? 'erro' as const : 'sucesso' as const, resultado } : f
        ));
      } catch (error) {
        setFicheiros(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'erro' as const, erroMensagem: error instanceof Error ? error.message : 'Erro desconhecido' } : f
        ));
      }
    }
    setProcessando(false);
    onImportCompleta();
  };

  // --- LÓGICA DE PASTE (DESCONTOS) ---
  const processarPasteDescontos = async () => {
    if (!marcaDesconto || !textoDescontos.trim()) return;
    
    setStatusDesconto('processando');
    setErroDesconto(null);

    try {
      const linhas = textoDescontos.trim().split('\n');
      const descontosParaInserir: Desconto[] = [];
      
      linhas.forEach((linha) => {
        // Assume separado por TAB (comportamento padrão Excel copy/paste)
        const cols = linha.split('\t');
        if (cols.length < 2) return; // Ignora linhas inválidas

        const grupo = cols[0].trim();
        // Limpa percentagens, vírgulas, símbolos de moeda
        const valorStr = cols[1].replace('%', '').replace('€', '').replace(',', '.').trim();
        let valor = parseFloat(valorStr);

        // Correção automática de decimais (se vier 0.71 converte para 71)
        if (!isNaN(valor)) {
            if (valor <= 1 && valor > 0) {
                valor = valor * 100;
            }
        }

        if (grupo && !isNaN(valor)) {
          descontosParaInserir.push({
            idmarca: marcaDesconto,
            grupo_desconto: grupo,
            valor_desconto: valor,
            updated_at: new Date().toISOString()
          });
        }
      });

      if (descontosParaInserir.length === 0) {
        throw new Error("Não foram encontrados dados válidos. Certifica-te que copiaste 2 colunas do Excel (Grupo | Desconto).");
      }

      const res = await upsertDescontos(supabaseClient, descontosParaInserir);
      
      if (!res.sucesso) throw new Error(res.msg);

      setStatusDesconto('sucesso');
      setResultadoDesconto({ total: descontosParaInserir.length });
      setTextoDescontos(''); // Limpar após sucesso
      onImportCompleta();

    } catch (err) {
      setStatusDesconto('erro');
      setErroDesconto(err instanceof Error ? err.message : 'Erro ao processar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Switcher de Tipo de Importação */}
      <div className="flex p-1 rounded-lg bg-[#161b22] border border-[#30363d] w-fit mx-auto">
        <button
          onClick={() => setTipoImportacao('precos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tipoImportacao === 'precos' 
              ? 'bg-[#208080] text-white shadow-lg' 
              : 'text-[#8b949e] hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Importar Preços
        </button>
        <button
          onClick={() => setTipoImportacao('descontos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tipoImportacao === 'descontos' 
              ? 'bg-[#208080] text-white shadow-lg' 
              : 'text-[#8b949e] hover:text-white'
          }`}
        >
          <Percent className="w-4 h-4" />
          Importar Descontos
        </button>
      </div>

      <motion.div
        className="rounded-xl p-6"
        style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={tipoImportacao} // Força re-render animação
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
            {tipoImportacao === 'precos' ? (
              <Upload className="w-6 h-6" style={{ color: '#208080' }} />
            ) : (
              <Clipboard className="w-6 h-6" style={{ color: '#208080' }} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>
              {tipoImportacao === 'precos' ? 'Upload de Ficheiros Excel' : 'Colar Tabela de Descontos'}
            </h2>
            <p className="text-sm" style={{ color: '#8b949e' }}>
              {tipoImportacao === 'precos' 
                ? 'Arrasta ficheiros de tabelas de preços dos fornecedores' 
                : 'Copia do Excel (Código MPG | Desconto) e cola aqui'}
            </p>
          </div>
        </div>

        {tipoImportacao === 'precos' ? (
          /* ================= MODO PREÇOS (EXISTENTE) ================= */
          <>
            <AnimatedBorder isActive={isDragging}>
              <motion.div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input')?.click()}
                className="rounded-lg p-8 text-center cursor-pointer"
                style={{ backgroundColor: '#0d1117' }}
                animate={{ backgroundColor: isDragging ? 'rgba(32, 128, 128, 0.08)' : '#0d1117' }}
                whileHover={{ backgroundColor: 'rgba(32, 128, 128, 0.04)' }}
              >
                <motion.div animate={{ scale: isDragging ? 1.1 : 1, color: isDragging ? '#208080' : '#6e7681' }}>
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3" />
                </motion.div>
                <p className="font-medium" style={{ color: '#f0f6fc' }}>
                  {isDragging ? 'Larga o ficheiro aqui!' : 'Arrasta ficheiros Excel aqui'}
                </p>
                <p className="text-sm mt-1" style={{ color: '#6e7681' }}>ou clica para selecionar (.xlsx, .xls)</p>
                <input id="file-input" type="file" multiple accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
              </motion.div>
            </AnimatedBorder>

            {/* Lista de Ficheiros (mesmo código anterior) */}
            <AnimatePresence>
              {ficheiros.length > 0 && (
                <div className="mt-4 space-y-2">
                   {ficheiros.map((ficheiro, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[#21262d] border border-[#30363d]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex-1">
                        <p className="text-sm text-[#f0f6fc]">{ficheiro.file.name}</p>
                        <div className="flex gap-2 text-xs mt-1">
                           {ficheiro.marca && <span className="text-[#208080]">{ficheiro.marca.nome}</span>}
                           {ficheiro.status === 'aguardando_marca' && (
                             <button onClick={() => { setFicheiroParaModal(index); setModalOpen(true); }} className="text-[#f97316] hover:underline">
                               Selecionar Marca
                             </button>
                           )}
                           {ficheiro.status === 'sucesso' && <span className="text-[#208080]">Concluído</span>}
                           {ficheiro.status === 'erro' && <span className="text-[#ef4444]">{ficheiro.erroMensagem}</span>}
                        </div>
                         {/* Barra Progresso */}
                         {ficheiro.processingStatus && ficheiro.status === 'processando' && (
                          <div className="mt-2 h-1 bg-[#30363d] rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-[#3b82f6]" 
                              initial={{ width: 0 }}
                              animate={{ width: `${ficheiro.processingStatus.progresso}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Botão Remover se não estiver a processar */}
                      {ficheiro.status !== 'processando' && (
                        <button onClick={() => setFicheiros(prev => prev.filter((_, i) => i !== index))} className="p-1 hover:text-[#ef4444]">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                   ))}
                </div>
              )}
            </AnimatePresence>

            {ficheiros.some(f => f.status === 'pendente') && (
              <motion.button
                onClick={processarTodos}
                disabled={processando}
                className="mt-4 w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2 bg-[#208080] text-[#f0f6fc]"
                whileTap={{ scale: 0.98 }}
              >
                {processando ? <Loader2 className="animate-spin" /> : 'Processar Ficheiros'}
              </motion.button>
            )}
          </>
        ) : (
          /* ================= MODO DESCONTOS (NOVO) ================= */
          <div className="space-y-4">
            {/* Seletor de Marca */}
            <div>
              <label className="block text-sm font-medium mb-2 text-[#f0f6fc]">1. Seleciona a Marca</label>
              <div className="flex gap-2 flex-wrap">
                {marcas.map(marca => (
                  <button
                    key={marca.idmarca}
                    onClick={() => { setMarcaDesconto(marca.idmarca); setStatusDesconto('idle'); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      marcaDesconto === marca.idmarca 
                        ? 'bg-[#208080] border-[#208080] text-[#0d1117]' 
                        : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#208080]'
                    }`}
                  >
                    {marca.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Área de Paste */}
            <div>
              <label className="block text-sm font-medium mb-2 text-[#f0f6fc]">2. Cola a tabela do Excel</label>
              <p className="text-xs text-[#8b949e] mb-2">Formato esperado: 2 colunas (Código MPG | Desconto)</p>
              <textarea
                value={textoDescontos}
                onChange={(e) => { setTextoDescontos(e.target.value); setStatusDesconto('idle'); }}
                placeholder={`Exemplo:\nMPG001\t35\nMPG002\t35,5\nMPG003\t42`}
                className="w-full h-48 bg-[#0d1117] border border-[#30363d] rounded-lg p-4 font-mono text-sm text-[#f0f6fc] focus:border-[#208080] focus:ring-1 focus:ring-[#208080]"
              />
            </div>

            {/* Feedback */}
            {statusDesconto === 'sucesso' && (
              <div className="p-3 rounded-lg bg-[#208080]/10 border border-[#208080]/30 text-[#2aa0a0] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Sucesso! {resultadoDesconto?.total} descontos atualizados.</span>
              </div>
            )}
            
            {statusDesconto === 'erro' && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{erroDesconto}</span>
              </div>
            )}

            {/* Ação */}
            <motion.button
              onClick={processarPasteDescontos}
              disabled={!marcaDesconto || !textoDescontos.trim() || statusDesconto === 'processando'}
              className="w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2 bg-[#208080] text-[#f0f6fc] disabled:opacity-50 disabled:cursor-not-allowed"
              whileTap={{ scale: 0.98 }}
            >
              {statusDesconto === 'processando' ? (
                <><Loader2 className="animate-spin w-5 h-5" /> A Processar...</>
              ) : (
                <><Clipboard className="w-5 h-5" /> Importar Descontos</>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>

      <MarcaModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFicheiroParaModal(null); }}
        onSelectMarca={(marca) => {
          if (ficheiroParaModal !== null) {
            setFicheiros(prev => prev.map((f, idx) => idx === ficheiroParaModal ? { ...f, marca, status: 'pendente' } : f));
          }
          setModalOpen(false);
          setFicheiroParaModal(null);
        }}
        marcas={marcas}
        fileName={ficheiroParaModal !== null ? ficheiros[ficheiroParaModal]?.file.name || '' : ''}
      />
    </div>
  );
}