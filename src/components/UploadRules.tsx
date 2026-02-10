import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HEADERS_OBRIGATORIOS,
    HEADERS_DESCONTO,
    HEADERS_OPCIONAIS,
    HEADERS_DESCONTOS_OBRIGATORIOS,
} from '../lib/excelParser';

interface Props {
    tipo: 'componentes' | 'descontos';
}

function CopyButton({ text }: { text: string }) {
    const [copiado, setCopiado] = useState(false);

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // fallback
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    return (
        <motion.button
            onClick={(e) => { e.stopPropagation(); copiar(); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer"
            style={{
                backgroundColor: copiado ? 'rgba(32, 128, 128, 0.2)' : 'rgba(32, 128, 128, 0.08)',
                color: copiado ? '#2aa0a0' : '#8b949e',
                border: `1px solid ${copiado ? 'rgba(32, 128, 128, 0.4)' : '#30363d'}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`Copiar "${text}"`}
        >
            {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiado ? 'Copiado!' : 'Copiar'}
        </motion.button>
    );
}

export function UploadRules({ tipo }: Props) {
    const [expandido, setExpandido] = useState(true);

    const isComponentes = tipo === 'componentes';

    return (
        <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'rgba(32, 128, 128, 0.04)', border: '1px solid rgba(32, 128, 128, 0.15)' }}
        >
            {/* Header colapsável */}
            <button
                onClick={() => setExpandido(!expandido)}
                className="w-full flex items-center justify-between p-3 transition-colors hover:bg-[rgba(32,128,128,0.08)] cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" style={{ color: '#208080' }} />
                    <span className="text-sm font-medium" style={{ color: '#f0f6fc' }}>
                        Regras de Upload
                    </span>
                </div>
                {expandido ?
                    <ChevronUp className="w-4 h-4" style={{ color: '#8b949e' }} /> :
                    <ChevronDown className="w-4 h-4" style={{ color: '#8b949e' }} />
                }
            </button>

            {/* Conteúdo */}
            <AnimatePresence>
                {expandido && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3">
                            {isComponentes ? (
                                <>
                                    {/* Obrigatórios */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Zap className="w-3.5 h-3.5" style={{ color: '#f0f6fc' }} />
                                            <p className="text-xs font-semibold" style={{ color: '#f0f6fc' }}>
                                                Headers Obrigatórios
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {HEADERS_OBRIGATORIOS.map(h => (
                                                <div key={h} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                    style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                                                >
                                                    <span className="text-xs font-mono" style={{ color: '#f0f6fc' }}>{h}</span>
                                                    <CopyButton text={h} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Desconto (COD MPG ou Desconto) */}
                                    <div className="mt-3">
                                        <div className="flex flex-wrap gap-2">
                                            {HEADERS_DESCONTO.map(h => (
                                                <div key={h} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                    style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                                                >
                                                    <span className="text-xs font-mono" style={{ color: '#f0f6fc' }}>{h}</span>
                                                    <CopyButton text={h} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-start gap-2 p-2 rounded-md mt-2" style={{ backgroundColor: '#21262d' }}>
                                            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#208080' }} />
                                            <p className="text-[11px]" style={{ color: '#8b949e' }}>
                                                Colocar pelo menos um — <strong style={{ color: '#f0f6fc' }}>Desconto</strong> ou <strong style={{ color: '#f0f6fc' }}>COD MPG</strong>. Se tiver os dois, ambos serão importados.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Opcionais */}
                                    <div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: '#8b949e' }}>
                                            📎 Headers Opcionais
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {HEADERS_OPCIONAIS.map(h => (
                                                <div key={h} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                    style={{ backgroundColor: '#21262d', border: '1px solid rgba(48, 54, 61, 0.6)' }}
                                                >
                                                    <span className="text-xs font-mono" style={{ color: '#8b949e' }}>{h}</span>
                                                    <CopyButton text={h} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Nota folha */}
                                    <div className="flex items-start gap-2 p-2 rounded-md" style={{ backgroundColor: '#21262d' }}>
                                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#208080' }} />
                                        <p className="text-[11px]" style={{ color: '#8b949e' }}>
                                            A folha do Excel deve chamar-se <strong style={{ color: '#f0f6fc' }}>"P"</strong>.
                                            Os headers podem estar em qualquer uma das primeiras 10 linhas.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Descontos standalone */}
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Zap className="w-3.5 h-3.5" style={{ color: '#f0f6fc' }} />
                                            <p className="text-xs font-semibold" style={{ color: '#f0f6fc' }}>
                                                Headers Obrigatórios
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {HEADERS_DESCONTOS_OBRIGATORIOS.map(h => (
                                                <div key={h} className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                                                    style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                                                >
                                                    <span className="text-xs font-mono" style={{ color: '#f0f6fc' }}>{h}</span>
                                                    <CopyButton text={h} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 p-2 rounded-md" style={{ backgroundColor: '#21262d' }}>
                                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#208080' }} />
                                        <p className="text-[11px]" style={{ color: '#8b949e' }}>
                                            Cola 2 colunas do Excel (COD MPG e Desconto) ou carrega um ficheiro com estes headers.
                                            Os descontos são atualizados por marca e grupo (upsert).
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
