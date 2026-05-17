import React from 'react';
import { useStore } from '../../store/index.js';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { activeTab, setTab } = useStore();
  const { t } = useTranslation();
  const isHidden = activeTab === 'withdraw' || activeTab === 'admin' || activeTab === 'ambassador';

  if (isHidden) return null;

  const tabs = [
    { id: 'shop', label: t('nav.shop', 'Магазин'), icon: '🛒' },
    { id: 'rating', label: t('nav.rating', 'Рейтинг'), icon: '🏆' },
    { id: 'power', label: t('nav.mining', 'Майнинг'), icon: '⚡' },
    { id: 'team', label: t('nav.team', 'Команда'), icon: '👥' },
    { id: 'tasks', label: t('nav.tasks', 'Задания'), icon: '📋' },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0d1016', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px calc(env(safe-area-inset-bottom, 8px) + 10px)',
      zIndex: 100
    }}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setTab(tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            flex: 1, color: active ? '#fff' : 'var(--text-muted)'
          }}>
            <div style={{
              fontSize: 22,
              filter: active ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'grayscale(1)',
              opacity: active ? 1 : 0.5
            }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? '#fff' : 'var(--text-muted)',
            }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
