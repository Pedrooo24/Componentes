import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ElergosLogo } from './ElergosLogo';

// Stagger container — cada filho entra com delay incremental
const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.2,
        },
    },
};

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
};

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signIn } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await signIn(email, password);

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-[80vh]">
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="w-full max-w-md relative"
            >
                {/* ═══ Glassmorphism Card ═══ */}
                <div
                    className="rounded-2xl p-8 relative overflow-hidden"
                    style={{
                        background: 'rgba(22, 27, 34, 0.55)',
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        border: '1px solid rgba(48, 54, 61, 0.5)',
                        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.4), 0 0 60px rgba(32, 128, 128, 0.06)',
                    }}
                >
                    {/* Glow line superior */}
                    <div
                        className="absolute top-0 left-0 w-full h-[1px]"
                        style={{
                            background: 'linear-gradient(90deg, transparent 10%, #208080 50%, transparent 90%)',
                            opacity: 0.6,
                        }}
                    />

                    {/* Glow line inferior subtil */}
                    <div
                        className="absolute bottom-0 left-0 w-full h-[1px]"
                        style={{
                            background: 'linear-gradient(90deg, transparent 20%, rgba(32, 128, 128, 0.2) 50%, transparent 80%)',
                        }}
                    />

                    {/* ═══ Logo Animado ═══ */}
                    <motion.div variants={fadeUp} className="flex justify-center mb-8">
                        <ElergosLogo size={120} animated glow />
                    </motion.div>

                    {/* ═══ Título ═══ */}
                    <motion.div variants={fadeUp} className="text-center mb-8">
                        <h2
                            className="text-xl font-bold tracking-tight uppercase mb-1.5"
                            style={{ color: '#f0f6fc' }}
                        >
                            Gestor de Componentes
                        </h2>
                        <p className="text-sm" style={{ color: '#6e7681' }}>
                            Sistema de Orçamentos · Acesso Restrito
                        </p>
                    </motion.div>

                    {/* ═══ Error ═══ */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 rounded-lg flex items-start gap-3"
                                    style={{
                                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#f87171',
                                    }}
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══ Formulário ═══ */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <motion.div variants={fadeUp}>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 ml-1" style={{ color: '#8b949e' }}>
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e7681] group-focus-within:text-[#208080] transition-colors duration-200" />
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg py-3 pl-10 pr-4 outline-none transition-all duration-200"
                                    style={{
                                        backgroundColor: 'rgba(13, 17, 23, 0.6)',
                                        border: '1px solid #30363d',
                                        color: '#f0f6fc',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#208080';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(32, 128, 128, 0.15), 0 0 20px rgba(32, 128, 128, 0.05)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#30363d';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="nome@elergos.pt"
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={fadeUp}>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2 ml-1" style={{ color: '#8b949e' }}>
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e7681] group-focus-within:text-[#208080] transition-colors duration-200" />
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg py-3 pl-10 pr-4 outline-none transition-all duration-200"
                                    style={{
                                        backgroundColor: 'rgba(13, 17, 23, 0.6)',
                                        border: '1px solid #30363d',
                                        color: '#f0f6fc',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#208080';
                                        e.target.style.boxShadow = '0 0 0 2px rgba(32, 128, 128, 0.15), 0 0 20px rgba(32, 128, 128, 0.05)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#30363d';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    placeholder="••••••••"
                                />
                            </div>
                        </motion.div>

                        {/* ═══ Botão Submit ═══ */}
                        <motion.div variants={fadeUp}>
                            <motion.button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 font-bold rounded-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
                                style={{
                                    background: loading
                                        ? 'rgba(32, 128, 128, 0.6)'
                                        : 'linear-gradient(135deg, #208080, #1a6a6a)',
                                    color: '#f0f6fc',
                                    border: 'none',
                                    boxShadow: '0 4px 24px rgba(32, 128, 128, 0.25)',
                                    opacity: loading ? 0.7 : 1,
                                }}
                                whileHover={loading ? {} : {
                                    scale: 1.01,
                                    boxShadow: '0 6px 32px rgba(32, 128, 128, 0.35)',
                                }}
                                whileTap={loading ? {} : { scale: 0.98 }}
                            >
                                {loading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <ElergosLogo size={20} />
                                    </motion.div>
                                ) : (
                                    'Entrar na Plataforma'
                                )}
                            </motion.button>
                        </motion.div>
                    </form>
                </div>
            </motion.div>

            {/* ═══ Footer ═══ */}
            <motion.p
                className="mt-8 text-center text-xs"
                style={{ color: '#6e7681', opacity: 0.5 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 0.8 }}
            >
                Elergos · Sistema de Orçamentos · {new Date().getFullYear()}
            </motion.p>
        </div>
    );
}
