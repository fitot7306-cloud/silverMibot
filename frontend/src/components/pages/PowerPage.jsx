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
  
  const progressPct = Math.min((liveHashes / Math.max(hashesPerDay || 1, 1)) * 100, 100);

  return (
    <div className="page" style={{ position: 'relative' }}>
      
      {/* ── Top Navigation ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, padding: '0 4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(192, 38, 211, 0.2), rgba(6, 182, 212, 0.2))',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(192, 38, 211, 0.3), inset 0 0 10px rgba(6, 182, 212, 0.2)',
            fontSize: 20
          }}>✨</div>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 800, letterSpacing: 0.5,
              background: 'linear-gradient(135deg, #fff, var(--secondary-light))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{t('power.brand', 'SilverMibot')}</div>
            <div style={{ fontSize: 11, color: 'var(--secondary)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
              {t('power.subtitle', 'Deep Space')}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setTab('admin')} className="lang-btn" style={{ padding: '8px', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🛡️
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLang(!showLang)} className="lang-btn" style={{ borderRadius: 14 }}>
              {LANGS.find(l => l.code === i18n.language)?.label || 'EN'} ▾
            </button>
            {showLang && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'rgba(11, 17, 32, 0.95)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(192, 38, 211, 0.2)', borderRadius: 16,
                padding: 6, zIndex: 100, minWidth: 80,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: 2,
                animation: 'fadeIn 0.2s ease'
              }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)} style={{
                    padding: '10px 12px', background: i18n.language === l.code ? 'rgba(192, 38, 211, 0.15)' : 'transparent',
                    border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                    textAlign: 'left', transition: 'var(--transition)', fontWeight: 700,
                    color: i18n.language === l.code ? '#fff' : 'var(--text-muted)'
                  }}>{l.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Hub ── */}
      <div className="card" style={{ marginBottom: 20, padding: 0, borderRadius: 28, overflow: 'hidden' }}>
        
        {/* Top half: Balance & Power */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div onClick={() => showAdThen(() => setTab('withdraw'))} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 10px var(--secondary)' }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{t('power.balance')}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                {fmt(tonBalance, 4)} <span style={{ fontSize: 14, color: 'var(--secondary)' }}>TON</span>
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>POWER</div>
              </div>
              <div className="text-gradient" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                {fmtK(Math.floor(power))} <span style={{ fontSize: 14, color: 'var(--primary-light)' }}>GH/s</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom half: Mining Display */}
        <div style={{ padding: '24px 20px', position: 'relative' }}>
          {power > 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '100%', height: '100%',
              background: 'radial-gradient(circle at center, rgba(192, 38, 211, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('power.mined')}</div>
            {power > 0 && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--secondary)',
                padding: '4px 10px', borderRadius: 12, background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--secondary)', animation: 'blink 1.5s infinite' }} />
                {t('power.mining_active', 'Active')}
              </div>
            )}
          </div>
          
          {/* Neon Progress Bar */}
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                borderRadius: 3, boxShadow: '0 0 10px var(--primary)',
                transition: 'width 1s linear'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>0</span>
              <span>{hashesPerDay.toFixed(1)} {t('power.h_per_day')}</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <div style={{
              fontSize: 42, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', monospace",
              color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.2)', letterSpacing: -1
            }}>
              {liveHashes.toFixed(8)}
            </div>
            <div style={{ fontSize: 14, color: 'var(--secondary-light)', fontWeight: 600, marginTop: 4 }}>
              ≈ {(liveHashes * (mining?.ton_per_hash || 0)).toFixed(8)} TON
            </div>
          </div>

          {collected !== null && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 12, padding: '12px', marginBottom: 16,
              color: 'var(--green)', fontWeight: 700, textAlign: 'center', fontSize: 13,
            }}>
              {t('power.collected_success', { amount: fmt(collected, 6) })}
            </div>
          )}
          
          <button
            className="btn-primary"
            onClick={handleCollectAndWithdraw}
            disabled={collecting || (liveHashes <= 0 && tonBalance <= 0)}
            style={{ borderRadius: 16, padding: '18px', fontSize: 16 }}
          >
            {collecting ? t('power.exchanging') : t('power.exchange_btn')}
          </button>
        </div>
      </div>

      {/* ── Grid Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        
        {/* Forecast Box */}
        <div className="card" style={{ gridColumn: '1 / -1', padding: '20px 24px', borderRadius: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            Forecast
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{t('power.day')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{fmt(tonPerDay, 5)} <span style={{fontSize:10, color:'var(--text-muted)'}}>TON</span></div>
            </div>
            <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{t('power.month')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{fmt(tonPerMonth, 4)} <span style={{fontSize:10, color:'var(--text-muted)'}}>TON</span></div>
            </div>
            <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{t('power.three_months')}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{fmt(mining?.ton_per_3months, 3)} <span style={{fontSize:10, color:'var(--text-muted)'}}>TON</span></div>
            </div>
          </div>
        </div>

        {/* Shop Button */}
        <button onClick={() => setTab('shop')} style={{
          background: 'rgba(192, 38, 211, 0.05)', border: '1px solid rgba(192, 38, 211, 0.2)',
          borderRadius: 20, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer', transition: 'var(--transition)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 8px 20px rgba(192,38,211,0.3)' }}>
            ⚡
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{t('power.buy_power')}</div>
        </button>

        {/* Tasks Button */}
        <button onClick={() => setTab('tasks')} style={{
          background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 20, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer', transition: 'var(--transition)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🎁
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--secondary)' }}>{t('power.free_power')}</div>
        </button>
      </div>

      {ambassadorVisible && (
        <button onClick={() => setTab('ambassador')} style={{
          width: '100%', padding: '16px 20px',
          borderRadius: 20, border: '1px solid rgba(139, 92, 246, 0.2)',
          background: 'rgba(139, 92, 246, 0.05)',
          display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤝</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-light)' }}>{t('power.ambassador', 'Амбассадор')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{t('power.ambassador_desc', 'Стань партнёром')}</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>→</span>
        </button>
      )}

    </div>
  );
}
