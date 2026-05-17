import React from 'react';
import logoImg from '../../assets/logo.png';

export default function Loader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#08080C', gap: 20,
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(192,192,192,0.1) 0%, transparent 70%)',
        filter: 'blur(60px)', top: '30%', left: '50%', transform: 'translate(-50%, -50%)'
      }} />

      {/* Logo with glow ring */}
      <div style={{
        position: 'relative',
        animation: 'loaderFloat 3s ease-in-out infinite',
      }}>
        {/* Spinning glow ring */}
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent, rgba(192,192,192,0.35), transparent, rgba(100,180,255,0.2), transparent)',
          animation: 'loaderSpin 4s linear infinite',
          filter: 'blur(3px)',
        }} />
        {/* Logo image */}
        <img
          src={logoImg}
          alt="SilverMiBot"
          style={{
            width: 120, height: 120, borderRadius: '50%',
            position: 'relative',
            boxShadow: '0 0 50px rgba(192,192,192,0.2), 0 0 100px rgba(100,180,255,0.08)',
          }}
        />
      </div>

      {/* Brand text */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 6,
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
        overflow: 'hidden', marginTop: 4,
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
        @keyframes loaderSlide {
          0% { transform: translateX(-140px); }
          100% { transform: translateX(350px); }
        }
      `}</style>
    </div>
  );
}
