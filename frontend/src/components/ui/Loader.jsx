import React from 'react';

// Logo as inline SVG placeholder — actual logo loaded via img tag
const LOGO_URL = 'https://i.imgur.com/placeholder.png'; // Will use CSS gradient instead

export default function Loader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#08080C', gap: 24,
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(192,192,192,0.08) 0%, transparent 70%)',
        filter: 'blur(60px)', top: '30%', left: '50%', transform: 'translate(-50%, -50%)'
      }} />
      <div style={{
        position: 'absolute', width: 150, height: 150, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,180,255,0.06) 0%, transparent 70%)',
        filter: 'blur(40px)', top: '25%', left: '35%'
      }} />

      {/* Logo container with glow ring */}
      <div style={{
        position: 'relative',
        animation: 'loaderFloat 3s ease-in-out infinite',
      }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, rgba(192,192,192,0.3), transparent, rgba(100,180,255,0.2), transparent)',
          animation: 'loaderSpin 4s linear infinite',
          filter: 'blur(2px)',
        }} />
        {/* Inner circle with silver gradient */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a1d25, #2a2d35, #1a1d25)',
          border: '2px solid rgba(192,192,192,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(192,192,192,0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        }}>
          {/* Lightning bolt icon */}
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" 
              fill="url(#bolt-grad)" stroke="rgba(192,192,192,0.5)" strokeWidth="0.5" />
            <defs>
              <linearGradient id="bolt-grad" x1="4" y1="2" x2="18" y2="22">
                <stop offset="0%" stopColor="#C0C0C0" />
                <stop offset="50%" stopColor="#E8E8E8" />
                <stop offset="100%" stopColor="#8A8A8A" />
              </linearGradient>
            </defs>
          </svg>
          {/* Glowing eyes effect */}
          <div style={{
            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            width: 40, height: 3, borderRadius: 2,
            background: 'linear-gradient(90deg, transparent, rgba(150,200,255,0.6), transparent)',
            animation: 'loaderPulse 2s ease-in-out infinite',
          }} />
        </div>
      </div>

      {/* Brand name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 22, fontWeight: 900, letterSpacing: 4,
          fontFamily: "'Inter', sans-serif",
          background: 'linear-gradient(135deg, #A0A0A0, #E0E0E0, #A0A0A0)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textShadow: 'none',
        }}>
          SILVERMIBOT
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 6,
          color: 'rgba(192,192,192,0.3)',
          textTransform: 'uppercase',
        }}>
          Cloud Mining
        </span>
      </div>

      {/* Loading bar */}
      <div style={{
        width: 140, height: 3, borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', marginTop: 8,
      }}>
        <div style={{
          width: '40%', height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, transparent, rgba(192,192,192,0.6), transparent)',
          animation: 'loaderSlide 1.5s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes loaderFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes loaderSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes loaderPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes loaderSlide {
          0% { transform: translateX(-140px); }
          100% { transform: translateX(350px); }
        }
      `}</style>
    </div>
  );
}
