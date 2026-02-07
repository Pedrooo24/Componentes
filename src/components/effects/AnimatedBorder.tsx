import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedBorderProps {
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

export function AnimatedBorder({ children, isActive = false, className = '' }: AnimatedBorderProps) {
  return (
    <div className={`animated-border-wrapper ${isActive ? 'active' : ''} ${className}`}>
      <div className="animated-border-gradient" />
      <div className="animated-border-content">
        {children}
      </div>
      <style>{`
        .animated-border-wrapper {
          position: relative;
          border-radius: 12px;
          padding: 2px;
          overflow: hidden;
          background: #161b22;
        }
        .animated-border-gradient {
          position: absolute;
          inset: 0;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            #208080 60deg,
            #1a6a6a 120deg,
            transparent 180deg,
            transparent 360deg
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          animation: border-spin 4s linear infinite paused;
        }
        .animated-border-wrapper:hover .animated-border-gradient,
        .animated-border-wrapper.active .animated-border-gradient {
          opacity: 1;
          animation-play-state: running;
        }
        .animated-border-wrapper.active .animated-border-gradient {
          background: conic-gradient(
            from 0deg,
            #208080 0deg,
            #2aa0a0 90deg,
            #1a6a6a 180deg,
            #165c5c 270deg,
            #208080 360deg
          );
        }
        @keyframes border-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animated-border-content {
          position: relative;
          background: #161b22;
          border-radius: 10px;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}

export function GlowButton({
  children, onClick, disabled = false, variant = 'primary'
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <motion.button
      className={`glow-button ${variant} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <span className="glow-button-bg" />
      <span className="glow-button-text">{children}</span>
      <style>{`
        .glow-button {
          position: relative;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          overflow: hidden;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .glow-button.primary {
          background: linear-gradient(135deg, #208080, #1a6a6a);
          color: #f0f6fc;
          box-shadow: 0 0 20px rgba(32, 128, 128, 0.25);
        }
        .glow-button.primary:hover:not(.disabled) {
          box-shadow: 0 0 30px rgba(32, 128, 128, 0.4);
        }
        .glow-button.secondary {
          background: transparent;
          color: #208080;
          border: 1px solid #30363d;
        }
        .glow-button.secondary:hover:not(.disabled) {
          border-color: #208080;
          box-shadow: 0 0 15px rgba(32, 128, 128, 0.15);
        }
        .glow-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .glow-button-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .glow-button:hover:not(.disabled) .glow-button-bg {
          opacity: 1;
        }
        .glow-button-text {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </motion.button>
  );
}

export function PulseDot({ status }: { status: 'online' | 'offline' | 'loading' }) {
  return (
    <span className={`pulse-dot ${status}`}>
      <style>{`
        .pulse-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
        }
        .pulse-dot.online {
          background: #208080;
          box-shadow: 0 0 8px #208080;
          animation: pulse-online 2s ease-in-out infinite;
        }
        .pulse-dot.offline { background: #f87171; }
        .pulse-dot.loading {
          background: #fbbf24;
          animation: pulse-loading 1s ease-in-out infinite;
        }
        @keyframes pulse-online {
          0%, 100% { box-shadow: 0 0 8px #208080; }
          50% { box-shadow: 0 0 16px #208080, 0 0 24px rgba(32, 128, 128, 0.3); }
        }
        @keyframes pulse-loading {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
}
