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
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoChecking, setPromoChecking] = useState(false);
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

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoChecking(true);
    try {
      const { data } = await api.post('/shop/validate-promo', { code: promoCode });
      setPromoResult(data);
    } catch (e) {
      setPromoResult({ valid: false, error: e.response?.data?.error || 'Invalid' });
    } finally { setPromoChecking(false); }
  };

  const handleBuy = async (pkg) => {
    const tg = window.Telegram?.WebApp;
    const isSale = pkg.sale_price && pkg.sale_until && new Date(pkg.sale_until) > new Date();
    const price = isSale ? pkg.sale_price : pkg.price_ton;
    const confirmText = t('shop.confirm_buy', { power: fmtK(pkg.power_amount), price });
    const confirmed = await new Promise(resolve => {
      if (tg) tg.showConfirm(confirmText, resolve);
      else resolve(window.confirm(confirmText));
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const { data } = await api.post('/shop/create-order', { package_id: pkg.id, promo_code: promoResult?.valid ? promoCode : undefined });
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
      <div style={{ marginBottom: 14 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 6px rgba(192,192,192,0.3))' }}>⚡</span>
          {t('shop.title')}
        </div>
        <div className="page-subtitle">{t('shop.subtitle')}</div>
      </div>

      {/* Promo Code */}
      <div className="card" style={{ marginBottom: 14, padding: '16px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
          {t('shop.promo_label', 'ПРОМОКОД')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text" value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); }}
            placeholder={t('shop.promo_placeholder', 'Введите код')}
            style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, fontSize: 14 }}
          />
          <button onClick={validatePromo} disabled={promoChecking || !promoCode.trim()} style={{
            background: 'var(--silver-gradient)', border: 'none', borderRadius: 10,
            padding: '0 18px', fontWeight: 800, fontSize: 12, color: '#0a0c10',
            cursor: 'pointer', flexShrink: 0, letterSpacing: 0.5,
            opacity: promoChecking || !promoCode.trim() ? 0.5 : 1
          }}>
            {promoChecking ? '⏳' : '✓'}
          </button>
        </div>
        {promoResult && (
          <div style={{
            marginTop: 8, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
            background: promoResult.valid ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
            color: promoResult.valid ? '#4ade80' : '#ef4444',
            border: `1px solid ${promoResult.valid ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}>
            {promoResult.valid
              ? `✅ -${promoResult.discount_pct}% ${t('shop.promo_applied', 'скидка применена')}`
              : `❌ ${t('shop.promo_err_' + promoResult.error, t('shop.promo_invalid', 'Invalid code'))}`
            }
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {packages.map((pkg, i) => {
          const isSaleActive = pkg.sale_price && pkg.sale_until && new Date(pkg.sale_until) > new Date();
          const effectivePrice = isSaleActive ? parseFloat(pkg.sale_price) : parseFloat(pkg.price_ton);
          const perDay = tonPerDay(pkg.power_amount);
          const pb = payback(pkg.power_amount, effectivePrice);
          const days = pkg.duration_days || 28;
          
          return (
            <div key={pkg.id} className="card" style={{
              padding: '22px', animation: `fadeIn 0.35s ease ${i * 0.08}s both`,
              border: pkg.is_popular ? '1px solid rgba(192,192,192,0.3)' : undefined,
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Badge */}
              {pkg.badge && (
                <div style={{
                  position: 'absolute', top: 10, right: -24, background: pkg.badge === 'HOT' ? '#ef4444' : pkg.badge === 'SALE' ? '#fbbf24' : pkg.badge === 'VIP' ? 'var(--primary)' : '#4ade80',
                  color: pkg.badge === 'SALE' ? '#000' : '#fff', fontSize: 9, fontWeight: 900, padding: '3px 28px',
                  transform: 'rotate(45deg)', letterSpacing: 1
                }}>{pkg.badge}</div>
              )}

              {/* Header: name + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>
                    {pkg.name} {pkg.is_popular && '⭐'}
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>
                    {fmtK(pkg.power_amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 1.5, marginTop: 4, fontWeight: 600 }}>POWER</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isSaleActive && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through', marginBottom: 2 }}>
                      {pkg.price_ton} TON
                    </div>
                  )}
                  <div style={{
                    background: isSaleActive ? 'linear-gradient(135deg, #4ade80, #22c55e)' : 'var(--silver-gradient)',
                    borderRadius: 12, padding: '10px 16px',
                    fontSize: 15, fontWeight: 800, color: isSaleActive ? '#fff' : '#0a0c10',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', letterSpacing: 0.5
                  }}>
                    {effectivePrice} TON
                  </div>
                </div>
              </div>

              {/* Description */}
              {pkg.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                  {pkg.description}
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
                <div className="stat-pill">
                  <div className="label">{t('shop.daily')}</div>
                  <div className="value">{perDay}</div>
                  <div className="sub">TON</div>
                </div>
                <div className="stat-pill">
                  <div className="label">{days} {t('shop.days_unit', 'ДНЕЙ')}</div>
                  <div className="value">{(perDay * days).toFixed(3)}</div>
                  <div className="sub">TON</div>
                </div>
                <div className="stat-pill">
                  <div className="label">{t('shop.payback')}</div>
                  <div className="value">{pb}</div>
                  <div className="sub">{t('shop.days_unit', 'ДНЕЙ')}</div>
                </div>
              </div>

              <button className="btn-primary" onClick={() => handleBuy(pkg)} disabled={loading}>
                {loading ? t('shop.wait', '⏳ ПОДОЖДИТЕ...') : t('shop.buy_for', { price: effectivePrice })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
