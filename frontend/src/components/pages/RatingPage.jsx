import React, { useEffect, useState } from 'react';
import api from '../../utils/api.js';
import { fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';

const medals = ['🥇', '🥈', '🥉'];
const topColors = ['#fff', '#d4d4d4', '#a3a3a3'];

export default function RatingPage() {
  const [data, setData] = useState(null);
  const { t } = useTranslation();

  useEffect(() => { api.get('/leaderboard').then(r => setData(r.data)); }, []);

  if (!data) return <div className="page" style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>...</div>;

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>🏆</span>
          РЕЙТИНГ
        </div>
        {data.my_rank && (
          <div className="page-subtitle" style={{ fontSize: 12, marginTop: 4 }}>
            Твоя позиция: {data.my_rank}
          </div>
        )}
      </div>

      {/* Top 3 podium */}
      {data.leaderboard.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
          {[1, 0, 2].map(idx => {
            const u = data.leaderboard[idx];
            const isFirst = idx === 0;
            return (
              <div key={u.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                animation: `fadeIn 0.4s ease ${idx * 0.15}s both`
              }}>
                <div style={{ fontSize: isFirst ? 32 : 24, filter: isFirst ? 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' : 'none' }}>
                  {medals[idx]}
                </div>
                <div style={{
                  width: isFirst ? 60 : 48, height: isFirst ? 60 : 48, borderRadius: '50%',
                  background: isFirst ? 'var(--silver-gradient)' : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isFirst ? 24 : 18, fontWeight: 800, color: isFirst ? '#000' : '#fff',
                  boxShadow: isFirst ? '0 0 20px rgba(192,192,192,0.2)' : '0 0 10px rgba(0,0,0,0.5)',
                  border: isFirst ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}>
                  {(u.first_name || u.username || '?')[0].toUpperCase()}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.first_name || u.username || `#${u.id}`}
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 800, color: topColors[idx],
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '4px 10px',
                  border: '1px solid rgba(255,255,255,0.1)'
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
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)'
            }}>{u.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.first_name || u.username || `User #${u.id}`}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{fmtK(Math.floor(u.power))}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>POWER</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
