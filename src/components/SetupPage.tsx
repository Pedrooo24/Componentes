import { useState } from 'react';
import { Database, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { createSupabaseClient, testarConexao, saveSupabaseConfig, type TesteConexaoResult } from '../lib/supabase';
import { AuroraBackground, GridOverlay } from './effects';

interface Props {
  onConectado: (client: SupabaseClient) => void;
}

export function SetupPage({ onConectado }: Props) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<TesteConexaoResult | null>(null);

  const handleTestar = async () => {
    if (!url || !anonKey) {
      setResultado({ sucesso: false, mensagem: 'Preenche o URL e a Anon Key' });
      return;
    }
    setTestando(true);
    setResultado(null);
    const client = createSupabaseClient(url, anonKey);
    const res = await testarConexao(client);
    setResultado(res);
    setTestando(false);
    if (res.sucesso) {
      saveSupabaseConfig({ url, anonKey });
      onConectado(client);
    }
  };

  const canSubmit = !testando && url.trim() !== '' && anonKey.trim() !== '';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <GridOverlay />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="inline-flex items-center justify-center p-4 rounded-2xl mb-4"
            style={{
              backgroundColor: 'rgba(32, 128, 128, 0.12)',
              border: '1px solid rgba(32, 128, 128, 0.25)',
              boxShadow: '0 0 40px rgba(32, 128, 128, 0.15)'
            }}
          >
            <Zap className="w-10 h-10" style={{ color: '#208080' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#f0f6fc' }}>
            Gestor de Componentes
          </h1>
          <p style={{ color: '#8b949e' }}>Sistema de Importação de Preços</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-xl p-6 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(22, 27, 34, 0.92)',
            border: '1px solid #30363d',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)' }}>
              <Database className="w-6 h-6" style={{ color: '#208080' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#f0f6fc' }}>Configurar Supabase</h2>
              <p className="text-sm" style={{ color: '#8b949e' }}>Conecta à tua base de dados</p>
            </div>
          </div>

          {/* Instruções */}
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'rgba(33, 38, 45, 0.8)', border: '1px solid #30363d' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#f0f6fc' }}>Onde encontrar as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: '#8b949e' }}>
              <li>Vai ao <span style={{ color: '#208080' }}>Supabase Dashboard</span></li>
              <li>Settings → API</li>
              <li>Copia o <strong>Project URL</strong> e a <strong>anon public</strong></li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#f0f6fc' }}>Project URL</label>
              <motion.input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxx.supabase.co"
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc' }}
                whileFocus={{ borderColor: '#208080', boxShadow: '0 0 0 2px rgba(32, 128, 128, 0.2)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#f0f6fc' }}>Anon Key (public)</label>
              <motion.input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none"
                style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc' }}
                whileFocus={{ borderColor: '#208080', boxShadow: '0 0 0 2px rgba(32, 128, 128, 0.2)' }}
              />
            </div>

            <motion.button
              onClick={handleTestar}
              disabled={!canSubmit}
              className="w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2"
              style={{
                backgroundColor: canSubmit ? '#208080' : '#21262d',
                color: canSubmit ? '#f0f6fc' : '#6e7681',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit ? '0 0 20px rgba(32, 128, 128, 0.25)' : 'none'
              }}
              whileHover={canSubmit ? { scale: 1.02, boxShadow: '0 0 30px rgba(32, 128, 128, 0.4)' } : {}}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
            >
              {testando ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> A testar conexão...</>
              ) : (
                <><Database className="w-5 h-5" /> Conectar</>
              )}
            </motion.button>

            {resultado && (
              <motion.div
                className="p-4 rounded-lg flex items-start gap-3"
                style={{
                  backgroundColor: resultado.sucesso ? 'rgba(32, 128, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${resultado.sucesso ? 'rgba(32, 128, 128, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  color: resultado.sucesso ? '#2aa0a0' : '#f87171'
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {resultado.sucesso ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{resultado.mensagem}</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.p
          className="text-center mt-6 text-xs"
          style={{ color: '#6e7681' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Gestor de Componentes v1.0 · Sistema de Orçamentos Elergos
        </motion.p>
      </motion.div>
    </div>
  );
}
