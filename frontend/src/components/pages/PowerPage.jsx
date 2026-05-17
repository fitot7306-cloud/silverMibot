import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store/index.js';
import { fmt } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';
import { useInterstitialAd } from '../../hooks/useInterstitialAd.js';
import api from '../../utils/api.js';

export default function PowerPage() {
  const { user, mining, fetchMining, collect, setTab } = useStore();
  const { t, i18n } = useTranslation();
  const { showAdThen: monetagShowAd } = useInterstitialAd();
  const [gestureHint, setGestureHint] = useState(null);

  // Secret admin access: tap logo 5 times quickly (like Android dev mode)
  const tapCountRef = React.useRef(0);
  const tapTimerRef = React.useRef(null);
  const checkingRef = React.useRef(false);

  const handleLogoTap = useCallback(async () => {
    if (checkingRef.current) return;
    tapCountRef.current++;

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2500);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      checkingRef.current = true;
      setGestureHint('🔍');
      try {
        const { data } = await api.get('/admin/check-admin');
        if (data.isAdmin) {
          setGestureHint('✅');
          setTimeout(() => { setGestureHint(null); setTab('admin'); }, 400);
        } else {
          setGestureHint('❌');
          setTimeout(() => setGestureHint(null), 1200);
        }
      } catch (e) {
        setGestureHint('❌');
        setTimeout(() => setGestureHint(null), 1200);
      } finally {
        checkingRef.current = false;
      }
    } else if (tapCountRef.current >= 3) {
      // Subtle hint after 3 taps
      setGestureHint(`${5 - tapCountRef.current}`);
      setTimeout(() => setGestureHint(null), 800);
    }
  }, [setTab]);

  const [collecting, setCollecting] = useState(false);
  const [liveHashes, setLiveHashes] = useState(0);

  useEffect(() => { fetchMining(); }, []);

  useEffect(() => {
    if (!mining) return;
    setLiveHashes(parseFloat(mining.hashes || 0));
    const hps = (mining.hashes_per_day || 0) / 86400;
    const interval = setInterval(() => setLiveHashes(prev => prev + hps), 1000);
    return () => clearInterval(interval);
  }, [mining]);

  const handleCollectAndWithdraw = () => {
    if (collecting) return;
    if (liveHashes <= 0) { setTab('withdraw'); return; }
    setCollecting(true);
    monetagShowAd(async () => {
      try {
        await collect();
        setLiveHashes(0);
        setTimeout(() => setTab('withdraw'), 500);
      } finally { setCollecting(false); }
    });
  };

  const power = parseFloat(user?.power || 0);
  const tonBalance = parseFloat(user?.ton_balance || 0);
  const hashesPerDay = mining?.hashes_per_day || 0;
  const tonPerDay = mining?.ton_per_day || 0;
  const tonPerMonth = mining?.ton_per_month || 0;
  const tonPerYear = tonPerDay * 365;
  const liveTon = liveHashes * (mining?.ton_per_hash || 0);

  return (
    <div className="page" style={{ position: 'relative' }}>
      
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div onClick={handleLogoTap} style={{ cursor: 'default', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
          <div className="text-silver" style={{
            fontSize: 24, fontWeight: 900, letterSpacing: 1,
            textTransform: 'uppercase'
          }}>SILVERMIBOT</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5 }}>Cloud Mining</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Gesture hint indicator */}
          {gestureHint && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, animation: 'fadeIn 0.2s ease',
            }}>{gestureHint}</div>
          )}
          <button onClick={() => {
            const langs = ['ru', 'en', 'uk', 'ar'];
            const flags = { ru: '🇷🇺', en: '🇬🇧', uk: '🇺🇦', ar: '🇸🇦' };
            const cur = i18n.language || 'ru';
            const idx = langs.indexOf(cur);
            const next = langs[(idx + 1) % langs.length];
            i18n.changeLanguage(next);
          }} style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18,
            transition: 'var(--transition)'
          }}>
            {{ ru: '🇷🇺', en: '🇬🇧', uk: '🇺🇦', ar: '🇸🇦' }[i18n.language] || '🌐'}
          </button>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <div className="card" onClick={() => setTab('withdraw')} style={{
        marginBottom: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 22px'
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>{t('power.balance')}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            {fmt(tonBalance, 8)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>TON</div>
        </div>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'var(--silver-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
          animation: 'glow-pulse 3s ease-in-out infinite'
        }}>💎</div>
      </div>

      {/* ── Mined Today Card ── */}
      <div className="card" style={{ marginBottom: 14, padding: '22px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'rgba(10,12,16,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', flexShrink: 0
        }}>
          <svg style={{ position: 'absolute', top: -4, left: -4, width: 88, height: 88, transform: 'rotate(-90deg)' }}>
            <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
            <circle cx="44" cy="44" r="38" fill="none" stroke="var(--primary)" strokeWidth="3"
              strokeDasharray="239" strokeDashoffset={239 - (power > 0 ? 130 : 10)} strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(192,192,192,0.4))' }} />
          </svg>
          <div style={{ fontSize: 30, filter: 'drop-shadow(0 0 10px rgba(192,192,192,0.5))' }}>⚡</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>{t('power.mined_today')}</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, fontFamily: 'monospace' }}>{liveHashes.toFixed(8)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('power.hashes')}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
            background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 20, fontSize: 11
          }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>≈</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}>{liveTon.toFixed(8)} TON</span>
          </div>
        </div>
      </div>

      {/* ── Power Card & Exchange ── */}
      <div className="card" style={{ marginBottom: 14, padding: 0 }}>
        <div style={{ padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>POWER</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              {fmt(power, 4)} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>GH/s</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>≈ {(liveTon).toFixed(8)} TON</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            {/* Mini chart */}
            <svg width="90" height="32" viewBox="0 0 100 40" fill="none">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(192,192,192,0.15)" />
                  <stop offset="100%" stopColor="rgba(192,192,192,0)" />
                </linearGradient>
              </defs>
              <path d="M0 35 L10 25 L20 28 L30 18 L40 28 L50 12 L60 22 L70 8 L80 18 L90 8 L100 12 L100 40 L0 40Z" fill="url(#chartFill)" />
              <path d="M0 35 L10 25 L20 28 L30 18 L40 28 L50 12 L60 22 L70 8 L80 18 L90 8 L100 12" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
              <circle cx="100" cy="12" r="3" fill="var(--primary)" style={{ filter: 'drop-shadow(0 0 4px rgba(192,192,192,0.6))' }} />
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#4ade80',
                boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                animation: 'pulse 2s ease-in-out infinite'
              }}></div>
              {t('power.online')}
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-primary" onClick={handleCollectAndWithdraw} disabled={collecting || (liveHashes <= 0 && tonBalance <= 0)}>
            {t('power.exchange_btn')}
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: t('power.day'), val: fmt(tonPerDay, 4), icon: '◇' },
          { label: t('power.month'), val: fmt(tonPerMonth, 3), icon: '◈' },
          { label: t('power.year'), val: fmt(tonPerYear, 2), icon: '❖' }
        ].map((item, i) => (
          <div key={i} className="card" style={{
            padding: '16px 8px', textAlign: 'center',
            animation: `fadeIn 0.35s ease ${i * 0.08}s both`
          }}>
            <div style={{ fontSize: 18, marginBottom: 6, color: 'var(--primary)', textShadow: '0 0 8px rgba(192,192,192,0.4)' }}>{item.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{item.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab('shop')} style={{
          padding: '22px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          background: 'var(--card-gradient), rgba(16,19,26,0.9)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer', color: 'var(--text-primary)',
          fontFamily: 'inherit', transition: 'var(--transition)'
        }}>
          <div style={{ fontSize: 30, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>⚡</div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.4 }}>{t('power.buy_power')}<br/>{t('power.buy_power_sub')}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 500 }}>{t('power.buy_power_desc')}</div>
        </button>
        
        <button onClick={() => setTab('tasks')} style={{
          padding: '22px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          background: 'var(--card-gradient), rgba(16,19,26,0.9)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer', color: 'var(--text-primary)',
          fontFamily: 'inherit', transition: 'var(--transition)'
        }}>
          <div style={{ fontSize: 30, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>🎁</div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.4 }}>{t('power.free_power')}<br/>{t('power.free_power_sub')}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 500 }}>{t('power.free_power_desc')}</div>
        </button>
      </div>

    </div>
  );
}
