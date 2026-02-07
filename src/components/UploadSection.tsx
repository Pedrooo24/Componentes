import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarcaConfig } from '../config/marcas';
import { processarExcel } from '../lib/excelProcessor';
import { inserirComponentes } from '../lib/database';
import { buscarMarcasResult } from '../lib/supabase';
import { ProcessingStatus, ImportResult, Marca } from '../types';
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

export function UploadSection({ supabaseClient, onImportCompleta }: Props) {
  const [ficheiros, setFicheiros] = useState<FicheiroInfo[]>([]);
  const [processando, setProcessando] = useState(false);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(false);
  const [marcasError, setMarcasError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ficheiroParaModal, setFicheiroParaModal] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    carregarMarcas();
  }, [supabaseClient]);

  const carregarMarcas = async () => {
    setMarcasLoading(true);
    setMarcasError(null);
    const res = await buscarMarcasResult(supabaseClient);
    setMarcas(res.data);
    setMarcasError(res.error);
    setMarcasLoading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    adicionarFicheiros(files);
  }, []);

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

  const removerFicheiro = (index: number) => {
    setFicheiros(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectMarca = (marca: Marca) => {
    if (ficheiroParaModal !== null) {
      setFicheiros(prev => prev.map((f, idx) =>
        idx === ficheiroParaModal ? { ...f, marca, status: 'pendente' as const } : f
      ));
    }
    setModalOpen(false);
    setFicheiroParaModal(null);
  };

  const abrirModalParaFicheiro = (index: number) => {
    setFicheiroParaModal(index);
    setModalOpen(true);
  };

  const processarTodos = async () => {
    setProcessando(true);
    for (let i = 0; i < ficheiros.length; i++) {
      const ficheiro = ficheiros[i];
      if (ficheiro.status !== 'pendente' || !ficheiro.marca) continue;

      setFicheiros(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'processando' as const } : f
      ));

      try {
        const marcaConfig = getMarcaConfig(ficheiro.marca.idmarca);
        if (!marcaConfig) throw new Error('Configuração de mapeamento não encontrada para esta marca');

        const { componentes, erros } = await processarExcel(
          ficheiro.file, marcaConfig, ficheiro.marca.idmarca,
          (status) => {
            setFicheiros(prev => prev.map((f, idx) => idx === i ? { ...f, processingStatus: status } : f));
          }
        );

        if (componentes.length === 0) throw new Error(erros.join('; ') || 'Nenhum componente encontrado');

        const resultado = await inserirComponentes(supabaseClient, componentes,
          (status) => {
            setFicheiros(prev => prev.map((f, idx) => idx === i ? { ...f, processingStatus: status } : f));
          }
        );

        if (resultado.erros === componentes.length) {
          throw new Error(`Falha ao inserir todos os registos. ${resultado.mensagens.join(' | ')}`);
        }

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

  const ficheirosPendentes = ficheiros.filter(f => f.status === 'pendente');

  return (
    <>
      <motion.div
        className="rounded-xl p-6"
        style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
            <Upload className="w-6 h-6" style={{ color: '#208080' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Upload de Ficheiros</h2>
            <p className="text-sm" style={{ color: '#8b949e' }}>Arrasta ficheiros Excel ou clica para selecionar</p>
          </div>
        </div>

        {/* Drop Zone */}
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

        {/* Lista */}
        <AnimatePresence>
          {ficheiros.length > 0 && (
            <motion.div className="mt-4 space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              {ficheiros.map((ficheiro, index) => (
                <motion.div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: '#21262d',
                    border: `1px solid ${
                      ficheiro.status === 'sucesso' ? 'rgba(32, 128, 128, 0.4)' :
                      ficheiro.status === 'erro' ? 'rgba(239, 68, 68, 0.4)' :
                      ficheiro.status === 'processando' ? 'rgba(59, 130, 246, 0.4)' :
                      ficheiro.status === 'aguardando_marca' ? 'rgba(249, 115, 22, 0.4)' :
                      '#30363d'
                    }`
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <motion.div
                    animate={{ rotate: ficheiro.status === 'processando' ? 360 : 0 }}
                    transition={{ repeat: ficheiro.status === 'processando' ? Infinity : 0, duration: 2, ease: 'linear' }}
                  >
                    <FileSpreadsheet
                      className="w-8 h-8"
                      style={{
                        color: ficheiro.status === 'sucesso' ? '#208080' :
                               ficheiro.status === 'erro' ? '#ef4444' :
                               ficheiro.status === 'aguardando_marca' ? '#f97316' : '#3b82f6'
                      }}
                    />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: '#f0f6fc' }}>{ficheiro.file.name}</p>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {ficheiro.marca ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)', color: '#208080' }}>
                          {ficheiro.marca.nome}
                        </span>
                      ) : ficheiro.status === 'aguardando_marca' ? (
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); abrirModalParaFicheiro(index); }}
                          className="px-2 py-0.5 rounded text-xs flex items-center gap-1"
                          style={{ backgroundColor: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <AlertCircle className="w-3 h-3" />
                          Selecionar marca
                        </motion.button>
                      ) : null}
                      {ficheiro.processingStatus && ficheiro.status === 'processando' && (
                        <span style={{ color: '#8b949e' }}>{ficheiro.processingStatus.mensagem}</span>
                      )}
                      {ficheiro.resultado && (
                        <span style={{ color: '#8b949e' }}>
                          {ficheiro.resultado.sucesso} inseridos
                          {ficheiro.resultado.erros > 0 && `, ${ficheiro.resultado.erros} erros`}
                        </span>
                      )}
                      {ficheiro.erroMensagem && (
                        <span style={{ color: '#ef4444' }}>{ficheiro.erroMensagem}</span>
                      )}
                    </div>
                    {ficheiro.processingStatus && ficheiro.status === 'processando' && (
                      <div className="mt-2 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#30363d' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: '#208080' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${ficheiro.processingStatus.progresso}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {ficheiro.status === 'sucesso' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                        <CheckCircle2 className="w-5 h-5" style={{ color: '#208080' }} />
                      </motion.div>
                    )}
                    {ficheiro.status === 'erro' && <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />}
                    {ficheiro.status === 'processando' && <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3b82f6' }} />}
                    {(ficheiro.status === 'pendente' || ficheiro.status === 'aguardando_marca') && (
                      <motion.button
                        onClick={(e) => { e.stopPropagation(); removerFicheiro(index); }}
                        className="p-1 rounded"
                        style={{ color: '#8b949e' }}
                        whileHover={{ backgroundColor: '#30363d' }}
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão processar */}
        {ficheirosPendentes.length > 0 && (
          <motion.button
            onClick={processarTodos}
            disabled={processando}
            className="mt-4 w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2"
            style={{
              backgroundColor: processando ? '#21262d' : '#208080',
              color: processando ? '#6e7681' : '#f0f6fc',
              cursor: processando ? 'not-allowed' : 'pointer',
              boxShadow: processando ? 'none' : '0 0 20px rgba(32, 128, 128, 0.25)'
            }}
            whileHover={!processando ? { scale: 1.02, boxShadow: '0 0 30px rgba(32, 128, 128, 0.4)' } : {}}
            whileTap={!processando ? { scale: 0.98 } : {}}
          >
            {processando ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> A processar...</>
            ) : (
              <><Upload className="w-5 h-5" /> Processar {ficheirosPendentes.length} ficheiro(s)</>
            )}
          </motion.button>
        )}
      </motion.div>

      <MarcaModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFicheiroParaModal(null); }}
        onSelectMarca={handleSelectMarca}
        marcas={marcas}
        loading={marcasLoading}
        error={marcasError}
        onRetry={carregarMarcas}
        fileName={ficheiroParaModal !== null ? ficheiros[ficheiroParaModal]?.file.name || '' : ''}
      />
    </>
  );
}
