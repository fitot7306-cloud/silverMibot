import React, { useEffect, useState } from 'react';
import api from '../../utils/api.js';
import { fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';

const medals = ['🥇', '🥈', '🥉'];

export default function RatingPage() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();

  useEffect(() => { api.get('/leaderboard').then(r => setData(r.data)); }, []);

  if (!data) return <div className="page" style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>...</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>🏆</span>
          {t('rating.title')}
        </div>
        {data.my_rank && (
          <div className="page-subtitle">{t('rating.your_position', { rank: data.my_rank })}</div>
        )}
      </div>

      {/* Top 3 podium */}
      {data.leaderboard.length >= 3 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14,
          marginBottom: 28, padding: '10px 0'
        }}>
          {[1, 0, 2].map(idx => {
            const u = data.leaderboard[idx];
            const isFirst = idx === 0;
            const sizes = { 0: { avatar: 64, medal: 32, font: 22 }, 1: { avatar: 50, medal: 24, font: 16 }, 2: { avatar: 50, medal: 24, font: 16 } };
            const s = sizes[idx];
            return (
              <div key={u.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                animation: `fadeIn 0.4s ease ${idx * 0.12}s both`
              }}>
                <div style={{
                  fontSize: s.medal,
                  filter: isFirst ? 'drop-shadow(0 0 10px rgba(255,215,0,0.4))' : 'none'
                }}>{medals[idx]}</div>
                <div style={{
                  width: s.avatar, height: s.avatar, borderRadius: '50%',
                  background: isFirst
                    ? 'var(--silver-gradient)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: s.font, fontWeight: 800,
                  color: isFirst ? '#0a0c10' : '#fff',
                  boxShadow: isFirst ? '0 0 24px rgba(192,192,192,0.2)' : 'none',
                  border: isFirst ? 'none' : '1px solid rgba(255,255,255,0.08)'
                }}>
                  {(u.first_name || u.username || '?')[0].toUpperCase()}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, textAlign: 'center', maxWidth: 75,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {u.first_name || u.username || `#${u.id}`}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: '#fff',
                  background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 10px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {fmtK(Math.floor(u.power))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.leaderboard.slice(3).map((u, i) => (
          <div key={u.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
            animation: `fadeIn 0.3s ease ${(i + 3) * 0.04}s both`
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--text-muted)'
            }}>{u.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.first_name || u.username || `User #${u.id}`}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{fmtK(Math.floor(u.power))}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>POWER</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
