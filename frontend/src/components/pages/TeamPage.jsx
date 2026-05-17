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
    window.Telegram?.WebApp?.showAlert('Скопировано!');
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
      <div style={{ marginBottom: 22 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>👥</span>
          {t('team.title')}
        </div>
        <div className="page-subtitle">{t('team.subtitle')}</div>
      </div>

      {/* ── Referral Link Card ── */}
      <div className="card" style={{ marginBottom: 14, padding: '18px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 600 }}>
          {t('team.ref_link_label')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all',
            background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', fontFamily: 'monospace'
          }}>
            {data.ref_link || 'silvermibot.com/ref/...'}
          </div>
          <button onClick={copyLink} style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, transition: 'var(--transition)'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: t('team.referrals_count'), val: data.stats.total },
          { label: t('team.income_ton'), val: fmt(data.rewards.total_ton, 8) },
          { label: t('team.paid_out'), val: '0.00000000' }
        ].map((item, i) => (
          <div key={i} className="card" style={{
            padding: '14px 8px', textAlign: 'center',
            animation: `fadeIn 0.35s ease ${i * 0.08}s both`
          }}>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* ── Rewards Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '⭐', val: `+${powerPremium / 1000}K`, sub: t('power.power_label', 'POWER'), label: t('team.premium') },
          { icon: '👤', val: `+${powerNormal / 1000}K`, sub: t('power.power_label', 'POWER'), label: t('team.normal') },
          { icon: '💰', val: `${commissionPct}%`, sub: t('team.commission'), label: t('team.from_purchases') }
        ].map((item, i) => (
          <div key={i} className="card" style={{
            padding: '18px 8px', textAlign: 'center',
            animation: `fadeIn 0.35s ease ${(i + 3) * 0.08}s both`
          }}>
            <div style={{ fontSize: 24, marginBottom: 8, filter: 'drop-shadow(0 0 4px rgba(192,192,192,0.2))' }}>{item.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{item.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 3, fontWeight: 600, letterSpacing: 0.5 }}>{item.sub}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn-primary" onClick={share}>
          {t('team.invite_friends')}
        </button>
        <button className="btn-outline" onClick={copyLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          {t('team.copy_link')}
        </button>
      </div>
    </div>
  );
}
