import React from 'react';
import { useStore } from '../../store/index.js';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { activeTab, setTab } = useStore();
  const { t } = useTranslation();
  const isHidden = activeTab === 'withdraw' || activeTab === 'admin';

  if (isHidden) return null;

  const tabs = [
    { id: 'shop', label: t('nav.shop', 'Магазин'), icon: '🛒' },
    { id: 'ambassador', label: t('nav.ambassador', 'Партнёр'), icon: '🤝' },
    { id: 'power', label: t('nav.mining', 'Майнинг'), icon: '⚡' },
    { id: 'team', label: t('nav.team', 'Команда'), icon: '👥' },
    { id: 'tasks', label: t('nav.tasks', 'Задания'), icon: '📋' },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(10,12,16,0.95)', 
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 8px calc(env(safe-area-inset-bottom, 6px) + 8px)',
      zIndex: 100
    }}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setTab(tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 10, minWidth: 52,
            transition: 'all 0.2s ease',
            color: active ? '#fff' : 'var(--text-muted)'
          }}>
            <div style={{
              fontSize: 20,
              filter: active ? 'drop-shadow(0 0 6px rgba(192,192,192,0.4))' : 'grayscale(1)',
              opacity: active ? 1 : 0.45,
              transition: 'all 0.2s ease',
              transform: active ? 'scale(1.1)' : 'scale(1)'
            }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: 9, fontWeight: active ? 700 : 500,
              color: active ? '#e0e0e0' : 'var(--text-muted)',
              letterSpacing: 0.3, transition: 'all 0.2s ease'
            }}>{tab.label}</span>
            {active && (
              <div style={{
                width: 4, height: 4, borderRadius: '50%', 
                background: 'var(--primary)',
                boxShadow: '0 0 6px rgba(192,192,192,0.5)',
                marginTop: -1
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
