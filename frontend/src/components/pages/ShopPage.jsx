import React, { useEffect, useState } from 'react';
import api from '../../utils/api.js';
import { useStore } from '../../store/index.js';
import { fmtK } from '../../utils/format.js';
import { useTranslation } from 'react-i18next';
import PaymentPage from './PaymentPage.jsx';

export default function ShopPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const { refreshUser } = useStore();
  const { t } = useTranslation();

  useEffect(() => {
    api.get('/shop/packages').then(r => setPackages(r.data));
    checkExistingOrder();
  }, []);

  const checkExistingOrder = async () => {
    try {
      const { data: order } = await api.get('/shop/order-status');
      if (order) {
        const { data: pkgs } = await api.get('/shop/packages');
        const pkg = pkgs.find(p => p.id === order.package_id);
        if (pkg) setPaymentData({ order, pkg, wallet: order.wallet || '', expiresAt: order.expires_at });
      }
    } catch (e) {}
  };

  const handleBuy = async (pkg) => {
    const tg = window.Telegram?.WebApp;
    const confirmText = t('shop.confirm_buy', { power: fmtK(pkg.power_amount), price: pkg.price_ton });
    const confirmed = await new Promise(resolve => {
      if (tg) tg.showConfirm(confirmText, resolve);
      else resolve(window.confirm(confirmText));
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const { data } = await api.post('/shop/create-order', { package_id: pkg.id });
      setPaymentData({ order: data.order, pkg: data.package, wallet: data.wallet, expiresAt: data.expires_at });
    } catch (e) {
      const tg = window.Telegram?.WebApp;
      tg ? tg.showAlert(t('shop.order_error')) : alert(t('shop.order_error'));
    } finally { setLoading(false); }
  };

  if (paymentData) {
    return <PaymentPage {...paymentData} onCancel={() => setPaymentData(null)} onSuccess={async () => { await refreshUser(); setPaymentData(null); }} />;
  }

  const tonPerDay = (power) => ((power / 100000) * 0.036).toFixed(4);
  const payback = (power, price) => Math.ceil(price / tonPerDay(power));

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>⚡</span>
          {t('shop.title')}
        </div>
        <div className="page-subtitle">{t('shop.subtitle')}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {packages.map((pkg, i) => {
          const perDay = tonPerDay(pkg.power_amount);
          const pb = payback(pkg.power_amount, pkg.price_ton);
          
          return (
            <div key={pkg.id} className="card" style={{
              padding: '22px', animation: `fadeIn 0.35s ease ${i * 0.08}s both`
            }}>
              {/* Header: name + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>{pkg.name}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>
                    {fmtK(pkg.power_amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 1.5, marginTop: 4, fontWeight: 600 }}>POWER</div>
                </div>
                <div style={{
                  background: 'var(--silver-gradient)',
                  borderRadius: 12, padding: '10px 16px',
                  fontSize: 15, fontWeight: 800, color: '#0a0c10',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  letterSpacing: 0.5
                }}>
                  {pkg.price_ton} TON
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
                <div className="stat-pill">
                  <div className="label">{t('shop.daily')}</div>
                  <div className="value">{perDay}</div>
                  <div className="sub">TON</div>
                </div>
                <div className="stat-pill">
                  <div className="label">{t('shop.thirty_days')}</div>
                  <div className="value">{(perDay * 30).toFixed(3)}</div>
                  <div className="sub">TON</div>
                </div>
                <div className="stat-pill">
                  <div className="label">{t('shop.payback')}</div>
                  <div className="value">{pb}</div>
                  <div className="sub">{t('shop.days_unit', 'ДНЕЙ')}</div>
                </div>
              </div>

              <button className="btn-primary" onClick={() => handleBuy(pkg)} disabled={loading}>
                {loading ? t('shop.wait', '⏳ ПОДОЖДИТЕ...') : t('shop.buy_for', { price: pkg.price_ton })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
