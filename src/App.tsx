import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Zap, Upload, Package, History, LogOut, Wifi, Percent } from 'lucide-react';
import { SetupPage } from './components/SetupPage';
import { UploadSection } from './components/UploadSection';
import { TabelaComponentes } from './components/TabelaComponentes';
import { TabelaHistorico } from './components/TabelaHistorico';
import { TabelaDescontos } from './components/TabelaDescontos';
import { PageTransition } from './components/effects';
import { AuroraBackground, GridOverlay } from './components/effects/AuroraBackground';
import { loadSupabaseConfig, clearSupabaseConfig, createSupabaseClient, testarConexao } from './lib/supabase';

type Tab = 'upload' | 'componentes' | 'historico' | 'descontos';

export function App() {
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [conectado, setConectado] = useState(false);
  const [verificandoConexao, setVerificandoConexao] = useState(true);
  
  // ALTERAÇÃO 1: 'componentes' é agora o separador inicial
  const [tabAtiva, setTabAtiva] = useState<Tab>('componentes');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    verificarConexaoExistente();
  }, []);

  const verificarConexaoExistente = async () => {
    const config = loadSupabaseConfig();
    if (config) {
      const client = createSupabaseClient(config.url, config.anonKey);
      const resultado = await testarConexao(client);
      if (resultado.sucesso) {
        setSupabaseClient(client);
        setConectado(true);
      } else {
        clearSupabaseConfig();
      }
    }
    setVerificandoConexao(false);
  };

  const handleConectado = (client: SupabaseClient) => {
    setSupabaseClient(client);
    setConectado(true);
  };

  const handleDesconectar = () => {
    clearSupabaseConfig();
    setSupabaseClient(null);
    setConectado(false);
  };

  const handleImportCompleta = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // ALTERAÇÃO 2: Reordenação do array tabs
  const tabs = [
    { id: 'componentes' as const, nome: 'Componentes', icon: Package },
    { id: 'upload' as const, nome: 'Upload', icon: Upload },
    { id: 'descontos' as const, nome: 'Descontos', icon: Percent },
    { id: 'historico' as const, nome: 'Histórico', icon: History },
  ];

  if (verificandoConexao) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d1117' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)', border: '1px solid rgba(32, 128, 128, 0.25)' }}>
            <Zap className="w-10 h-10 animate-pulse" style={{ color: '#208080' }} />
          </div>
          <p style={{ color: '#8b949e' }}>A verificar conexão...</p>
        </div>
      </div>
    );
  }

  if (!conectado || !supabaseClient) {
    return <SetupPage onConectado={handleConectado} />;
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0d1117' }}>
      <AuroraBackground />
      <GridOverlay />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-sm" style={{ backgroundColor: 'rgba(22, 27, 34, 0.95)', borderBottom: '1px solid #30363d' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(32, 128, 128, 0.12)', border: '1px solid rgba(32, 128, 128, 0.25)' }}>
                  <Zap className="w-6 h-6" style={{ color: '#208080' }} />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Gestor de Componentes</h1>
                  <p className="text-xs" style={{ color: '#6e7681' }}>Sistema de Orçamentos Elergos</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(32, 128, 128, 0.08)', border: '1px solid rgba(32, 128, 128, 0.25)' }}>
                  <Wifi className="w-3.5 h-3.5" style={{ color: '#208080' }} />
                  <span className="text-xs font-medium" style={{ color: '#2aa0a0' }}>Conectado</span>
                </div>

                <button
                  onClick={handleDesconectar}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:border-red-500 hover:text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div style={{ backgroundColor: 'rgba(22, 27, 34, 0.8)', borderBottom: '1px solid #30363d' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabAtiva(tab.id)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
                  style={{
                    borderBottom: `2px solid ${tabAtiva === tab.id ? '#208080' : 'transparent'}`,
                    color: tabAtiva === tab.id ? '#208080' : '#8b949e',
                    marginBottom: '-1px'
                  }}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.nome}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <PageTransition pageKey={tabAtiva}>
            {tabAtiva === 'upload' && (
              <div className="max-w-4xl mx-auto">
                <UploadSection supabaseClient={supabaseClient} onImportCompleta={handleImportCompleta} />
              </div>
            )}
            {tabAtiva === 'componentes' && (
              <div className="max-w-full">
                <TabelaComponentes supabaseClient={supabaseClient} refreshTrigger={refreshTrigger} />
              </div>
            )}
            {tabAtiva === 'descontos' && (
              <div className="max-w-full">
                <TabelaDescontos supabaseClient={supabaseClient} refreshTrigger={refreshTrigger} />
              </div>
            )}
            {tabAtiva === 'historico' && (
              <div className="max-w-full">
                <TabelaHistorico supabaseClient={supabaseClient} refreshTrigger={refreshTrigger} />
              </div>
            )}
          </PageTransition>
        </main>

        <footer style={{ borderTop: '1px solid #30363d' }}>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-center text-xs" style={{ color: '#6e7681' }}>
              Gestor de Componentes · Sistema de Orçamentos Elergos · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}