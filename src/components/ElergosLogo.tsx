import { motion, type HTMLMotionProps } from 'framer-motion';
// Using the new transparent logo provided by user
import elergosLogo from '../assets/elergos-logo1.png';

interface ElergosLogoProps {
    size?: number;
    animated?: boolean;
    className?: string;
    glow?: boolean;
}

/**
 * Logo oficial Elergos — versão imagem com animações opcionais.
 * animated: flutuação suave (ideal para login/hero)
 * glow: pulse de brilho teal
 */
export function ElergosLogo({ size = 40, animated = false, className = '', glow = false }: ElergosLogoProps) {
    const motionProps: HTMLMotionProps<'div'> = animated
        ? {
            animate: {
                y: [0, -6, 0],
                rotate: [0, 1, -1, 0],
            },
            transition: {
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        }
        : {};

    return (
        <motion.div
            className={`elergos-logo-wrapper ${className}`}
            style={{
                width: size,
                height: size,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            {...motionProps}
        >
            <img
                src={elergosLogo}
                alt="Elergos"
                width={size}
                height={size}
                loading="eager"
                decoding="async"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 0 8px rgba(32, 128, 128, 0.25))', // Subtle shadow for depth
                }}
                draggable={false}
            />
            {glow && (
                <div
                    style={{
                        position: 'absolute',
                        inset: '-20%',
                        background: 'radial-gradient(circle, rgba(32, 128, 128, 0.2) 0%, transparent 70%)',
                        animation: 'logo-glow-pulse 3s ease-in-out infinite',
                        pointerEvents: 'none',
                        zIndex: -1,
                    }}
                />
            )}
            <style>{`
        @keyframes logo-glow-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
        </motion.div>
    );
}
