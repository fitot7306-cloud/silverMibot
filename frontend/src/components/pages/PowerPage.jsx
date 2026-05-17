import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../../store/index.js';
import { fmt, fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';
import { useInterstitialAd } from '../../hooks/useInterstitialAd.js';
import api from '../../utils/api.js';

export default function PowerPage() {
  const { user, mining, fetchMining, collect, setTab, isAdmin } = useStore();
  const { t, i18n } = useTranslation();
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
  const tonPerDay = mining?.ton_per_day || 0;
  const tonPerMonth = mining?.ton_per_month || 0;
  const tonPerYear = tonPerDay * 365;
  const liveTon = liveHashes * (mining?.ton_per_hash || 0);

  return (
    <div className="page" style={{ position: 'relative' }}>
      
      {/* ── Deep Silver Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <div>
          <div className="text-silver" style={{
            fontSize: 22, fontWeight: 900, letterSpacing: 0.5,
            textTransform: 'uppercase', textShadow: '0 0 10px rgba(192,192,192,0.1)'
          }}>SILVERMIBOT</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Cloud Mining</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && (
            <button onClick={() => setTab('admin')} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              fontSize: 20, cursor: 'pointer'
            }}>⚙️</button>
          )}
          <button style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: 20, cursor: 'pointer'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <div className="card" onClick={() => showAdThen(() => setTab('withdraw'))} style={{
        marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', background: 'var(--bg-card)'
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>БАЛАНС</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>
            {fmt(tonBalance, 8)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>TON</div>
        </div>
        <div style={{
          width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #d4d4d4, #a3a3a3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
        }}>💰</div>
      </div>

      {/* ── Mined Today Card ── */}
      <div className="card" style={{ marginBottom: 16, padding: '24px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '4px solid rgba(255,255,255,0.05)', position: 'relative'
        }}>
          {/* Circular progress arc simulation */}
          <svg style={{ position: 'absolute', top: -4, left: -4, width: 88, height: 88, transform: 'rotate(-90deg)' }}>
            <circle cx="44" cy="44" r="40" fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray="251" strokeDashoffset="120" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 32, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' }}>⚡</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>ДОБЫТО СЕГОДНЯ</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{liveTon.toFixed(8)} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>TON</span></div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
            background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20, fontSize: 11
          }}>
            <span style={{ color: 'var(--primary)' }}>+0.00%</span>
            <span style={{ color: 'var(--text-muted)' }}>= {(liveTon).toFixed(8)} TON</span>
          </div>
        </div>
      </div>

      {/* ── Power Card & Exchange ── */}
      <div className="card" style={{ marginBottom: 16, padding: 0 }}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>POWER</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(power, 4)} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>GH/s</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>≈ {(liveTon).toFixed(8)} TON</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <svg width="80" height="30" viewBox="0 0 100 40" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
              <path d="M0 30 L10 20 L20 25 L30 15 L40 25 L50 10 L60 20 L70 5 L80 15 L90 5 L100 10" />
              <circle cx="100" cy="10" r="2" fill="var(--primary)" />
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 5px var(--primary)' }}></div>
              ОНЛАЙН
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-primary" onClick={handleCollectAndWithdraw} disabled={collecting || (liveHashes <= 0 && tonBalance <= 0)}>
            💎 ОБМЕНЯТЬ И ВЫВЕСТИ
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'ДЕНЬ', val: fmt(tonPerDay, 0), icon: '🕒' },
          { label: 'МЕСЯЦ', val: fmt(tonPerMonth, 0), icon: '📅' },
          { label: 'ГОД', val: fmt(tonPerYear, 0), icon: '📈' }
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '16px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 8, opacity: 0.8 }}>{item.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{item.val}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setTab('shop')} className="card" style={{
          padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, rgba(26,30,40,0.8), rgba(18,21,28,0.8))', cursor: 'pointer', border: 'none'
        }}>
          <div style={{ fontSize: 32 }}>⚡</div>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>КУПИТЬ<br/>POWER</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>УВЕЛИЧЬ ДОБЫЧУ</div>
        </button>
        
        <button onClick={() => setTab('tasks')} className="card" style={{
          padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          background: 'var(--bg-card)', cursor: 'pointer', border: 'none'
        }}>
          <div style={{ fontSize: 32 }}>🎁</div>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>ПОЛУЧИТЬ<br/>БЕСПЛАТНО</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ВЫПОЛНИ ЗАДАНИЯ</div>
        </button>
      </div>

    </div>
  );
}
