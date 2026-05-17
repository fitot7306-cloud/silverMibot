import React, { useEffect, useState } from 'react';
import api from '../../utils/api.js';
import { fmt } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';

export default function TeamPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const { t } = useTranslation();

  const load = async (p = 1) => {
    const r = await api.get(`/referrals?page=${p}`);
    if (p === 1) {
      setData(r.data);
    } else {
      setData(prev => ({ ...r.data, team: [...(prev?.team || []), ...r.data.team] }));
    }
    setPage(p);
  };

  useEffect(() => { load(); }, []);

  const copyLink = () => {
    if (!data?.ref_link) return;
    navigator.clipboard.writeText(data.ref_link);
    window.Telegram?.WebApp?.showAlert(t('team.link_copied', 'Скопировано!'));
  };

  const share = () => {
    if (!data?.ref_link) return;
    window.Telegram?.WebApp?.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(data.ref_link)}&text=${encodeURIComponent(t('team.share_text'))}`
    );
  };

  if (!data) return <div className="page" style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>...</div>;

  const s = data.settings || {};
  const powerPremium = s.power_premium || 6000;
  const powerNormal = s.power_normal || 3000;
  const commissionPct = s.commission_pct || 15;

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>📋</span>
          КОМАНДА
        </div>
        <div className="page-subtitle" style={{ fontSize: 12, marginTop: 4 }}>Приглашай друзей и зарабатывай</div>
      </div>

      {/* ── Referral Link Card ── */}
      <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          МОЯ РЕФЕРАЛЬНАЯ ССЫЛКА
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 14, color: '#fff', wordBreak: 'break-all' }}>
            {data.ref_link || 'silvermibot.com/ref/yourname'}
          </div>
          <button onClick={copyLink} style={{
            width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>РЕФЕРАЛОВ</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{data.stats.total}</div>
        </div>
        <div className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>ДОХОД (TON)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{fmt(data.rewards.total_ton, 8)}</div>
        </div>
        <div className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>ВЫПЛАЧЕНО</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>0.00000000</div>
        </div>
      </div>

      {/* ── Rewards Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⭐</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>+{powerPremium / 1000}K</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>POWER</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Premium</div>
        </div>
        <div className="card" style={{ padding: '16px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>👤</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>+{powerNormal / 1000}K</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>POWER</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Обычный</div>
        </div>
        <div className="card" style={{ padding: '16px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{commissionPct}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>КОМИССИЯ</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>С покупок</div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={share}>
          🤝 ПРИГЛАСИТЬ ДРУЗЕЙ
        </button>
        <button onClick={copyLink} style={{
          width: '100%', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '8px', color: '#fff', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          КОПИРОВАТЬ ССЫЛКУ
        </button>
      </div>
      
    </div>
  );
}
