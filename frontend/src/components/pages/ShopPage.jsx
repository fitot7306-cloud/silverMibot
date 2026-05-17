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
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>⚡</span>
          МАГАЗИН
        </div>
        <div className="page-subtitle" style={{ fontSize: 12, marginTop: 4 }}>Выбери пакет мощности для майнинга</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {packages.map((pkg, i) => {
          const perDay = tonPerDay(pkg.power_amount);
          const pb = payback(pkg.power_amount, pkg.price_ton);
          
          return (
            <div key={pkg.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{pkg.name}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {fmtK(pkg.power_amount)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 1, marginTop: 4 }}>POWER</div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f0f0f0, #c0c0c0)',
                  borderRadius: 10, padding: '8px 14px',
                  fontSize: 14, fontWeight: 800, color: '#000', boxShadow: '0 4px 10px rgba(192,192,192,0.1)'
                }}>
                  {pkg.price_ton} TON
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div className="stat-pill" style={{ padding: '14px 8px' }}>
                  <div className="label">ЕЖЕДНЕВНО</div>
                  <div className="value">{perDay} <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>TON</span></div>
                </div>
                <div className="stat-pill" style={{ padding: '14px 8px' }}>
                  <div className="label">30 ДНЕЙ</div>
                  <div className="value">{(perDay * 30).toFixed(3)} <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>TON</span></div>
                </div>
                <div className="stat-pill" style={{ padding: '14px 8px' }}>
                  <div className="label">ОКУПНОСТЬ</div>
                  <div className="value">{pb} ДНЕЙ</div>
                </div>
              </div>

              <button className="btn-primary" onClick={() => handleBuy(pkg)} disabled={loading} style={{ letterSpacing: 0.5 }}>
                {loading ? 'ПОДОЖДИТЕ...' : `КУПИТЬ ЗА ${pkg.price_ton} TON`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
