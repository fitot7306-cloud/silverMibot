import React from 'react';
import { useStore } from '../../store/index.js';
import { useTranslation } from 'react-i18next';

const Section = ({ icon, title, children }) => (
  <div className="card" style={{ marginBottom: 12, padding: '18px 20px' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--silver-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      {children}
    </div>
  </div>
);

const Badge = ({ color, children }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    background: color || 'rgba(255,255,255,0.06)',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.3, marginRight: 4
  }}>{children}</span>
);

const Step = ({ num, text }) => (
  <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: 'var(--silver-gradient)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, color: '#0a0c10'
    }}>{num}</div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 2 }}>{text}</div>
  </div>
);

export default function InfoPage() {
  const { setTab } = useStore();
  const { t } = useTranslation();

  return (
    <div className="page" style={{ position: 'relative' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20
      }}>
        <div>
          <div className="text-silver" style={{
            fontSize: 20, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase'
          }}>{t('info.title')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('info.subtitle')}</div>
        </div>
        <button onClick={() => setTab('power')} style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16,
          transition: 'var(--transition)', fontFamily: 'inherit'
        }}>✕</button>
      </div>

      {/* What is SilverMibot */}
      <Section icon="⚡" title={t('info.what_title')}>
        {t('info.what_text')}
      </Section>

      {/* How Mining Works */}
      <Section icon="⛏️" title={t('info.mining_title')}>
        <Step num="1" text={t('info.mining_step1')} />
        <Step num="2" text={t('info.mining_step2')} />
        <Step num="3" text={t('info.mining_step3')} />
        <Step num="4" text={t('info.mining_step4')} />
      </Section>

      {/* Power Types */}
      <Section icon="🔋" title={t('info.power_title')}>
        <div style={{ marginBottom: 10 }}>
          <Badge color="rgba(74,222,128,0.15)">⚡ {t('info.power_purchased')}</Badge>
          <div style={{ marginTop: 4, paddingLeft: 4 }}>{t('info.power_purchased_desc')}</div>
        </div>
        <div>
          <Badge color="rgba(255,180,80,0.15)">🎁 {t('info.power_bonus')}</Badge>
          <div style={{ marginTop: 4, paddingLeft: 4 }}>{t('info.power_bonus_desc')}</div>
        </div>
      </Section>

      {/* Decay Mechanics */}
      <Section icon="⏳" title={t('info.decay_title')}>
        {t('info.decay_text')}
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(255,180,80,0.06)', border: '1px solid rgba(255,180,80,0.15)'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,180,80,0.8)', marginBottom: 6 }}>
            📊 {t('info.decay_example_title')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.8, fontFamily: 'monospace' }}>
            {t('info.decay_day0')}<br/>
            {t('info.decay_day1')}<br/>
            {t('info.decay_day7')}<br/>
            {t('info.decay_day14')}<br/>
            {t('info.decay_day30')}
          </div>
        </div>
      </Section>

      {/* How to Earn */}
      <Section icon="💰" title={t('info.earn_title')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>🛒</span>
            <span><strong>{t('info.earn_buy')}</strong> — {t('info.earn_buy_desc')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span><strong>{t('info.earn_tasks')}</strong> — {t('info.earn_tasks_desc')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <span><strong>{t('info.earn_refs')}</strong> — {t('info.earn_refs_desc')}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>📺</span>
            <span><strong>{t('info.earn_ads')}</strong> — {t('info.earn_ads_desc')}</span>
          </div>
        </div>
      </Section>

      {/* Withdrawal */}
      <Section icon="💎" title={t('info.withdraw_title')}>
        <Step num="1" text={t('info.withdraw_step1')} />
        <Step num="2" text={t('info.withdraw_step2')} />
        <Step num="3" text={t('info.withdraw_step3')} />
      </Section>

      {/* Conversion Rate */}
      <Section icon="🔄" title={t('info.rate_title')}>
        {t('info.rate_text')}
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(192,192,192,0.05)', border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.8, fontFamily: 'monospace' }}>
            100K Power → 2,500 H/day<br/>
            1 HASH = 0.000008 TON<br/>
            100K Power ≈ 0.020 TON/day
          </div>
        </div>
      </Section>

      {/* Back Button */}
      <button className="btn-primary" onClick={() => setTab('power')} style={{ marginTop: 8, marginBottom: 80 }}>
        ← {t('info.back')}
      </button>

    </div>
  );
}
