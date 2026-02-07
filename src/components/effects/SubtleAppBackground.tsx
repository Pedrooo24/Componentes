/**
 * SubtleAppBackground
 * Ultra-subtle dashboard background — #208080 palette, CSS-only.
 */
export function SubtleAppBackground() {
  return (
    <div className="subtle-app-bg" aria-hidden>
      <div className="subtle-app-bg__layer subtle-app-bg__layer--a" />
      <div className="subtle-app-bg__layer subtle-app-bg__layer--b" />
      <div className="subtle-app-bg__grid" />
      <div className="subtle-app-bg__lines" />

      <style>{`
        .subtle-app-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: #0d1117;
        }
        .subtle-app-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(1200px circle at 50% -10%, rgba(32, 128, 128, 0.06), rgba(13, 17, 23, 0.9));
          opacity: 0.6;
        }
        .subtle-app-bg__layer {
          position: absolute;
          inset: -25%;
          opacity: 0.07;
          will-change: transform;
        }
        .subtle-app-bg__layer--a {
          background: radial-gradient(600px circle at 18% 12%, rgba(32, 128, 128, 0.5) 0%, rgba(32, 128, 128, 0) 55%);
          animation: subtle-drift-a 32s ease-in-out infinite;
        }
        .subtle-app-bg__layer--b {
          background: radial-gradient(700px circle at 82% 88%, rgba(42, 160, 160, 0.3) 0%, rgba(42, 160, 160, 0) 58%);
          animation: subtle-drift-b 38s ease-in-out infinite;
          opacity: 0.05;
        }
        .subtle-app-bg__grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(32, 128, 128, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(32, 128, 128, 0.015) 1px, transparent 1px);
          background-size: 72px 72px;
          opacity: 0.55;
        }
        .subtle-app-bg__lines {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            135deg,
            rgba(32, 128, 128, 0.01) 0px,
            rgba(32, 128, 128, 0.01) 1px,
            transparent 1px,
            transparent 18px
          );
          opacity: 0.75;
          mask-image: radial-gradient(circle at 50% 30%, rgba(0,0,0,0.75), rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%);
        }
        @keyframes subtle-drift-a {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(2%, -1.5%, 0) scale(1.02); }
        }
        @keyframes subtle-drift-b {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-1.5%, 2%, 0) scale(1.015); }
        }
      `}</style>
    </div>
  );
}
