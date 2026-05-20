import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const ThankYou = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderState = location.state || {};
  const order = orderState.order || orderState;

  // Extract order details with fallbacks
  const orderId = order._id || orderState.orderId || 'Pending';
  const shortOrderId = orderId.length > 8 ? orderId.slice(-8) : orderId;
  const customerName = order.shippingAddress?.fullName || orderState.customerName || 'Valued Customer';
  const totalAmount = order.totalAmount ?? orderState.totalAmount;
  const paymentMethod = order.paymentMethod || orderState.paymentMethod || 'COD';
  const paymentStatus = order.paymentStatus || orderState.paymentStatus || 'Pending';
  const orderStatus = order.orderStatus || orderState.orderStatus || 'Processing';
  const shippingAddress = order.shippingAddress || orderState.shippingAddress || {};
  const items = order.items || orderState.items || [];
  const createdAt = order.createdAt || orderState.createdAt || new Date();
  const coupon = orderState.coupon;

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Calculate expected delivery (3-5 business days)
  const getExpectedDelivery = () => {
    const date = new Date(createdAt);
    const daysToAdd = 3; // You can adjust this (3-5 business days)
    let businessDays = 0;
    while (businessDays < daysToAdd) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) businessDays++; // Skip weekends
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Calculate subtotal and other amounts
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = coupon ? Math.round((subtotal * coupon.discountPercent) / 100) : 0;
  const deliveryCharge = totalAmount - subtotal + discountAmount; // Back-calculate delivery charge
  const discountedSubtotal = subtotal - discountAmount;

  return (
    <div style={styles.page}>
      <div style={styles.glowA} />
      <div style={styles.glowB} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.card}>
          <div style={styles.badge}>✓ ORDER CONFIRMED</div>
          <h1 style={styles.title}>Thank You For Shopping</h1>
          <h2 style={styles.brand}>Wajahat Fabrics and Bedding Store</h2>

          <p style={styles.message}>
            Thank you, {customerName}. Your order has been placed successfully and is now being prepared for shipment.
          </p>

          {/* Order Status Summary */}
          <div style={styles.statusSection}>
            <div style={styles.statusBox}>
              <div style={styles.statusLabel}>Order ID</div>
              <div style={styles.statusValue}>#{shortOrderId}</div>
            </div>
            <div style={styles.statusBox}>
              <div style={styles.statusLabel}>Order Status</div>
              <div style={{ ...styles.statusValue, color: getStatusColor(orderStatus) }}>
                {orderStatus}
              </div>
            </div>
            <div style={styles.statusBox}>
              <div style={styles.statusLabel}>Payment Status</div>
              <div style={{ ...styles.statusValue, color: getPaymentStatusColor(paymentStatus) }}>
                {paymentStatus}
              </div>
            </div>
            <div style={styles.statusBox}>
              <div style={styles.statusLabel}>Expected Delivery</div>
              <div style={styles.statusValue}>{getExpectedDelivery()}</div>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div style={styles.detailsCard}>
          <h3 style={styles.sectionTitle}>Order Details</h3>

          {/* Order Date & Time */}
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Order Date & Time</span>
            <span style={styles.infoValue}>{formatDate(createdAt)}</span>
          </div>

          {/* Payment Method */}
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Payment Method</span>
            <span style={styles.infoValue}>{paymentMethod}</span>
          </div>

          {/* Items */}
          <h4 style={styles.itemsTitle}>Items Ordered</h4>
          <div style={styles.itemsList}>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} style={styles.itemRow}>
                  <div style={styles.itemDetails}>
                    <div style={styles.itemName}>{item.name}</div>
                    {item.size && <div style={styles.itemMeta}>Size: {item.size}</div>}
                    {item.color && <div style={styles.itemMeta}>Color: {item.color}</div>}
                  </div>
                  <div style={styles.itemQty}>
                    Qty: <strong>{item.quantity}</strong>
                  </div>
                  <div style={styles.itemPrice}>
                    <strong>Rs. {(item.price * item.quantity).toLocaleString()}</strong>
                  </div>
                </div>
              ))
            ) : (
              <p style={styles.noItems}>No items in this order</p>
            )}
          </div>

          {/* Price Breakdown */}
          <div style={styles.priceBreakdown}>
            <div style={styles.priceRow}>
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {coupon && (
              <div style={styles.priceRow}>
                <span>Discount ({coupon.code} - {coupon.discountPercent}% off)</span>
                <span style={{ color: '#0e7a6d' }}>-Rs. {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div style={styles.priceRow}>
              <span>Delivery Charge</span>
              <span>Rs. {(deliveryCharge > 0 ? deliveryCharge : 0).toLocaleString()}</span>
            </div>
            <div style={{ ...styles.priceRow, ...styles.totalRow }}>
              <span style={styles.totalLabel}>Total Amount</span>
              <span style={styles.totalValue}>Rs. {totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div style={styles.detailsCard}>
          <h3 style={styles.sectionTitle}>Shipping Address</h3>
          <div style={styles.addressBox}>
            <div style={styles.addressRow}>
              <strong>{shippingAddress.fullName}</strong>
            </div>
            {shippingAddress.street && (
              <div style={styles.addressRow}>{shippingAddress.street}</div>
            )}
            <div style={styles.addressRow}>
              {shippingAddress.city}
              {shippingAddress.state && `, ${shippingAddress.state}`}
              {shippingAddress.pincode && ` ${shippingAddress.pincode}`}
            </div>
            {shippingAddress.country && (
              <div style={styles.addressRow}>{shippingAddress.country}</div>
            )}
            {shippingAddress.phone && (
              <div style={styles.addressRow}>Phone: {shippingAddress.phone}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actionsCard}>
          <div style={styles.actionsContent}>
            <p style={styles.helpText}>
              You can track your order status in your profile. An email confirmation has been sent to your registered email address.
            </p>
            <div style={styles.actions}>
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => navigate('/profile')}
              >
                Track My Order
              </button>
              <Link to="/products" style={styles.secondaryBtn}>
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  const colors = {
    'Processing': '#ff9800',
    'Confirmed': '#2196f3',
    'Shipped': '#0e7a6d',
    'Delivered': '#4caf50',
    'Cancelled': '#f44336'
  };
  return colors[status] || '#757575';
};

// Helper function to get payment status color
const getPaymentStatusColor = (status) => {
  const colors = {
    'Pending': '#ff9800',
    'Paid': '#4caf50',
    'Failed': '#f44336'
  };
  return colors[status] || '#757575';
};

const styles = {
  page: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    padding: '30px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #fffaf2 0%, #f6ede2 54%, #efe2d3 100%)',
    paddingTop: '60px'
  },
  glowA: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,122,109,0.2), transparent 66%)',
    top: '-110px',
    left: '-80px'
  },
  glowB: {
    position: 'absolute',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(198,111,47,0.24), transparent 62%)',
    bottom: '-100px',
    right: '-70px'
  },
  container: {
    width: 'min(900px, 100%)',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  card: {
    borderRadius: '26px',
    border: '1px solid rgba(170, 137, 108, 0.26)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,248,238,0.92))',
    boxShadow: '0 32px 70px rgba(58, 44, 32, 0.14)',
    padding: '28px 24px',
    textAlign: 'center'
  },
  detailsCard: {
    borderRadius: '18px',
    border: '1px solid rgba(170, 137, 108, 0.26)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,248,238,0.9))',
    padding: '24px'
  },
  actionsCard: {
    borderRadius: '18px',
    border: '1px solid rgba(170, 137, 108, 0.26)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,248,238,0.9))',
    padding: '24px',
    textAlign: 'center'
  },
  badge: {
    display: 'inline-block',
    marginBottom: '14px',
    padding: '8px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '1.2px',
    color: '#0e7a6d',
    backgroundColor: '#d6efe9'
  },
  title: {
    margin: '0 0 6px',
    fontFamily: 'Playfair Display, serif',
    color: '#1d1713',
    fontSize: 'clamp(32px, 5vw, 52px)',
    lineHeight: 1.05
  },
  brand: {
    margin: '0 0 12px',
    color: '#8f4e14',
    fontSize: 'clamp(20px, 3vw, 28px)',
    fontFamily: 'Cormorant Garamond, serif'
  },
  message: {
    margin: '0 auto 24px',
    color: '#5f5248',
    fontSize: '16px',
    maxWidth: '600px',
    lineHeight: 1.6
  },
  statusSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '24px'
  },
  statusBox: {
    borderRadius: '12px',
    background: '#f8efe4',
    padding: '16px',
    border: '1px solid #e8d7c5'
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8f4e14',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  },
  statusValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1d1713'
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 700,
    color: '#1d1713',
    borderBottom: '2px solid #e8d7c5',
    paddingBottom: '12px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0e5d8',
    fontSize: '15px',
    color: '#4d4138'
  },
  infoLabel: {
    fontWeight: 600,
    color: '#5f5248'
  },
  infoValue: {
    color: '#1d1713'
  },
  itemsTitle: {
    margin: '20px 0 12px',
    fontSize: '16px',
    fontWeight: 700,
    color: '#1d1713'
  },
  itemsList: {
    borderRadius: '12px',
    border: '1px solid #e8d7c5',
    overflow: 'hidden'
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #f0e5d8',
    gap: '12px'
  },
  itemDetails: {
    flex: 1
  },
  itemName: {
    fontWeight: 600,
    color: '#1d1713',
    marginBottom: '4px'
  },
  itemMeta: {
    fontSize: '13px',
    color: '#8f4e14'
  },
  itemQty: {
    fontSize: '14px',
    color: '#5f5248',
    whiteSpace: 'nowrap'
  },
  itemPrice: {
    fontSize: '15px',
    color: '#1d1713',
    whiteSpace: 'nowrap'
  },
  noItems: {
    padding: '20px',
    textAlign: 'center',
    color: '#8f4e14'
  },
  priceBreakdown: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '2px solid #e8d7c5'
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    fontSize: '15px',
    color: '#4d4138'
  },
  totalRow: {
    paddingTop: '12px',
    marginTop: '12px',
    borderTop: '2px solid #e8d7c5'
  },
  totalLabel: {
    fontWeight: 700,
    fontSize: '16px',
    color: '#1d1713'
  },
  totalValue: {
    fontWeight: 700,
    fontSize: '18px',
    color: '#0e7a6d'
  },
  addressBox: {
    background: '#f8efe4',
    padding: '18px',
    borderRadius: '12px',
    border: '1px solid #e8d7c5',
    lineHeight: 1.8
  },
  addressRow: {
    color: '#4d4138',
    fontSize: '15px'
  },
  helpText: {
    margin: '0 0 16px',
    color: '#5f5248',
    fontSize: '15px',
    lineHeight: 1.6
  },
  actionsContent: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '12px'
  },
  primaryBtn: {
    border: 'none',
    background: 'linear-gradient(135deg, #0e7a6d, #0a564d)',
    color: 'white',
    padding: '13px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: '0 14px 24px rgba(10,86,77,0.22)',
    transition: 'all 0.3s ease'
  },
  secondaryBtn: {
    textDecoration: 'none',
    border: '2px solid #0e7a6d',
    backgroundColor: 'transparent',
    color: '#0e7a6d',
    padding: '11px 22px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    display: 'inline-block',
    transition: 'all 0.3s ease'
  }
};

export default ThankYou;
