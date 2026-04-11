import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../services/api';

const statusColor = {
  Processing: { bg: '#fff3cd', color: '#856404' },
  Confirmed:  { bg: '#cce5ff', color: '#004085' },
  Shipped:    { bg: '#e2d9f3', color: '#6f42c1' },
  Delivered:  { bg: '#d4edda', color: '#155724' },
  Cancelled:  { bg: '#f8d7da', color: '#721c24' },
};

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadOrders();
  }, [user, navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true); setError('');
      const res = await getUserOrders();
      setOrders(res.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Account</h1>

      {/* User Info Card */}
      <div style={styles.card}>
        <div style={styles.avatarRow}>
          <div style={styles.avatar}>{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#1a1a2e' }}>{user?.name}</h2>
            <p style={{ margin: '4px 0 0', color: '#888' }}>{user?.email}</p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Phone</span>
            <span style={styles.infoVal}>{user?.phone || '—'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Member since</span>
            <span style={styles.infoVal}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Role</span>
            <span style={{ ...styles.infoVal, textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Total orders</span>
            <span style={styles.infoVal}>{orders.length}</span>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <Link to="/wishlist" style={styles.quickLink}>❤️ Wishlist</Link>
          <Link to="/products" style={styles.quickLink}>🛍️ Shop More</Link>
          {user?.role === 'admin' && <Link to="/admin" style={{ ...styles.quickLink, backgroundColor: '#fff3cd', color: '#856404' }}>⚙️ Admin Panel</Link>}
        </div>
      </div>

      {/* Orders */}
      <div style={{ ...styles.card, marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1a1a2e' }}>Order History</h2>
          <button onClick={loadOrders} style={styles.refreshBtn}>🔄 Refresh</button>
        </div>

        {loading && <p style={{ color: '#888', textAlign: 'center', padding: '30px' }}>Loading orders...</p>}
        {error && <p style={{ color: '#e74c3c', padding: '16px', backgroundColor: '#f8d7da', borderRadius: '8px' }}>⚠️ {error}</p>}

        {!loading && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>📦</div>
            <p>No orders yet.</p>
            <Link to="/products" style={{ color: '#e94560', textDecoration: 'none', fontWeight: 'bold' }}>Start Shopping →</Link>
          </div>
        )}

        {orders.map(order => {
          const sc = statusColor[order.orderStatus] || { bg: '#eee', color: '#555' };
          const isOpen = activeOrder === order._id;
          const paymentLabel = order.paymentMethod === 'COD' && order.orderStatus === 'Delivered'
            ? 'Paid on Delivery'
            : (order.paymentStatus || 'Pending');

          return (
            <div key={order._id} style={styles.orderCard}>
              {/* Order Header — click to expand */}
              <div style={styles.orderHeader} onClick={() => setActiveOrder(isOpen ? null : order._id)}>
                <div>
                  <p style={styles.orderId}>Order #{order._id.slice(-8)}</p>
                  <p style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ ...styles.badge, backgroundColor: sc.bg, color: sc.color }}>
                    {order.orderStatus}
                  </span>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#e94560' }}>Rs. {order.totalAmount}</p>
                </div>
                <span style={{ color: '#aaa', fontSize: '18px', marginLeft: '8px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={styles.orderDetail}>
                  {/* Items */}
                  <div style={{ marginBottom: '16px' }}>
                    <p style={styles.detailLabel}>Items</p>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={styles.itemRow}>
                        <span style={{ color: '#888', minWidth: '30px' }}>{item.quantity}×</span>
                        <span style={{ flex: 1 }}>{item.name}</span>
                        {item.size && <span style={styles.tag}>{item.size}</span>}
                        {item.color && <span style={styles.tag}>{item.color}</span>}
                        <span style={{ fontWeight: 'bold', color: '#e94560' }}>Rs. {item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Shipping */}
                  <div style={{ marginBottom: '12px' }}>
                    <p style={styles.detailLabel}>Shipping Address</p>
                    <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
                      {order.shippingAddress?.fullName && `${order.shippingAddress.fullName}, `}
                      {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} – {order.shippingAddress?.pincode}
                    </p>
                    {order.shippingAddress?.phone && <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>📞 {order.shippingAddress.phone}</p>}
                  </div>

                  {/* Payment & Tracking */}
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={styles.detailLabel}>Payment</p>
                      <p style={{ margin: 0, fontSize: '14px' }}>{order.paymentMethod} — <b>{paymentLabel}</b></p>
                    </div>
                    {order.trackingNumber && (
                      <div>
                        <p style={styles.detailLabel}>Tracking Number</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#007bff', fontFamily: 'monospace', fontWeight: 'bold' }}>{order.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '960px', margin: '0 auto', padding: '26px 18px 44px', minHeight: '100vh' },
  title: { fontSize: 'clamp(30px, 4vw, 42px)', color: '#171310', marginBottom: '24px', fontFamily: 'Playfair Display, serif' },
  card: { backgroundColor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', padding: '28px', borderRadius: '22px', boxShadow: '0 18px 40px rgba(34,24,17,0.08)', border: '1px solid rgba(227, 214, 200, 0.8)' },
  avatarRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  avatar: { width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg, #0e7a6d, #0a564d)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 10px 24px rgba(10,86,77,0.26)' },
  logoutBtn: { marginLeft: 'auto', backgroundColor: 'transparent', border: '1px solid #dbcab8', padding: '8px 16px', borderRadius: '999px', cursor: 'pointer', color: '#6a5d55', fontSize: '14px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '16px', background: 'linear-gradient(180deg, #fbf8f4, #f2ebe1)', borderRadius: '16px', border: '1px solid #eadfcc' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  infoLabel: { fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' },
  infoVal: { fontSize: '15px', fontWeight: 'bold', color: '#1a1a2e' },
  quickLink: { backgroundColor: '#f4efe8', color: '#1f1a16', textDecoration: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 'bold', border: '1px solid #e3d7c8' },
  refreshBtn: { background: 'linear-gradient(135deg, #0e7a6d, #0a564d)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '999px', cursor: 'pointer', fontSize: '14px', boxShadow: '0 10px 22px rgba(10,86,77,0.2)' },
  orderCard: { border: '1px solid #eee', borderRadius: '16px', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(34,24,17,0.06)' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: 'linear-gradient(180deg, #fff, #f8f3eb)' },
  orderId: { fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 4px' },
  orderDate: { fontSize: '13px', color: '#888', margin: 0 },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  orderDetail: { padding: '20px', borderTop: '1px solid #efe4d7', backgroundColor: '#fffdfa' },
  detailLabel: { fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
  itemRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px' },
  tag: { backgroundColor: '#f0f2f5', color: '#555', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' },
};

export default Profile;