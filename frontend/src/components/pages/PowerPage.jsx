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
      
      {/* ── Silver Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div className="text-silver" style={{
            fontSize: 22, fontWeight: 900, letterSpacing: 1,
            textTransform: 'uppercase'
          }}>{t('power.brand', 'SilverMibot')}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2 }}>{t('power.subtitle', 'Platinum Edition')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAdmin && (
            <button onClick={() => setTab('admin')} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, width: 34, height: 34, cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>⚙️</button>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLang(!showLang)} className="lang-btn">
              {LANGS.find(l => l.code === i18n.language)?.label || '🌐'}
            </button>
            {showLang && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 4, zIndex: 100, minWidth: 50,
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 2
              }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)} style={{
                    padding: '8px', background: i18n.language === l.code ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer'
                  }}>{l.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <div className="card" onClick={() => showAdThen(() => setTab('withdraw'))} style={{
        marginBottom: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 20px'
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>{t('power.balance')}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>
            {fmt(tonBalance, 4)} <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500 }}>TON</span>
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid var(--border)'
        }}>💰</div>
      </div>

      {/* ── Main Action Card ── */}
      <div className="card" style={{ marginBottom: 20, padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--silver-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#000'
          }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('power.mined', 'Mining Status')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hashesPerDay.toFixed(1)} {t('power.h_per_day')}</div>
          </div>
          {power > 0 && (
            <div style={{
              fontSize: 10, color: 'var(--green)', background: 'rgba(74, 222, 128, 0.1)',
              padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(74, 222, 128, 0.2)',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5
            }}>• {t('power.mining_active', 'Active')}</div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>POWER: {fmtK(Math.floor(power))} GH/s</div>
          <div className="text-silver" style={{
            fontSize: 40, fontWeight: 900, letterSpacing: -1, fontFamily: 'monospace'
          }}>
            {liveHashes.toFixed(8)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
             ≈ {(liveHashes * (mining?.ton_per_hash || 0)).toFixed(8)} TON
          </div>
        </div>

        {collected !== null && (
          <div style={{
            background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)',
            borderRadius: 10, padding: 12, marginBottom: 16, color: 'var(--green)',
            fontWeight: 700, textAlign: 'center', fontSize: 13
          }}>
            {t('power.collected_success', { amount: fmt(collected, 6) })}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleCollectAndWithdraw}
          disabled={collecting || (liveHashes <= 0 && tonBalance <= 0)}
        >
          {collecting ? t('power.exchanging') : t('power.exchange_btn')}
        </button>
      </div>

      {/* ── Forecast Info ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: t('power.day'), val: fmt(tonPerDay, 4), icon: '🕒' },
          { label: t('power.month'), val: fmt(tonPerMonth, 3), icon: '📅' },
          { label: '90D', val: fmt(mining?.ton_per_3months, 2), icon: '📈' }
        ].map((item, i) => (
          <div key={i} className="stat-pill">
            <div style={{ fontSize: 12, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{item.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab('shop')} className="btn-primary" style={{ flex: 1, padding: '16px' }}>
          🛒 {t('power.buy_power')}
        </button>
        <button onClick={() => setTab('tasks')} className="btn-outline" style={{ flex: 1, padding: '16px' }}>
          🎁 {t('power.free_power')}
        </button>
      </div>

      {ambassadorVisible && (
        <div className="card" onClick={() => setTab('ambassador')} style={{
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '16px'
        }}>
          <div style={{ fontSize: 20 }}>🤝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('power.ambassador')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('power.ambassador_desc')}</div>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>›</div>
        </div>
      )}

    </div>
  );
}
