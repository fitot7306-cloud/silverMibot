import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../utils/api.js';
import { useStore } from '../../store/index.js';
import { fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';
import createAdHandler from 'monetag-tg-sdk';

const typeIcons = {
  subscribe_channel: '📢',
  start_bot: '🤖',
  invite_friends: '👥',
  daily: '📅',
  adsgram: '🎬',
  link: '🔗',
  default: '⚡'
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [completing, setCompleting] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [adWatching, setAdWatching] = useState(false);
  const [adCooldown, setAdCooldown] = useState(0);
  const [adMsg, setAdMsg] = useState(null);
  const [adAvailable, setAdAvailable] = useState(false);
  const [opened, setOpened] = useState({});

  const [monetagWatching, setMonetagWatching] = useState(false);
  const [monetagCooldown, setMonetagCooldown] = useState(0);
  const [monetagMsg, setMonetagMsg] = useState(null);
  const [monetagAvailable, setMonetagAvailable] = useState(false);
  const monetagHandlerRef = useRef(null);

  const [adConfig, setAdConfig] = useState(null);

  const { refreshUser, user } = useStore();
  const { t } = useTranslation();
  const adControllerRef = useRef(null);

  const [showOrder, setShowOrder] = useState(false);
  const [orderConfig, setOrderConfig] = useState(null);
  const [orderForm, setOrderForm] = useState({ type: 'subscribe_channel', link: '', count: 100, title: '' });
  const [ordering, setOrdering] = useState(false);
  const [orderMsg, setOrderMsg] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [orderPayment, setOrderPayment] = useState(null);
  const [payTimeLeft, setPayTimeLeft] = useState(0);
  const [checkCooldown, setCheckCooldown] = useState(0);
  const [checking, setChecking] = useState(false);
  const [payStatus, setPayStatus] = useState(null);

  useEffect(() => { api.get('/tasks').then(r => setTasks(r.data)); }, []);
  useEffect(() => {
    api.get('/tasks/order-config').then(r => setOrderConfig(r.data)).catch(() => {});
    api.get('/tasks/my-orders').then(r => setMyOrders(r.data)).catch(() => {});
    api.get('/tasks/order-payment-status').then(r => {
      if (r.data) setOrderPayment(r.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/tasks/ad-config').then(r => setAdConfig(r.data)).catch(() => {
      setAdConfig({ adsgram_block_id: '29776', adsgram_task_id: 'task-29788', monetag_zone_id: '10984603' });
    });
  }, []);

  useEffect(() => {
    if (!orderPayment?.expires_at) return;
    const update = () => {
      const left = Math.max(0, Math.floor((new Date(orderPayment.expires_at) - Date.now()) / 1000));
      setPayTimeLeft(left);
      if (left === 0) { setOrderPayment(null); setPayStatus(null); }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [orderPayment?.expires_at]);

  useEffect(() => {
    if (checkCooldown <= 0) return;
    const t = setInterval(() => setCheckCooldown(p => p <= 1 ? 0 : p - 1), 1000);
    return () => clearInterval(t);
  }, [checkCooldown]);

  useEffect(() => {
    if (!adConfig?.adsgram_block_id) return;
    const blockId = adConfig.adsgram_block_id;
    const tryInit = () => {
      if (blockId && window.Adsgram) {
        try {
          adControllerRef.current = window.Adsgram.init({ blockId });
          setAdAvailable(true);
        } catch (e) {}
        return true;
      }
      return false;
    };
    if (!tryInit()) {
      const interval = setInterval(() => { if (tryInit()) clearInterval(interval); }, 500);
      const timeout = setTimeout(() => clearInterval(interval), 5000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [adConfig]);

  useEffect(() => {
    if (!adConfig?.monetag_zone_id) return;
    try {
      monetagHandlerRef.current = createAdHandler(adConfig.monetag_zone_id);
      setMonetagAvailable(true);
    } catch (e) {}
  }, [adConfig]);

  useEffect(() => {
    if (adCooldown <= 0) return;
    const timer = setInterval(() => {
      setAdCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [adCooldown]);

  useEffect(() => {
    if (monetagCooldown <= 0) return;
    const timer = setInterval(() => {
      setMonetagCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [monetagCooldown]);

  useEffect(() => {
    api.get('/tasks/ad-status').then(r => { if (r.data.cooldown > 0) setAdCooldown(r.data.cooldown); }).catch(() => {});
    api.get('/tasks/monetag-status').then(r => { if (r.data.cooldown > 0) setMonetagCooldown(r.data.cooldown); }).catch(() => {});
  }, []);

  const openTask = (task) => {
    if (task.link) {
      if (task.type === 'start_bot' || task.type === 'subscribe_channel') {
        window.Telegram?.WebApp?.openTelegramLink(task.link);
      } else {
        window.Telegram?.WebApp?.openLink(task.link);
      }
    }
    setOpened(prev => ({ ...prev, [task.id]: true }));
    setTaskError(null);
  };

  const complete = async (task) => {
    if (task.completed || completing === task.id) return;
    setCompleting(task.id);
    setTaskError(null);
    try {
      await api.post(`/tasks/${task.id}/complete`);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      await refreshUser();
    } catch (e) {
      const errCode = e.response?.data?.error;
      if (errCode === 'not_subscribed') setTaskError({ taskId: task.id, msg: t('tasks.not_subscribed') });
      else if (errCode === 'Already completed') setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      else setTaskError({ taskId: task.id, msg: t('tasks.task_error') });
    } finally {
      setCompleting(null);
    }
  };

  const watchAd = async () => {
    if (adWatching || adCooldown > 0) return;
    if (!adControllerRef.current) return;
    setAdWatching(true);
    try {
      const result = await adControllerRef.current.show();
      if (result.done) {
        const { data } = await api.post('/tasks/ad-reward');
        setAdMsg(t('tasks.ad_reward_msg', { reward: fmtK(data.reward) }));
        setAdCooldown(data.cooldown || 60);
        await refreshUser();
      }
    } catch (e) { setAdMsg(t('tasks.watch_full_ad')); }
    finally { setAdWatching(false); setTimeout(() => setAdMsg(null), 3000); }
  };

  const watchMonetagAd = useCallback(async () => {
    if (monetagWatching || monetagCooldown > 0) return;
    if (!monetagHandlerRef.current) return;
    setMonetagWatching(true);
    try {
      await monetagHandlerRef.current();
      const { data } = await api.post('/tasks/monetag-reward');
      setMonetagMsg(t('tasks.ad_reward_msg', { reward: fmtK(data.reward) }));
      setMonetagCooldown(data.cooldown || 60);
      await refreshUser();
    } catch (e) {
      if (e.response?.status === 429) {
        setMonetagCooldown(e.response.data?.cooldown || 30);
      }
    } finally { setMonetagWatching(false); setTimeout(() => setMonetagMsg(null), 3000); }
  }, [monetagWatching, monetagCooldown, refreshUser, t]);

  const active = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  const formatCooldown = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
  };

  const getTaskAction = (task) => {
    const isOpened = opened[task.id];
    const needsVerify = task.type === 'subscribe_channel';

    if (needsVerify) {
      if (!isOpened) return { label: 'ВЫПОЛНИТЬ', action: () => openTask(task), icon: '▶' };
      return { label: completing === task.id ? '⏳' : 'ПРОВЕРИТЬ', action: () => complete(task), icon: '✓' };
    }

    if (task.link && !isOpened) {
      return { label: 'ВЫПОЛНИТЬ', action: () => openTask(task), icon: '▶' };
    }

    return {
      label: completing === task.id ? '⏳' : 'ВЫПОЛНИТЬ',
      action: () => {
        if (task.link && !isOpened) openTask(task);
        complete(task);
      },
      icon: '▶'
    };
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>📋</span>
          ЗАДАНИЯ
        </div>
        <div className="page-subtitle">Выполняй задания — получай бесплатный Power</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Monetag Ad Task */}
        {monetagAvailable && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
              }}>💎</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Смотреть Monetag</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Посмотри рекламу Monetag и получи POWER</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>+POWER награда</div>
              </div>
              <button onClick={watchMonetagAd} disabled={monetagWatching || monetagCooldown > 0} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px',
                color: 'var(--text-primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                alignSelf: 'center', letterSpacing: 0.3, transition: 'var(--transition)'
              }}>
                {monetagWatching ? '⏳' : monetagCooldown > 0 ? formatCooldown(monetagCooldown) : <>▶ СМОТРЕТЬ</>}
              </button>
            </div>
          </div>
        )}

        {/* Adsgram Ad Task */}
        {adAvailable && (
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
              }}>🎬</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Смотреть Adsgram</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Посмотри видео и получи бонус</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>+POWER награда</div>
              </div>
              <button onClick={watchAd} disabled={adWatching || adCooldown > 0} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px',
                color: 'var(--text-primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                alignSelf: 'center', letterSpacing: 0.3, transition: 'var(--transition)'
              }}>
                {adWatching ? '⏳' : adCooldown > 0 ? formatCooldown(adCooldown) : <>▶ СМОТРЕТЬ</>}
              </button>
            </div>
          </div>
        )}

        {/* Active tasks */}
        {active.map((task) => {
          const { label, action, icon } = getTaskAction(task);
          return (
            <div key={task.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                }}>
                  {typeIcons[task.type] || typeIcons.default}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{task.title}</div>
                  {task.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{task.description}</div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>+{fmtK(task.reward_power)} POWER</div>
                </div>
                <button onClick={action} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 12px',
                  color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  alignSelf: 'center'
                }}>
                  {icon} {label}
                </button>
              </div>
            </div>
          );
        })}

        {/* ═══ ORDER ADVERTISING ═══ */}
        {orderConfig && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              👤 РЕКЛАМА
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                }}>📣</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Заказать рекламу</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Продвигайте канал, бота или ссылку</div>
                </div>
                <button onClick={() => setShowOrder(!showOrder)} style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 12px',
                  color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  alignSelf: 'center'
                }}>
                  {showOrder ? '✕ ЗАКРЫТЬ' : '+ ЗАКАЗАТЬ'}
                </button>
              </div>

              {showOrder && (() => {
                const selectedType = orderConfig.types.find(t => t.type === orderForm.type) || orderConfig.types[0];
                const totalPrice = (selectedType.price_per_user * orderForm.count).toFixed(4);

                return (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {orderConfig.types.map(tp => (
                        <button key={tp.type} onClick={() => setOrderForm({ ...orderForm, type: tp.type })} style={{
                          flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                          background: orderForm.type === tp.type ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: orderForm.type === tp.type ? '#fff' : 'var(--text-muted)',
                        }}>{tp.label}</button>
                      ))}
                    </div>

                    <input type="text" value={orderForm.title} onChange={e => setOrderForm({ ...orderForm, title: e.target.value })}
                      placeholder="Название" style={{ marginBottom: 8 }} />

                    <input type="text" value={orderForm.link} onChange={e => setOrderForm({ ...orderForm, link: e.target.value })}
                      placeholder={selectedType.placeholder} style={{ marginBottom: 12 }} />

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Количество</span>
                        <span style={{ fontWeight: 700 }}>{orderForm.count}</span>
                      </div>
                      <input type="range" min="50" max="1000" step="10" value={orderForm.count}
                        onChange={e => setOrderForm({ ...orderForm, count: parseInt(e.target.value) })}
                        style={{ width: '100%', accentColor: 'var(--primary-light)' }} />
                    </div>

                    <button onClick={async () => {
                      if (!orderForm.link || ordering) return;
                      setOrdering(true);
                      try {
                        const { data } = await api.post('/tasks/order', orderForm);
                        if (data.payment) setOrderPayment(data.payment);
                        setShowOrder(false);
                      } catch (e) {
                      } finally { setOrdering(false); }
                    }} disabled={ordering || !orderForm.link} className="btn-primary" style={{ background: 'var(--silver-gradient)', color: '#000' }}>
                      {ordering ? '⏳...' : `ОПЛАТИТЬ ${totalPrice} TON`}
                    </button>
                  </div>
                );
              })()}
            </div>
            
            {orderPayment && (
              <div className="card" style={{ marginTop: 12, padding: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Оплата заказа</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{orderPayment.amount} TON</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Кошелек:</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 12 }}>{orderPayment.wallet}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>MEMO (Обязательно):</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>{orderPayment.memo}</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
