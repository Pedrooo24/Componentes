import { CheckCircle2, AlertTriangle, AlertCircle, X, Upload, Percent, Eye, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParsedUploadData, ParsedDescontosData, Marca, CenarioDesconto } from '../types';
import { useState } from 'react';

// ============================================================================
// COMPONENTES — Confirmação de Upload
// ============================================================================

interface ComponentesConfirmProps {
    data: ParsedUploadData;
    marca: Marca;
    fileName: string; // [NEW] Nome do ficheiro
    onConfirm: () => void;
    onCancel: () => void;
    isUploading: boolean;
}

function CenarioBadge({ cenario }: { cenario: CenarioDesconto }) {
    const config: Record<CenarioDesconto, { label: string; cor: string; bg: string; icon: typeof CheckCircle2 }> = {
        cod_mpg_only: { label: 'COD MPG', cor: '#208080', bg: 'rgba(32,128,128,0.12)', icon: CheckCircle2 },
        cod_mpg_e_desconto: { label: 'COD MPG + Desconto', cor: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: CheckCircle2 },
        desconto_only: { label: 'Desconto Direto', cor: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: AlertTriangle },
    };

    const c = config[cenario];
    const Icon = c.icon;

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
            style={{ backgroundColor: c.bg, color: c.cor }}
        >
            <Icon className="w-3.5 h-3.5" />
            {c.label}
        </span>
    );
}

