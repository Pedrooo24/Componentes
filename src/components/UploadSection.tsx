import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle,
  Clipboard, Percent, Package, Plus, Loader2
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  lerExcel, lerClipboard, validarHeaders,
  processarComponentes, processarDescontosStandalone
} from '../lib/excelParser';
import { inserirComponentes, upsertDescontos, inserirMarca } from '../lib/database';
import { buscarMarcasResult } from '../lib/supabase';
import {
  Marca, ParsedUploadData, ParsedDescontosData,
  HeaderValidation, ImportResult
} from '../types';
import { AnimatedBorder } from './effects';
import { UploadRules } from './UploadRules';
import { UploadComponentesConfirm, UploadDescontosConfirm } from './UploadConfirmation';

interface Props {
  supabaseClient: SupabaseClient;
  onImportCompleta: () => void;
}

type TipoImportacao = 'componentes' | 'descontos';
type InputMode = 'ficheiro' | 'colar';
type FlowStep = 'input' | 'validacao' | 'confirmacao' | 'resultado';

export function UploadSection({ supabaseClient, onImportCompleta }: Props) {
  const { user } = useAuth();

  // Tab principal
  const [tipoImportacao, setTipoImportacao] = useState<TipoImportacao>('componentes');
  const [inputMode, setInputMode] = useState<InputMode>('ficheiro');
  const [flowStep, setFlowStep] = useState<FlowStep>('input');

  // Dados de input
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [textoColado, setTextoColado] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Marca
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaSelecionada, setMarcaSelecionada] = useState<number | null>(null);
  const [novaMarcaNome, setNovaMarcaNome] = useState('');
  const [criandoMarca, setCriandoMarca] = useState(false);
  const [erroMarca, setErroMarca] = useState<string | null>(null);
  const [showAddMarca, setShowAddMarca] = useState(false);

  // Validação e parsing
  const [validation, setValidation] = useState<HeaderValidation | null>(null);
  const [parsedData, setParsedData] = useState<ParsedUploadData | null>(null);
  const [parsedDescontos, setParsedDescontos] = useState<ParsedDescontosData | null>(null);
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [resultadoDescontos, setResultadoDescontos] = useState<{ total: number } | null>(null);
  const [erroUpload, setErroUpload] = useState<string | null>(null);

  // Carregar marcas
  useEffect(() => {
    carregarMarcas();
  }, [supabaseClient]);

  const carregarMarcas = async () => {
    const res = await buscarMarcasResult(supabaseClient);
    setMarcas(res.data);
    if (res.data.length > 0 && !marcaSelecionada) {
      // setMarcaSelecionada(res.data[0].idmarca); // REMOVIDO: Obrigatório selecionar explicitamente
    }
  };

  // Reset ao mudar tipo
  const handleTipoChange = (tipo: TipoImportacao) => {
    setTipoImportacao(tipo);
    resetFlow();
  };

  const resetFlow = () => {
    setFlowStep('input');
    setFicheiro(null);
    setTextoColado('');
    setValidation(null);
    setParsedData(null);
    setParsedDescontos(null);
    setErrosValidacao([]);
    setResultado(null);
    setResultadoDescontos(null);
    setErroUpload(null);
  };

  // === DRAG & DROP ===
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    if (files.length > 0) {
      setFicheiro(files[0]);
      setInputMode('ficheiro');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFicheiro(e.target.files[0]);
      setInputMode('ficheiro');
    }
  };

  // === ADICIONAR MARCA ===
  const handleAdicionarMarca = async () => {
    if (!novaMarcaNome.trim()) return;
    setCriandoMarca(true);
    setErroMarca(null);

    const res = await inserirMarca(supabaseClient, novaMarcaNome);
    if (res.sucesso && res.marca) {
      await carregarMarcas();
      setMarcaSelecionada(res.marca.idmarca);
      setNovaMarcaNome('');
      setShowAddMarca(false);
    } else {
      setErroMarca(res.erro || 'Erro ao criar marca');
    }
    setCriandoMarca(false);
  };

  // === VALIDAR ===
  const handleValidar = async () => {
    setErrosValidacao([]);
    setValidation(null);
    setIsValidating(true);

    try {

      // Verificar se tem dados
      const temDados = inputMode === 'ficheiro' ? !!ficheiro : textoColado.trim().length > 0;
      if (!temDados) {
        setErrosValidacao(['Nenhum dado fornecido. Arrasta um ficheiro Excel ou cola os dados.']);
        return;
      }

      if (!marcaSelecionada) {
        setErrosValidacao(['Seleciona uma marca antes de validar.']);
        return;
      }


      // try { foi aberto acima

      // 1. Ler dados
      let rows: unknown[][];
      const avisos: string[] = [];

      if (inputMode === 'ficheiro' && ficheiro) {
        const raw = await lerExcel(ficheiro);
        rows = raw.rows;
        avisos.push(...raw.avisos);
      } else {
        const raw = lerClipboard(textoColado);
        rows = raw.rows;
      }

      if (rows.length === 0) {
        setErrosValidacao(['O ficheiro/texto está vazio.']);
        return;
      }

      if (tipoImportacao === 'componentes') {
        // 2. Validar headers
        const val = validarHeaders(rows);
        val.avisos.push(...avisos);
        setValidation(val);

        if (!val.valido) {
          setErrosValidacao(val.erros);
          setFlowStep('validacao');
          return;
        }

        // 3. Processar
        const data = processarComponentes(rows, val, marcaSelecionada);
        if (data.componentes.length === 0) {
          setErrosValidacao(['Nenhum componente válido encontrado nos dados.']);
          setFlowStep('validacao');
          return;
        }

        setParsedData(data);
        setFlowStep('confirmacao');

      } else {
        // Descontos standalone
        const data = processarDescontosStandalone(rows, marcaSelecionada);
        if (data.erros.length > 0) {
          setErrosValidacao(data.erros);
          setFlowStep('validacao');
          return;
        }

        if (data.descontos.length === 0) {
          setErrosValidacao(['Nenhum desconto válido encontrado.']);
          setFlowStep('validacao');
          return;
        }

        setParsedDescontos(data);
        setFlowStep('confirmacao');
      }

    } catch (err) {
      setErrosValidacao([
        `Erro ao processar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  // === UPLOAD COMPONENTES ===
  const handleUploadComponentes = async () => {
    if (!parsedData || !marcaSelecionada) return;
    setIsUploading(true);
    setErroUpload(null);

    try {
      // 1. Upload componentes
      const res = await inserirComponentes(supabaseClient, parsedData.componentes);
      setResultado(res);

      // 2. Upload descontos (se cenário B ou C)
      if (parsedData.descontos.length > 0) {
        const resDesc = await upsertDescontos(supabaseClient, parsedData.descontos);
        if (!resDesc.sucesso) {
          res.mensagens.push(`Aviso: Erro ao carregar descontos: ${resDesc.msg}`);
        } else {
          res.mensagens.push(`✅ ${parsedData.descontos.length} grupo(s) de desconto atualizados.`);
        }
      }

      setFlowStep('resultado');
      onImportCompleta();
    } catch (err) {
      setErroUpload(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsUploading(false);
    }
  };

  // === UPLOAD DESCONTOS ===
  const handleUploadDescontos = async () => {
    if (!parsedDescontos || !marcaSelecionada) return;
    setIsUploading(true);
    setErroUpload(null);

    try {
      const res = await upsertDescontos(supabaseClient, parsedDescontos.descontos);
      if (!res.sucesso) throw new Error(res.msg);

      setResultadoDescontos({ total: parsedDescontos.descontos.length });
      setFlowStep('resultado');
      onImportCompleta();
    } catch (err) {
      setErroUpload(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsUploading(false);
    }
  };

  // Marca selecionada como objeto
  const marcaObj = marcas.find(m => m.idmarca === marcaSelecionada) || null;

  // === AUTH GUARD ===
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-[#30363d] bg-[#161b22]">
        <div className="p-4 rounded-full bg-[#208080]/10 mb-4">
          <Package className="w-8 h-8 text-[#208080]" />
        </div>
        <h3 className="text-xl font-bold text-[#f0f6fc] mb-2">Acesso Restrito</h3>
        <p className="text-[#8b949e] max-w-md mb-6">
          Para importar componentes e descontos, precisas de ter permissões de administrador.
        </p>
        <p className="text-xs text-[#6e7681]">Faz Login no menu superior.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Switcher de Tipo */}
      <div className="flex p-1 rounded-lg bg-[#161b22] border border-[#30363d] w-fit mx-auto">
        <button
          onClick={() => handleTipoChange('componentes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${tipoImportacao === 'componentes'
            ? 'bg-[#208080] text-white shadow-lg'
            : 'text-[#8b949e] hover:text-white'
            }`}
        >
          <Package className="w-4 h-4" />
          Importar Componentes
        </button>
        <button
          onClick={() => handleTipoChange('descontos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${tipoImportacao === 'descontos'
            ? 'bg-[#208080] text-white shadow-lg'
            : 'text-[#8b949e] hover:text-white'
            }`}
        >
          <Percent className="w-4 h-4" />
          Importar Descontos
        </button>
      </div>

      {/* Conteúdo Principal */}
      <motion.div
        className="rounded-xl p-6"
        style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={tipoImportacao}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
            <Upload className="w-6 h-6" style={{ color: '#208080' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>
              {tipoImportacao === 'componentes' ? 'Importar Componentes' : 'Importar Descontos'}
            </h2>
            <p className="text-sm" style={{ color: '#8b949e' }}>
              {tipoImportacao === 'componentes'
                ? 'Carrega a tabela de preços do fornecedor'
                : 'Carrega a tabela de descontos por grupo'}
            </p>
          </div>
        </div>

        {/* Regras de Upload */}
        <UploadRules tipo={tipoImportacao} />

        <div className="mt-5 space-y-5">
          {/* ═══ STEP: INPUT ═══ */}
          {flowStep === 'input' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* Sub-tabs: Ficheiro / Colar */}
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: '#0d1117' }}>
                <button
                  onClick={() => setInputMode('ficheiro')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${inputMode === 'ficheiro'
                    ? 'bg-[#21262d] text-[#f0f6fc] border border-[#30363d]'
                    : 'text-[#6e7681] hover:text-[#8b949e]'
                    }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Ficheiro Excel
                </button>
                <button
                  onClick={() => setInputMode('colar')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${inputMode === 'colar'
                    ? 'bg-[#21262d] text-[#f0f6fc] border border-[#30363d]'
                    : 'text-[#6e7681] hover:text-[#8b949e]'
                    }`}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Colar Dados
                </button>
              </div>

              {/* Input Zone */}
              {inputMode === 'ficheiro' ? (
                <AnimatedBorder isActive={isDragging}>
                  <motion.div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById('file-input-v2')?.click()}
                    className="rounded-lg p-8 text-center cursor-pointer"
                    style={{ backgroundColor: '#0d1117' }}
                    animate={{ backgroundColor: isDragging ? 'rgba(32, 128, 128, 0.08)' : '#0d1117' }}
                    whileHover={{ backgroundColor: 'rgba(32, 128, 128, 0.04)' }}
                  >
                    {ficheiro ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileSpreadsheet className="w-8 h-8" style={{ color: '#208080' }} />
                        <div className="text-left">
                          <p className="font-medium" style={{ color: '#f0f6fc' }}>{ficheiro.name}</p>
                          <p className="text-xs" style={{ color: '#8b949e' }}>
                            {(ficheiro.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFicheiro(null); }}
                          className="p-1 rounded hover:bg-[#21262d] cursor-pointer"
                          style={{ color: '#8b949e' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <motion.div animate={{ scale: isDragging ? 1.1 : 1, color: isDragging ? '#208080' : '#6e7681' }}>
                          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3" />
                        </motion.div>
                        <p className="font-medium" style={{ color: '#f0f6fc' }}>
                          {isDragging ? 'Larga o ficheiro aqui!' : 'Arrasta ficheiro Excel aqui'}
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#6e7681' }}>ou clica para selecionar (.xlsx, .xls)</p>
                      </>
                    )}
                    <input id="file-input-v2" type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                  </motion.div>
                </AnimatedBorder>
              ) : (
                <textarea
                  value={textoColado}
                  onChange={(e) => setTextoColado(e.target.value)}
                  placeholder={tipoImportacao === 'componentes'
                    ? "Cola aqui a tabela com os headers (Referência, Descrição, PVP, COD MPG, ...).\nOs dados devem estar separados por TAB (copy/paste do Excel)."
                    : "Cola aqui a tabela com os headers (COD MPG, Desconto).\nDados separados por TAB (copy/paste do Excel)."}
                  className="w-full h-48 bg-[#0d1117] border border-[#30363d] rounded-lg p-4 font-mono text-sm text-[#f0f6fc] focus:border-[#208080] focus:ring-1 focus:ring-[#208080] resize-none"
                  style={{ outline: 'none' }}
                />
              )}

              {/* Selecionar Marca */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#f0f6fc' }}>
                  Selecionar Marca
                </label>
                <div className="flex gap-2 flex-wrap">
                  {marcas.map(marca => (
                    <button
                      key={marca.idmarca}
                      onClick={() => setMarcaSelecionada(marca.idmarca)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${marcaSelecionada === marca.idmarca
                        ? 'bg-[#208080] border-[#208080] text-[#0d1117]'
                        : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:border-[#208080]'
                        }`}
                    >
                      {marca.nome}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAddMarca(!showAddMarca)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed transition-all flex items-center gap-1 cursor-pointer"
                    style={{
                      borderColor: showAddMarca ? '#208080' : '#30363d',
                      color: showAddMarca ? '#208080' : '#6e7681',
                      backgroundColor: showAddMarca ? 'rgba(32,128,128,0.08)' : 'transparent',
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Marca
                  </button>
                </div>

                {/* Adicionar nova marca inline */}
                <AnimatePresence>
                  {showAddMarca && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          value={novaMarcaNome}
                          onChange={(e) => { setNovaMarcaNome(e.target.value); setErroMarca(null); }}
                          placeholder="Nome da nova marca..."
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] focus:border-[#208080] focus:ring-1 focus:ring-[#208080]"
                          style={{ outline: 'none' }}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdicionarMarca()}
                        />
                        <motion.button
                          onClick={handleAdicionarMarca}
                          disabled={criandoMarca || !novaMarcaNome.trim()}
                          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                          style={{
                            backgroundColor: '#208080',
                            color: '#f0f6fc',
                            opacity: criandoMarca || !novaMarcaNome.trim() ? 0.5 : 1,
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {criandoMarca ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Criar
                        </motion.button>
                      </div>
                      {erroMarca && (
                        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#ef4444' }}>
                          <AlertCircle className="w-3 h-3" /> {erroMarca}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Botão Validar */}
              <motion.button
                onClick={handleValidar}
                disabled={(!ficheiro && !textoColado.trim()) || !marcaSelecionada || isValidating}
                className="w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: '#208080', color: '#f0f6fc' }}
                whileTap={{ scale: 0.98 }}
              >
                {isValidating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {isValidating ? 'A Validar...' : 'VALIDAR'}
              </motion.button>
            </motion.div>
          )}

          {/* ═══ STEP: VALIDAÇÃO (erros) ═══ */}
          {flowStep === 'validacao' && errosValidacao.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}>
                    <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-2" style={{ color: '#ef4444' }}>
                      Ficheiro Rejeitado — Corrige e tenta novamente
                    </h3>
                    <ul className="space-y-1.5">
                      {errosValidacao.map((erro, i) => (
                        <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#fca5a5' }}>
                          <span className="mt-0.5">•</span>
                          <span>{erro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Avisos adicionais da validação */}
              {validation && validation.avisos.length > 0 && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(249, 115, 22, 0.06)', border: '1px solid rgba(249, 115, 22, 0.15)' }}>
                  {validation.avisos.map((aviso, i) => (
                    <p key={i} className="text-xs" style={{ color: '#f97316' }}>⚠️ {aviso}</p>
                  ))}
                </div>
              )}

              <motion.button
                onClick={resetFlow}
                className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                whileTap={{ scale: 0.98 }}
              >
                ← Voltar e Corrigir
              </motion.button>
            </motion.div>
          )}

          {/* ═══ STEP: CONFIRMAÇÃO ═══ */}
          {flowStep === 'confirmacao' && (
            <AnimatePresence mode="wait">
              {tipoImportacao === 'componentes' && parsedData && marcaObj && (
                <UploadComponentesConfirm
                  data={parsedData}
                  marca={marcaObj}
                  onConfirm={handleUploadComponentes}
                  onCancel={resetFlow}
                  isUploading={isUploading}
                />
              )}
              {tipoImportacao === 'descontos' && parsedDescontos && marcaObj && (
                <UploadDescontosConfirm
                  data={parsedDescontos}
                  marca={marcaObj}
                  onConfirm={handleUploadDescontos}
                  onCancel={resetFlow}
                  isUploading={isUploading}
                />
              )}
            </AnimatePresence>
          )}

          {/* ═══ STEP: RESULTADO ═══ */}
          {flowStep === 'resultado' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Sucesso */}
              {((resultado && resultado.erros === 0) || resultadoDescontos) && !erroUpload && (
                <div className="p-5 rounded-xl text-center" style={{ backgroundColor: 'rgba(32, 128, 128, 0.06)', border: '1px solid rgba(32, 128, 128, 0.2)' }}>
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#208080' }} />
                  <h3 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Upload Concluído!</h3>

                  {/* Componentes — mensagem diferenciada por cenário */}
                  {resultado && parsedData && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-sm" style={{ color: '#2aa0a0' }}>
                        ✅ {resultado.sucesso.toLocaleString('pt-PT')} componentes carregados com sucesso.
                      </p>

                      {parsedData.cenarioDesconto === 'cod_mpg_only' && (
                        <p className="text-sm" style={{ color: '#f97316' }}>
                          ⚠️ Grupos de desconto adicionados com sucesso. Falta importar os descontos no separador "Importar Descontos".
                        </p>
                      )}

                      {parsedData.cenarioDesconto === 'desconto_only' && (
                        <p className="text-sm" style={{ color: '#2aa0a0' }}>
                          ✅ Tudo adicionado com sucesso. Os grupos de desconto foram criados automaticamente a partir dos valores.
                        </p>
                      )}

                      {parsedData.cenarioDesconto === 'cod_mpg_e_desconto' && (
                        <p className="text-sm" style={{ color: '#2aa0a0' }}>
                          ✅ Tudo adicionado com sucesso. Foram criados os grupos de desconto para {marcaObj?.nome || 'esta marca'}.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Descontos standalone */}
                  {resultadoDescontos && (
                    <p className="text-sm mt-2" style={{ color: '#2aa0a0' }}>
                      ✅ {resultadoDescontos.total} grupo(s) de desconto atualizados com sucesso.
                    </p>
                  )}

                  {resultado && resultado.mensagens.length > 0 && (
                    <div className="mt-3 text-left space-y-1">
                      {resultado.mensagens.map((msg, i) => (
                        <p key={i} className="text-xs" style={{ color: '#8b949e' }}>• {msg}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Erros parciais */}
              {resultado && resultado.erros > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(249, 115, 22, 0.06)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5" style={{ color: '#f97316' }} />
                    <h3 className="font-semibold text-sm" style={{ color: '#f97316' }}>Upload com avisos</h3>
                  </div>
                  <p className="text-xs" style={{ color: '#8b949e' }}>
                    {resultado.sucesso} OK · {resultado.erros} com erro
                  </p>
                  {resultado.mensagens.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {resultado.mensagens.map((msg, i) => (
                        <p key={i} className="text-xs" style={{ color: '#fca5a5' }}>• {msg}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Erro total */}
              {erroUpload && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                    <p className="text-sm" style={{ color: '#ef4444' }}>{erroUpload}</p>
                  </div>
                </div>
              )}

              <motion.button
                onClick={resetFlow}
                className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: '#208080', color: '#f0f6fc' }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload className="w-4 h-4" />
                Novo Upload
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}