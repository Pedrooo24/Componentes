import { X, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Marca } from '../types';
import { hasMarcaConfig } from '../config/marcas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectMarca: (marca: Marca) => void;
  marcas: Marca[];
  fileName: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function MarcaModal({ isOpen, onClose, onSelectMarca, marcas, fileName, loading = false, error = null, onRetry }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-xl overflow-hidden"
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              boxShadow: '0 0 40px rgba(32, 128, 128, 0.08)'
            }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #30363d' }}>
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)', boxShadow: '0 0 12px rgba(32, 128, 128, 0.15)' }}
                >
                  <Package className="w-5 h-5" style={{ color: '#208080' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: '#f0f6fc' }}>Selecionar Marca</h3>
                  <p className="text-sm truncate max-w-[200px]" style={{ color: '#8b949e' }}>{fileName}</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg"
                style={{ color: '#8b949e' }}
                whileHover={{ backgroundColor: '#21262d' }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm mb-4" style={{ color: '#8b949e' }}>
                Escolhe a marca para importar os componentes:
              </p>

              {loading && (
                <div className="text-center py-8" style={{ color: '#8b949e' }}>
                  <motion.div
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div
                      className="w-4 h-4 rounded-full animate-spin"
                      style={{ border: '2px solid #30363d', borderTopColor: '#208080' }}
                    />
                    <span className="text-sm">A carregar marcas...</span>
                  </motion.div>
                </div>
              )}

              {!loading && error && (
                <motion.div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Não foi possível carregar marcas</p>
                      <p className="text-sm mt-1" style={{ color: '#fca5a5' }}>{error}</p>
                      {onRetry && (
                        <motion.button
                          onClick={onRetry}
                          className="mt-3 text-sm px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: '#21262d', border: '1px solid rgba(32, 128, 128, 0.3)', color: '#2aa0a0' }}
                          whileHover={{ borderColor: '#208080', scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Recarregar
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {!loading && !error && marcas.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {marcas.map((marca, index) => {
                    const temConfig = hasMarcaConfig(marca.idmarca);

                    return (
                      <motion.button
                        key={marca.idmarca}
                        onClick={() => temConfig && onSelectMarca(marca)}
                        disabled={!temConfig}
                        className="w-full p-4 rounded-lg text-left flex items-center justify-between group"
                        style={{
                          backgroundColor: '#21262d',
                          border: '1px solid #30363d',
                          cursor: temConfig ? 'pointer' : 'not-allowed',
                          opacity: temConfig ? 1 : 0.5,
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: temConfig ? 1 : 0.5, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={temConfig ? {
                          borderColor: '#208080',
                          backgroundColor: 'rgba(32, 128, 128, 0.08)',
                          scale: 1.01
                        } : {}}
                        whileTap={temConfig ? { scale: 0.99 } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{
                              backgroundColor: temConfig ? 'rgba(32, 128, 128, 0.12)' : '#30363d',
                              color: temConfig ? '#208080' : '#6e7681',
                              border: temConfig ? '1px solid rgba(32, 128, 128, 0.25)' : '1px solid #3d444d',
                            }}
                          >
                            {marca.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium" style={{ color: '#f0f6fc' }}>{marca.nome}</p>
                              {temConfig && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: 'rgba(32, 128, 128, 0.15)', color: '#2aa0a0' }}
                                >
                                  Pronto
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {temConfig ? (
                            <CheckCircle2 className="w-5 h-5" style={{ color: '#208080' }} />
                          ) : (
                            <div className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316' }}>
                              <AlertCircle className="w-3 h-3" />
                              <span>Sem mapeamento</span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {!loading && !error && marcas.length === 0 && (
                <motion.div className="text-center py-8" style={{ color: '#6e7681' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma marca encontrada na base de dados.</p>
                  <p className="text-sm mt-1">
                    Verifica a tabela <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#21262d' }}>tblmarca</code>
                  </p>
                  {onRetry && (
                    <motion.button
                      onClick={onRetry}
                      className="mt-3 text-sm px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: '#21262d', border: '1px solid rgba(32, 128, 128, 0.3)', color: '#2aa0a0' }}
                      whileHover={{ borderColor: '#208080', scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Recarregar
                    </motion.button>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4" style={{ borderTop: '1px solid #30363d', backgroundColor: '#0d1117' }}>
              <p className="text-xs" style={{ color: '#6e7681' }}>
                Marcas sem configuração de mapeamento não podem ser processadas.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
