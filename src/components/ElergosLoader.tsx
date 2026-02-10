import { motion } from 'framer-motion';
import { ElergosLogo } from './ElergosLogo';

interface ElergosLoaderProps {
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
}

const sizes = { sm: 28, md: 48, lg: 64 };

/**
 * Branded loading — leve e rápido.
 * Usa apenas transform/opacity (GPU-accelerated).
 * fullScreen: ocupa o ecrã inteiro (ideal para app loading)
 */
export function ElergosLoader({ label = 'A carregar...', size = 'md', fullScreen = false }: ElergosLoaderProps) {
    const logoSize = sizes[size];

    const content = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: size === 'sm' ? 10 : 16,
            }}
        >
            {/* Logo com pulse suave — sem rotação pesada */}
            <motion.div
                animate={{
                    scale: [1, 1.06, 1],
                    opacity: [0.85, 1, 0.85],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ willChange: 'transform, opacity' }}
            >
                <ElergosLogo size={logoSize} glow />
            </motion.div>

            {/* Label com dots animados */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                    style={{
                        color: '#6e7681',
                        fontSize: size === 'sm' ? 11 : 13,
                        fontWeight: 500,
                        letterSpacing: '0.03em',
                    }}
                >
                    {label}
                </span>
                <span style={{ display: 'inline-flex', gap: 2 }} aria-hidden>
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            style={{
                                width: 3,
                                height: 3,
                                borderRadius: '50%',
                                backgroundColor: '#208080',
                                willChange: 'transform, opacity',
                            }}
                            animate={{ opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                        />
                    ))}
                </span>
            </div>
        </motion.div>
    );

    if (fullScreen) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0d1117',
                }}
            >
                {content}
            </div>
        );
    }

    return content;
}
