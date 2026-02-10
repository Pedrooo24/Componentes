import { useState } from 'react';
import { Upload, Package, History, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserMenu } from './components/UserMenu';
import { UploadSection } from './components/UploadSection';
import { TabelaComponentes } from './components/TabelaComponentes';
import { TabelaHistorico } from './components/TabelaHistorico';
import { TabelaDescontos } from './components/TabelaDescontos';
import { AuroraBackground, GridOverlay } from './components/effects/AuroraBackground';
import { ElergosLogo } from './components/ElergosLogo';
import { ElergosLoader } from './components/ElergosLoader';
import { supabase } from './lib/supabase';
import { LoginPage } from './components/LoginPage';

type Tab = 'componentes' | 'descontos' | 'historico' | 'upload';

const tabs = [
  { id: 'componentes' as const, nome: 'Componentes', icon: Package },
  { id: 'descontos' as const, nome: 'Descontos', icon: Percent },
  { id: 'historico' as const, nome: 'Histórico', icon: History },
  { id: 'upload' as const, nome: 'Upload', icon: Upload },
];

// Direção da transição baseada na posição do tab
function getDirection(from: Tab, to: Tab): number {
  const fromIdx = tabs.findIndex(t => t.id === from);
  const toIdx = tabs.findIndex(t => t.id === to);
  return toIdx > fromIdx ? 1 : -1;
}

// Variantes avançadas para transição entre tabs
const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 60 : -60,
    scale: 0.98,
    filter: 'blur(6px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
    scale: 0.98,
    filter: 'blur(4px)',
  }),
};

const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

function MainContent() {
  const { user, loading } = useAuth();
  const [tabAtiva, setTabAtiva] = useState<Tab>('componentes');
  const [prevTab, setPrevTab] = useState<Tab>('componentes');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportCompleta = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTabChange = (newTab: Tab) => {
    if (newTab !== tabAtiva) {
      setPrevTab(tabAtiva);
      setTabAtiva(newTab);
    }
  };

  const direction = getDirection(prevTab, tabAtiva);

  // --- LOADING SCREEN BRANDED ---
  if (loading) {
    return <ElergosLoader fullScreen size="lg" />;
  }

  // --- RENDERIZAÇÃO GLOBAL ---
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0d1117' }}>
      <AuroraBackground />
      <GridOverlay />

      <div className="relative z-10 flex flex-col min-h-screen">
        {!user ? (
          <LoginPage />
        ) : (
          <>
            {/* ══════════════ HEADER ══════════════ */}
            <header
              className="sticky top-0 z-50"
              style={{
                backgroundColor: 'rgba(13, 17, 23, 0.85)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                borderBottom: '1px solid rgba(48, 54, 61, 0.6)',
              }}
            >
              <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  {/* Brand */}
                  <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: 'rgba(32, 128, 128, 0.08)',
                        border: '1px solid rgba(32, 128, 128, 0.2)',
                      }}
                    >
                      <div style={{ transform: 'scale(2.2)' }}>
                        <ElergosLogo size={46} />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-lg font-bold tracking-tight" style={{ color: '#f0f6fc' }}>
                        Gestor de Componentes
                      </h1>
                      <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#208080' }}>
                        Sistema Elergos
                      </p>
                    </div>
                  </motion.div>

                  {/* User */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <UserMenu />
                  </motion.div>
                </div>
              </div>
            </header>

            {/* ══════════════ TABS COM ANIMATED UNDERLINE ══════════════ */}
            <div
              style={{
                backgroundColor: 'rgba(13, 17, 23, 0.6)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(48, 54, 61, 0.4)',
              }}
            >
              <div className="w-full px-4 sm:px-6 lg:px-8">
                <nav className="flex gap-0.5 relative">
                  {tabs.map((tab, index) => {
                    const isActive = tabAtiva === tab.id;
                    const Icon = tab.icon;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
                        style={{
                          color: isActive ? '#f0f6fc' : '#6e7681',
                          background: 'transparent',
                          border: 'none',
                        }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 + 0.2 }}
                        whileHover={{ color: isActive ? '#f0f6fc' : '#8b949e' }}
                      >
                        <motion.div
                          animate={{
                            scale: isActive ? 1.1 : 1,
                            color: isActive ? '#208080' : '#6e7681',
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <Icon className="w-4 h-4" />
                        </motion.div>
                        <span>{tab.nome}</span>

                        {/* Animated underline com layoutId — desliza suavemente */}
                        {isActive && (
                          <motion.div
                            layoutId="tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-[2px]"
                            style={{
                              background: 'linear-gradient(90deg, transparent, #208080, #2aa0a0, #208080, transparent)',
                              borderRadius: 9999,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* ══════════════ CONTENT COM TRANSIÇÕES DIRECIONAIS ══════════════ */}
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={tabAtiva}
                  custom={direction}
                  variants={pageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={pageTransition}
                >
                  {tabAtiva === 'componentes' && (
                    <div className="max-w-full">
                      <TabelaComponentes supabaseClient={supabase} refreshTrigger={refreshTrigger} />
                    </div>
                  )}
                  {tabAtiva === 'descontos' && (
                    <div className="max-w-full">
                      <TabelaDescontos supabaseClient={supabase} refreshTrigger={refreshTrigger} />
                    </div>
                  )}
                  {tabAtiva === 'historico' && (
                    <div className="max-w-full">
                      <TabelaHistorico supabaseClient={supabase} refreshTrigger={refreshTrigger} />
                    </div>
                  )}
                  {tabAtiva === 'upload' && (
                    <div className="max-w-4xl mx-auto">
                      <UploadSection supabaseClient={supabase} onImportCompleta={handleImportCompleta} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* ══════════════ FOOTER ══════════════ */}
            <footer style={{ borderTop: '1px solid rgba(48, 54, 61, 0.4)' }}>
              <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                <p className="text-center text-xs" style={{ color: '#6e7681' }}>
                  Gestor de Componentes · Sistema de Orçamentos Elergos · {new Date().getFullYear()}
                </p>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider client={supabase}>
      <MainContent />
    </AuthProvider>
  );
}