export function UploadComponentesConfirm({ data, marca, fileName, onConfirm, onCancel, isUploading }: ComponentesConfirmProps) {
    const [showPreview, setShowPreview] = useState(false);
    const [showIgnored, setShowIgnored] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #30363d' }}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
                        <Upload className="w-5 h-5" style={{ color: '#208080' }} />
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: '#f0f6fc' }}>Confirmar Upload</h3>
                        <p className="text-xs flex items-center gap-1" style={{ color: '#8b949e' }}>
                            <FileSpreadsheet className="w-3 h-3" />
                            {fileName}
                        </p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#21262d] cursor-pointer" style={{ color: '#8b949e' }}>
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Resumo */}
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#8b949e' }}>Marca</p>
                        <p className="text-lg font-bold" style={{ color: '#f0f6fc' }}>{marca.nome}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#8b949e' }}>Componentes</p>
                        <p className="text-lg font-bold" style={{ color: '#208080' }}>
                            {data.componentes.length.toLocaleString('pt-PT')}
                        </p>
                    </div>
                </div>

                {/* Cenário de desconto */}
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
                    <span className="text-xs" style={{ color: '#8b949e' }}>Cenário:</span>
                    <CenarioBadge cenario={data.cenarioDesconto} />
                    {data.descontos.length > 0 && (
                        <span className="text-xs ml-auto" style={{ color: '#208080' }}>
                            + {data.descontos.length} grupo(s) de desconto
                        </span>
                    )}
                </div>

                {/* Avisos */}
                {data.avisos.length > 0 && (
                    <div className="space-y-2">
                        {data.avisos.map((aviso, i) => (
                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                                style={{
                                    backgroundColor: '#0d1117', // [MODIFIED] Dark background instead of orange
                                    border: '1px solid #30363d', // [MODIFIED] Subtle border
                                    color: '#f0f6fc' // [MODIFIED] Light text
                                }}
                            >
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#f97316' }} /> {/* [MODIFIED] Orange icon */}
                                <span>{aviso}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cenário C — aviso especial */}
                {data.cenarioDesconto === 'desconto_only' && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                            <div>
                                <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>Atenção: Desconto Direto</p>
                                <p className="text-xs mt-1" style={{ color: '#fca5a5' }}>
                                    Os componentes não têm código de grupo (COD MPG). Foram gerados grupos automáticos
                                    a partir dos valores de desconto (ex: "D35", "D42.5"). Para maior organização futura,
                                    recomendamos usar COD MPG no ficheiro Excel.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview toggle */}
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                >
                    <Eye className="w-3.5 h-3.5" />
                    {showPreview ? 'Ocultar Preview' : 'Pré-visualizar (primeiras 5 linhas)'}
                </button>

                {/* Preview tabela */}
                <AnimatePresence>
                    {showPreview && data.componentes.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #30363d' }}>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr style={{ backgroundColor: '#21262d' }}>
                                            <th className="px-3 py-2 text-left font-medium" style={{ color: '#8b949e' }}>Referência</th>
                                            <th className="px-3 py-2 text-left font-medium" style={{ color: '#8b949e' }}>Descrição</th>
                                            <th className="px-3 py-2 text-right font-medium" style={{ color: '#8b949e' }}>PVP</th>
                                            <th className="px-3 py-2 text-left font-medium" style={{ color: '#8b949e' }}>Grupo Desc.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.componentes.slice(0, 5).map((c, i) => (
                                            <tr key={i} style={{ borderTop: '1px solid #21262d' }}>
                                                <td className="px-3 py-2 font-mono" style={{ color: '#f0f6fc' }}>{c.referencia}</td>
                                                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: '#8b949e' }}>{c.descricao || '—'}</td>
                                                <td className="px-3 py-2 text-right font-mono" style={{ color: '#208080' }}>
                                                    {c.preco_tabela != null ? `${c.preco_tabela.toFixed(2)} €` : '—'}
                                                </td>
                                                <td className="px-3 py-2 font-mono" style={{ color: '#8b949e' }}>{c.grupo_desconto || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.componentes.length > 5 && (
                                <p className="text-[10px] text-center mt-1" style={{ color: '#6e7681' }}>
                                    ... e mais {(data.componentes.length - 5).toLocaleString('pt-PT')} componentes
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reconciliação */}
                <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: '#0d1117' }}>
                    <span style={{ color: '#6e7681' }}>Total linhas: {data.totalLinhas}</span>
                    <span style={{ color: '#6e7681' }}>Válidas: {data.componentes.length}</span>
                    <span style={{ color: data.linhasIgnoradas > 0 ? '#f97316' : '#6e7681' }}>
                        Ignoradas: {data.linhasIgnoradas}
                    </span>
                </div>

                {/* Linhas Ignoradas — CRÍTICO: User deve rever */}
                {data.linhasIgnoradasDetalhe && data.linhasIgnoradasDetalhe.length > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <button
                            onClick={() => setShowIgnored(!showIgnored)}
                            className="w-full flex items-center justify-between p-3 text-xs font-medium"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#f87171' }}
                        >
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>
                                    ⚠️ {data.linhasIgnoradasDetalhe.length} linha(s) não serão carregadas — Revê se são relevantes
                                </span>
                            </div>
                            {showIgnored ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <AnimatePresence>
                            {showIgnored && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="max-h-40 overflow-y-auto" style={{ backgroundColor: '#0d1117' }}>
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0">
                                                <tr style={{ backgroundColor: '#21262d' }}>
                                                    <th className="px-3 py-1.5 text-left font-medium" style={{ color: '#8b949e' }}>Linha</th>
                                                    <th className="px-3 py-1.5 text-left font-medium" style={{ color: '#8b949e' }}>Referência</th>
                                                    <th className="px-3 py-1.5 text-left font-medium" style={{ color: '#8b949e' }}>Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.linhasIgnoradasDetalhe.slice(0, 50).map((l, i) => (
                                                    <tr key={i} style={{ borderTop: '1px solid #21262d' }}>
                                                        <td className="px-3 py-1.5 font-mono" style={{ color: '#8b949e' }}>{l.linhaExcel}</td>
                                                        <td className="px-3 py-1.5 font-mono" style={{ color: '#f0f6fc' }}>{l.referencia || '—'}</td>
                                                        <td className="px-3 py-1.5" style={{ color: '#f97316' }}>{l.motivo}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {data.linhasIgnoradasDetalhe.length > 50 && (
                                            <p className="text-[10px] text-center py-1" style={{ color: '#6e7681' }}>
                                                ... e mais {data.linhasIgnoradasDetalhe.length - 50} linha(s)
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-2 text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', color: '#fca5a5' }}>
                                        Se alguma destas linhas contém dados reais, <strong>cancela o upload</strong> e corrige o ficheiro Excel.
                                        Se forem linhas de lixo/vazias, podes ignorá-las e prosseguir.
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Ações */}
            <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                <button
                    onClick={onCancel}
                    disabled={isUploading}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                >
                    Cancelar
                </button>
                <motion.button
                    onClick={onConfirm}
                    disabled={isUploading}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                        backgroundColor: '#208080',
                        color: '#f0f6fc',
                        opacity: isUploading ? 0.7 : 1,
                    }}
                    whileTap={!isUploading ? { scale: 0.98 } : {}}
                >
                    {isUploading ? (
                        <>
                            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                            A Carregar...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Confirmar Upload
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
}

// ============================================================================
// DESCONTOS — Confirmação de Upload
// ============================================================================

interface DescontosConfirmProps {
    data: ParsedDescontosData;
    marca: Marca;
    onConfirm: () => void;
    onCancel: () => void;
    isUploading: boolean;
}

export function UploadDescontosConfirm({ data, marca, onConfirm, onCancel, isUploading }: DescontosConfirmProps) {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #30363d' }}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
                        <Percent className="w-5 h-5" style={{ color: '#208080' }} />
                    </div>
                    <div>
                        <h3 className="font-semibold" style={{ color: '#f0f6fc' }}>Confirmar Upload de Descontos</h3>
                        <p className="text-xs" style={{ color: '#8b949e' }}>Revê os descontos antes de carregar</p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#21262d] cursor-pointer" style={{ color: '#8b949e' }}>
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Resumo */}
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#8b949e' }}>Marca</p>
                        <p className="text-lg font-bold" style={{ color: '#f0f6fc' }}>{marca.nome}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0d1117', border: '1px solid #30363d' }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#8b949e' }}>Descontos</p>
                        <p className="text-lg font-bold" style={{ color: '#208080' }}>{data.descontos.length}</p>
                    </div>
                </div>

                <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(32,128,128,0.06)', border: '1px solid rgba(32,128,128,0.15)', color: '#2aa0a0' }}>
                    <strong>Modo upsert:</strong> Os descontos existentes para esta marca serão atualizados por grupo de desconto. Novos grupos serão criados.
                </div>

                {/* Preview toggle */}
                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                >
                    <Eye className="w-3.5 h-3.5" />
                    {showPreview ? 'Ocultar Preview' : 'Pré-visualizar'}
                </button>

                <AnimatePresence>
                    {showPreview && data.descontos.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="overflow-x-auto rounded-lg max-h-60 overflow-y-auto" style={{ border: '1px solid #30363d' }}>
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0">
                                        <tr style={{ backgroundColor: '#21262d' }}>
                                            <th className="px-3 py-2 text-left font-medium" style={{ color: '#8b949e' }}>COD MPG</th>
                                            <th className="px-3 py-2 text-right font-medium" style={{ color: '#8b949e' }}>Desconto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.descontos.slice(0, 20).map((d, i) => (
                                            <tr key={i} style={{ borderTop: '1px solid #21262d' }}>
                                                <td className="px-3 py-2 font-mono" style={{ color: '#f0f6fc' }}>{d.grupo_desconto}</td>
                                                <td className="px-3 py-2 text-right font-mono" style={{ color: '#208080' }}>{d.valor_desconto}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.descontos.length > 20 && (
                                <p className="text-[10px] text-center mt-1" style={{ color: '#6e7681' }}>
                                    ... e mais {data.descontos.length - 20} grupo(s)
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reconciliação */}
                <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: '#0d1117' }}>
                    <span style={{ color: '#6e7681' }}>Total linhas: {data.totalLinhas}</span>
                    <span style={{ color: '#6e7681' }}>Válidas: {data.descontos.length}</span>
                    <span style={{ color: '#6e7681' }}>Ignoradas: {data.linhasIgnoradas}</span>
                </div>
            </div>

            {/* Ações */}
            <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                <button
                    onClick={onCancel}
                    disabled={isUploading}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                >
                    Cancelar
                </button>
                <motion.button
                    onClick={onConfirm}
                    disabled={isUploading}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#208080', color: '#f0f6fc', opacity: isUploading ? 0.7 : 1 }}
                    whileTap={!isUploading ? { scale: 0.98 } : {}}
                >
                    {isUploading ? (
                        <>
                            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                            A Carregar...
                        </>
                    ) : (
                        <>
                            <Percent className="w-4 h-4" />
                            Confirmar Upload
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
}
