import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store/index.js';
import { fmt, fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';
import { useInterstitialAd } from '../../hooks/useInterstitialAd.js';
import api from '../../utils/api.js';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'uk', label: 'UA' },
  { code: 'ar', label: 'AR' },
];

// Floating hexagon particles
function HexParticles({ count = 15, active }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: 10 + Math.random() * 80,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 5,
      size: 3 + Math.random() * 4,
      opacity: 0.1 + Math.random() * 0.25,
    }));
  }, [count]);

  if (!active) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`,
          bottom: '-5%',
          width: p.size,
          height: p.size,
          borderRadius: '2px',
          background: `rgba(0, 212, 255, ${p.opacity})`,
          transform: 'rotate(45deg)',
          animation: `particleRise ${p.duration}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size * 2}px rgba(0, 212, 255, ${p.opacity * 0.5})`,
        }} />
      ))}
    </div>
  );
}

export default function PowerPage() {
  const { user, mining, fetchMining, collect, setTab, isAdmin, ambassadorVisible } = useStore();
  const { t, i18n } = useTranslation();
  const [showLang, setShowLang] = useState(false);
  const { showAdThen: monetagShowAd } = useInterstitialAd();

  // Adsgram interstitial
  const adsgramIntRef = useRef(null);

  useEffect(() => {
    api.get('/tasks/ad-config').then(r => {
      const blockId = r.data?.adsgram_interstitial_block_id;
      if (!blockId) return;
      const tryInit = () => {
        if (window.Adsgram) {
          try {
            adsgramIntRef.current = window.Adsgram.init({ blockId });
          } catch (e) {}
          return true;
        }
        return false;
      };
      if (!tryInit()) {
        const iv = setInterval(() => { if (tryInit()) clearInterval(iv); }, 500);
        setTimeout(() => clearInterval(iv), 5000);
      }
    }).catch(() => {});
  }, []);

  const showAdThen = useCallback(async (callback) => {
    if (adsgramIntRef.current) {
      try { await adsgramIntRef.current.show(); } catch (e) {}
    }
    callback();
  }, []);

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('silvermibot_lang', code);
    setShowLang(false);
  };
  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(null);
  const [liveHashes, setLiveHashes] = useState(0);
  const [orbPulse, setOrbPulse] = useState(false);

  useEffect(() => { fetchMining(); }, []);

  useEffect(() => {
    if (!mining) return;
    setLiveHashes(parseFloat(mining.hashes || 0));
    const hps = (mining.hashes_per_day || 0) / 86400;
    const interval = setInterval(() => setLiveHashes(prev => prev + hps), 1000);
    return () => clearInterval(interval);
  }, [mining]);

  const doExchange = async () => {
    if (collecting) return;
    if (liveHashes <= 0) { setTab('withdraw'); return; }
    setCollecting(true);
    setOrbPulse(true);
    try {
      const res = await collect();
      setCollected(res.ton_earned);
      setLiveHashes(0);
      setTimeout(() => setTab('withdraw'), 1500);
    } finally {
      setCollecting(false);
      setTimeout(() => setOrbPulse(false), 600);
    }
  };

  const handleCollectAndWithdraw = () => {
    if (collecting) return;
    monetagShowAd(doExchange);
  };

  const power = parseFloat(user?.power || 0);
  const tonBalance = parseFloat(user?.ton_balance || 0);
  const hashesPerDay = mining?.hashes_per_day || 0;

  return (
    <div className="page" style={{ position: 'relative' }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(99,102,241,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, border: '1px solid rgba(0,212,255,0.2)',
          }}>💠</div>
          <div>
            <div style={{
              fontSize: 17, fontWeight: 800, letterSpacing: 1.5,
              background: 'linear-gradient(135deg, var(--ice-light), var(--accent-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{t('power.brand')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5 }}>{t('power.subtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isAdmin && (
            <button onClick={() => setTab('admin')} style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '50%', width: 36, height: 36, cursor: 'pointer',
              fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🛡️</button>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLang(!showLang)} className="lang-btn">
              🌐 {LANGS.find(l => l.code === i18n.language)?.label || 'EN'}
            </button>
            {showLang && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: 'rgba(10,16,30,0.95)', backdropFilter: 'blur(20px)',
                border: '1px solid var(--border)', borderRadius: 12,
                padding: 4, zIndex: 100, minWidth: 80,
                animation: 'fadeIn 0.2s ease'
              }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)} style={{
                    display: 'block', width: '100%', padding: '8px 14px',
                    background: i18n.language === l.code ? 'rgba(0,212,255,0.1)' : 'transparent',
                    border: 'none', borderRadius: 8,
                    color: i18n.language === l.code ? 'var(--ice)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left', transition: 'var(--transition)'
                  }}>{l.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Strip (horizontal) ── */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, position: 'relative', zIndex: 1,
      }}>
        <div onClick={() => showAdThen(() => setTab('withdraw'))} style={{
          flex: 1, padding: '16px 14px',
          background: 'linear-gradient(160deg, rgba(0,212,255,0.06), rgba(99,102,241,0.04))',
          border: '1px solid rgba(0,212,255,0.12)', borderRadius: 16,
          cursor: 'pointer', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>{t('power.balance')}</div>
          <div style={{
            fontSize: 22, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--ice-light), var(--ice))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{fmt(tonBalance, 4)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>TON</div>
        </div>
        <div style={{
          flex: 1, padding: '16px 14px',
          background: 'linear-gradient(160deg, rgba(99,102,241,0.06), rgba(0,212,255,0.04))',
          border: '1px solid rgba(99,102,241,0.12)', borderRadius: 16,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>POWER</div>
          <div style={{
            fontSize: 22, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--accent-light), var(--accent))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{fmtK(Math.floor(power))}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>GH/s</div>
        </div>
      </div>

      {/* ── Ambassador Button ── */}
      {ambassadorVisible && (
      <button onClick={() => setTab('ambassador')} style={{
        width: '100%', padding: '12px 18px', marginBottom: 20,
        borderRadius: 14, border: '1px solid rgba(99,102,241,0.15)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(0,212,255,0.04))',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(0,212,255,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🤝</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-light)' }}>{t('power.ambassador', 'Амбассадор')}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5 }}>{t('power.ambassador_desc', 'Стань партнёром — зарабатывай больше')}</div>
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'var(--accent-light)', opacity: 0.5 }}>›</div>
      </button>
      )}

      {/* ── Mining Visualization (Horizontal Bar style instead of orb) ── */}
      <div style={{
        marginBottom: 20, position: 'relative', zIndex: 1, overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(6,11,24,0.9), rgba(15,23,42,0.7))',
        border: '1px solid rgba(0,212,255,0.08)',
        borderRadius: 20, padding: '24px 20px',
        backdropFilter: 'blur(10px)',
      }}>
        <HexParticles count={12} active={power > 0} />

        {/* Mining status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: power > 0
                ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(99,102,241,0.1))'
                : 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              border: `1px solid ${power > 0 ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
              animation: power > 0 ? 'pulse 3s ease-in-out infinite' : 'none',
            }}>⛏️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{t('power.mined')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{hashesPerDay.toFixed(1)} {t('power.h_per_day')}</div>
            </div>
          </div>
          {power > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 20,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
                animation: 'blink 2s infinite', boxShadow: '0 0 8px var(--green)',
              }} />
              <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>{t('power.mining_active')}</span>
            </div>
          )}
        </div>

        {/* Hash counter — big number */}
        <div style={{
          fontSize: 34, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--ice-light), var(--ice))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontFamily: "'Space Grotesk', monospace", letterSpacing: -0.5, marginBottom: 4,
          position: 'relative',
        }}>
          {liveHashes.toFixed(8)}
          <span style={{
            fontSize: 12, fontWeight: 500, marginLeft: 6,
            WebkitTextFillColor: 'var(--text-muted)',
          }}>{t('power.hashes')}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          ≈ {(liveHashes * (mining?.ton_per_hash || 0)).toFixed(8)} TON
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)',
          overflow: 'hidden', marginBottom: 16,
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${Math.min((liveHashes / Math.max(hashesPerDay || 1, 1)) * 100, 100)}%`,
            background: 'linear-gradient(90deg, var(--ice-dark), var(--ice), var(--accent-light))',
            transition: 'width 1s ease',
            boxShadow: '0 0 8px rgba(0,212,255,0.3)',
          }} />
        </div>

        {/* Collected toast */}
        {collected !== null && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12,
            padding: '14px 16px', marginBottom: 14, color: 'var(--green)',
            fontWeight: 700, textAlign: 'center', fontSize: 14,
            animation: 'fadeIn 0.3s ease',
          }}>
            {t('power.collected_success', { amount: fmt(collected, 6) })}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleCollectAndWithdraw}
          disabled={collecting || (liveHashes <= 0 && tonBalance <= 0)}
          style={{
            boxShadow: liveHashes > 0 ? '0 4px 24px rgba(0,212,255,0.2)' : 'none',
            position: 'relative', overflow: 'hidden', borderRadius: 14,
          }}
        >
          {liveHashes > 0 && (
            <span style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s ease-in-out infinite',
            }} />
          )}
          <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>💎</span>
            {collecting ? t('power.exchanging') : t('power.exchange_btn')}
          </span>
        </button>
      </div>

      {/* ── Earnings Forecast ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        marginBottom: 14, position: 'relative', zIndex: 1,
      }}>
        {[
          { label: t('power.day'), val: fmt(mining?.ton_per_day, 5), sub: 'TON' },
          { label: t('power.month'), val: fmt(mining?.ton_per_month, 4), sub: 'TON' },
          { label: t('power.three_months'), val: fmt(mining?.ton_per_3months, 3), sub: 'TON' },
        ].map((item, i) => (
          <div key={item.label} style={{
            animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            borderRadius: 14, padding: '14px 8px', textAlign: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{
              fontSize: 15, fontWeight: 800, color: 'var(--ice)',
            }}>{item.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Action Buttons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, position: 'relative', zIndex: 1 }}>
        <button className="btn-primary" onClick={() => setTab('shop')} style={{
          padding: '14px 16px', fontSize: 13, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span>⚡</span> {t('power.buy_power')}
        </button>
        <button className="btn-outline" onClick={() => setTab('tasks')} style={{
          padding: '14px 16px', fontSize: 13, borderRadius: 14,
          background: 'rgba(16,185,129,0.04)',
          borderColor: 'rgba(16,185,129,0.15)', color: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span>🎁</span> {t('power.free_power')}
        </button>
      </div>
    </div>
  );
}
