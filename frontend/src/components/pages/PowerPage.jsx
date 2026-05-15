import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store/index.js';
import { fmt, fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';
import { useInterstitialAd } from '../../hooks/useInterstitialAd.js';
import api from '../../utils/api.js';

const LANGS = [
  { code: 'en', label: '🇬🇧' },
  { code: 'ru', label: '🇷🇺' },
  { code: 'uk', label: '🇺🇦' },
  { code: 'ar', label: '🇸🇦' },
];

export default function PowerPage() {
  const { user, mining, fetchMining, collect, setTab, isAdmin, ambassadorVisible } = useStore();
  const { t, i18n } = useTranslation();
  const [showLang, setShowLang] = useState(false);
  const { showAdThen: monetagShowAd } = useInterstitialAd();
  const adsgramIntRef = useRef(null);

  useEffect(() => {
    api.get('/tasks/ad-config').then(r => {
      const blockId = r.data?.adsgram_interstitial_block_id;
      if (!blockId) return;
      const tryInit = () => {
        if (window.Adsgram) {
          try { adsgramIntRef.current = window.Adsgram.init({ blockId }); } catch (e) {}
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

  const showAdThen = useCallback(async (cb) => {
    if (adsgramIntRef.current) { try { await adsgramIntRef.current.show(); } catch (e) {} }
    cb();
  }, []);

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('silvermibot_lang', code);
    setShowLang(false);
  };

  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(null);
  const [liveHashes, setLiveHashes] = useState(0);

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
    try {
      const res = await collect();
      setCollected(res.ton_earned);
      setLiveHashes(0);
      setTimeout(() => setTab('withdraw'), 1500);
    } finally { setCollecting(false); }
  };

  const handleCollectAndWithdraw = () => {
    if (collecting) return;
    monetagShowAd(doExchange);
  };

  const power = parseFloat(user?.power || 0);
  const tonBalance = parseFloat(user?.ton_balance || 0);
  const hashesPerDay = mining?.hashes_per_day || 0;
  const tonPerDay = mining?.ton_per_day || 0;
  const tonPerMonth = mining?.ton_per_month || 0;

  return (
    <div className="page" style={{ position: 'relative' }}>

      {/* ── Minimal Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <div style={{
            fontSize: 22, fontWeight: 900, letterSpacing: -0.5,
            color: 'var(--text-primary)',
          }}>{t('power.brand')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setTab('admin')} style={{
              background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)',
              borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
              fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🛡️</button>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLang(!showLang)} style={{
              background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.08)',
              borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {LANGS.find(l => l.code === i18n.language)?.label || '🌐'}
            </button>
            {showLang && (
              <div style={{
                position: 'absolute', top: '110%', right: 0,
                background: 'rgba(13,19,25,0.97)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(52,211,153,0.1)', borderRadius: 14,
                padding: 6, zIndex: 100, minWidth: 52,
                animation: 'fadeIn 0.15s ease', display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)} style={{
                    padding: '8px 10px', background: i18n.language === l.code ? 'rgba(52,211,153,0.1)' : 'transparent',
                    border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer',
                    textAlign: 'center', transition: 'var(--transition)',
                    opacity: i18n.language === l.code ? 1 : 0.5,
                  }}>{l.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero: Balance ── */}
      <div onClick={() => showAdThen(() => setTab('withdraw'))} style={{
        marginBottom: 24, cursor: 'pointer',
        padding: '28px 24px',
        background: 'linear-gradient(145deg, rgba(52,211,153,0.05), rgba(167,139,250,0.03))',
        borderRadius: 24, border: '1px solid rgba(52,211,153,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle mesh */}
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 200, height: 200,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.06), transparent)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
          {t('power.balance')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 38, fontWeight: 900, letterSpacing: -1,
            color: 'var(--text-primary)',
          }}>{fmt(tonBalance, 4)}</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>TON</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, fontWeight: 600 }}>
          ⚡ {fmtK(Math.floor(power))} GH/s {t('power.subtitle')}
        </div>
      </div>

      {/* ── Ambassador ── */}
      {ambassadorVisible && (
        <button onClick={() => setTab('ambassador')} style={{
          width: '100%', padding: '14px 18px', marginBottom: 20,
          borderRadius: 16, border: '1px solid rgba(167,139,250,0.1)',
          background: 'rgba(167,139,250,0.04)',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 20 }}>🤝</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary-light)' }}>{t('power.ambassador', 'Амбассадор')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('power.ambassador_desc', 'Стань партнёром')}</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>
        </button>
      )}

      {/* ── Mining Module ── */}
      <div style={{
        marginBottom: 20, overflow: 'hidden',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 24, padding: '22px 20px',
      }}>
        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: power > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              border: `1px solid ${power > 0 ? 'rgba(52,211,153,0.12)' : 'transparent'}`,
            }}>⛏️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t('power.mined')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{hashesPerDay.toFixed(1)} {t('power.h_per_day')}</div>
            </div>
          </div>
          {power > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 20,
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: 'var(--green)',
                animation: 'blink 2s infinite',
              }} />
              <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>{t('power.mining_active')}</span>
            </div>
          )}
        </div>

        {/* Big number */}
        <div style={{
          fontSize: 36, fontWeight: 900, letterSpacing: -1,
          color: 'var(--text-primary)',
          fontFamily: "'Outfit', monospace", marginBottom: 3,
        }}>
          {liveHashes.toFixed(8)}
          <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 6, color: 'var(--text-muted)' }}>{t('power.hashes')}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
          ≈ {(liveHashes * (mining?.ton_per_hash || 0)).toFixed(8)} TON
        </div>

        {/* Thin progress line */}
        <div style={{
          height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.03)',
          overflow: 'hidden', marginBottom: 18,
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${Math.min((liveHashes / Math.max(hashesPerDay || 1, 1)) * 100, 100)}%`,
            background: 'linear-gradient(90deg, var(--primary-dark), var(--primary))',
            transition: 'width 1s linear',
          }} />
        </div>

        {/* Collect toast */}
        {collected !== null && (
          <div style={{
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 12, padding: '12px', marginBottom: 14,
            color: 'var(--green)', fontWeight: 700, textAlign: 'center', fontSize: 14,
            animation: 'fadeIn 0.3s ease',
          }}>
            {t('power.collected_success', { amount: fmt(collected, 6) })}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleCollectAndWithdraw}
          disabled={collecting || (liveHashes <= 0 && tonBalance <= 0)}
          style={{ borderRadius: 14 }}
        >
          {collecting ? t('power.exchanging') : `💎 ${t('power.exchange_btn')}`}
        </button>
      </div>

      {/* ── Forecast: Bento Grid ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginBottom: 16,
      }}>
        {/* Day — full width left */}
        <div style={{
          gridRow: 'span 2', padding: '20px 16px',
          background: 'rgba(52,211,153,0.03)',
          border: '1px solid rgba(52,211,153,0.06)',
          borderRadius: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase', fontWeight: 600 }}>{t('power.day')}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', letterSpacing: -0.5 }}>{fmt(tonPerDay, 5)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>TON / day</div>
        </div>

        {/* Month */}
        <div style={{
          padding: '16px 14px',
          background: 'rgba(167,139,250,0.03)',
          border: '1px solid rgba(167,139,250,0.06)',
          borderRadius: 18, animation: 'fadeIn 0.3s ease 0.05s both',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{t('power.month')}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--secondary-light)' }}>{fmt(tonPerMonth, 4)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>TON</div>
        </div>

        {/* 3 Months */}
        <div style={{
          padding: '16px 14px',
          background: 'rgba(251,191,36,0.03)',
          border: '1px solid rgba(251,191,36,0.06)',
          borderRadius: 18, animation: 'fadeIn 0.3s ease 0.1s both',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{t('power.three_months')}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{fmt(mining?.ton_per_3months, 3)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>TON</div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setTab('shop')} style={{
          flex: 1, padding: '15px 16px', fontSize: 13, fontWeight: 700,
          borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
          color: '#000', transition: 'var(--transition)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          ⚡ {t('power.buy_power')}
        </button>
        <button onClick={() => setTab('tasks')} style={{
          flex: 1, padding: '15px 16px', fontSize: 13, fontWeight: 700,
          borderRadius: 14, border: '1.5px solid rgba(34,197,94,0.12)',
          background: 'rgba(34,197,94,0.04)', color: 'var(--green)',
          cursor: 'pointer', transition: 'var(--transition)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          🎁 {t('power.free_power')}
        </button>
      </div>
    </div>
  );
}
