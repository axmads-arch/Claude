import React, { useState, useEffect } from 'react';
import { fetchMyOrders } from '../data/api';

const STATUS = {
  new: { label: 'Yangi', ru: 'Новый', cls: 'st-new' },
  preparing: { label: 'Tayyorlanmoqda', ru: 'Готовится', cls: 'st-preparing' },
  ready: { label: 'Tayyor', ru: 'Готов', cls: 'st-ready' },
  delivering: { label: 'Yetkazilmoqda', ru: 'Доставляется', cls: 'st-delivering' },
  delivered: { label: 'Yetkazildi', ru: 'Доставлен', cls: 'st-delivered' },
  cancelled: { label: 'Bekor', ru: 'Отменён', cls: 'st-cancelled' },
};

const PAY = { cash: 'Naqd', click: 'Click', payme: 'Payme', uzum: 'Uzum', card: 'Karta' };
const DEL = { delivery: 'Yetkazib berish', pickup: 'Olib ketish' };

export default function Orders({ user, onAuthRequired, fmt }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchMyOrders(user.phone).then(data => {
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="page">
        <div className="page-header">
          <span className="page-title">Buyurtmalar</span>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">📋</div>
          <h3>Buyurtmalar tarixi</h3>
          <p>Ko'rish uchun tizimga kiring</p>
          <button className="login-btn" style={{ marginTop: 20 }} onClick={onAuthRequired}>Kirish</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-title">Buyurtmalar</span>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 12, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">🛍️</div>
          <h3>Buyurtmalar yo'q</h3>
          <p>Hali buyurtma bermagansiz</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(o => {
            const st = STATUS[o.status] || { label: o.status, cls: 'st-new' };
            const date = new Date(o.createdAt).toLocaleString('uz-UZ', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
            const itemsText = o.items?.map(i => `${i.product?.name || 'Mahsulot'} x${i.quantity}`).join(', ') || '';
            return (
              <div key={o.id} className="order-card">
                <div className="order-card-head">
                  <div>
                    <div className="order-num">Buyurtma #{o.id}</div>
                    <div className="order-date">{date}</div>
                  </div>
                  <span className={`status-pill ${st.cls}`}>{st.label}</span>
                </div>
                <div className="order-items-text">{itemsText}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
                  {DEL[o.deliveryType] || o.deliveryType} · {PAY[o.paymentMethod] || o.paymentMethod}
                  {o.address ? ` · ${o.address}` : ''}
                </div>
                <div className="order-total-row">
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Jami summa</span>
                  <span className="order-total-price">{fmt(o.totalPrice)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
