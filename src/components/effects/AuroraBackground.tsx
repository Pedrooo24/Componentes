/**
 * Aurora Background — CSS Pure (no WebGL)
 * Teal #208080 palette
 */
export function AuroraBackground() {
  return (
    <div className="aurora-container">
      <div className="aurora-layer aurora-1" />
      <div className="aurora-layer aurora-2" />
      <div className="aurora-layer aurora-3" />
      <style>{`
        .aurora-container {
          position: fixed;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          background: #0d1117;
        }
        .aurora-layer {
          position: absolute;
          width: 150%;
          height: 150%;
          opacity: 0.25;
          filter: blur(80px);
          will-change: transform;
        }
        .aurora-1 {
          background: radial-gradient(ellipse at 30% 20%, #208080 0%, transparent 50%);
          top: -25%;
          left: -25%;
          animation: aurora-drift-1 15s ease-in-out infinite;
        }
        .aurora-2 {
          background: radial-gradient(ellipse at 70% 80%, #1a6a6a 0%, transparent 45%);
          bottom: -25%;
          right: -25%;
          animation: aurora-drift-2 18s ease-in-out infinite;
        }
        .aurora-3 {
          background: radial-gradient(ellipse at 50% 50%, #165c5c 0%, transparent 40%);
          top: 25%;
          left: 25%;
          animation: aurora-drift-3 20s ease-in-out infinite;
        }
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(5%, 10%) rotate(5deg) scale(1.05); }
          66% { transform: translate(-5%, 5%) rotate(-3deg) scale(0.95); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-8%, -5%) rotate(-4deg) scale(1.08); }
          66% { transform: translate(5%, -8%) rotate(6deg) scale(0.92); }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(10%, -10%) rotate(8deg) scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export function GridOverlay() {
  return (
    <div className="grid-overlay">
      <style>{`
        .grid-overlay {
          position: fixed;
          inset: 0;
          z-index: 1;
          background-image:
            linear-gradient(rgba(32, 128, 128, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32, 128, 128, 0.025) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
