import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyPayfastSession, getOrderById } from '../services/api';

const SecureGateway = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get('orderId');
  const amount = queryParams.get('amount') || '0';

  const [activeTab, setActiveTab] = useState('card');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderData, setOrderData] = useState(null);

  // Form states
  const [cardForm, setCardForm] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [mobileForm, setMobileForm] = useState({ phone: '' });

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await getOrderById(orderId);
        if (res.data) {
          setOrderData(res.data);
        }
      } catch (err) {
        setErrorMessage('Failed to load transaction details.');
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  const handleCardChange = (e) => setCardForm({ ...cardForm, [e.target.name]: e.target.value });
  const handleMobileChange = (e) => setMobileForm({ ...mobileForm, [e.target.name]: e.target.value });

  const handlePayment = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    // Simulate SBP 3D Secure bank validation stages
    setLoadingStage('🔒 Connecting to secure payment network...');
    await new Promise((r) => setTimeout(r, 1000));

    setLoadingStage('💳 Contacting customer bank for authorization...');
    await new Promise((r) => setTimeout(r, 1200));

    setLoadingStage(`💸 Deducting Rs. ${amount} from account...`);
    await new Promise((r) => setTimeout(r, 1000));

    try {
      // Call our backend to verify and mark the order as paid!
      const verifyRes = await verifyPayfastSession({
        orderId,
        paymentId: `pf_sec_${Math.round(Math.random() * 1e9)}`,
        paymentStatus: 'Paid'
      });

      if (verifyRes.data.success) {
        setSuccess(true);
        setLoadingStage('✅ Payment authorized successfully!');
        await new Promise((r) => setTimeout(r, 1200));
        
        // Redirect to thank you page with full state
        const placedOrder = verifyRes.data.order;
        navigate('/thank-you', {
          state: {
            order: placedOrder,
            orderId: placedOrder._id,
            shortOrderId: placedOrder._id.slice(-8),
            totalAmount: placedOrder.totalAmount,
            paymentMethod: placedOrder.paymentMethod,
            paymentStatus: placedOrder.paymentStatus,
            orderStatus: placedOrder.orderStatus,
            customerName: placedOrder.shippingAddress?.fullName || 'Valued Customer',
            shippingAddress: placedOrder.shippingAddress,
            items: placedOrder.items,
            createdAt: placedOrder.createdAt
          }
        });
      } else {
        throw new Error(verifyRes.data.message || 'Verification failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Transaction authorization failed. Please try again.');
      setLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Secure Bank Header */}
        <div style={styles.header}>
          <div style={styles.shieldIcon}>🔒</div>
          <div>
            <h2 style={styles.headerTitle}>WF SECURE TRANSACTION</h2>
            <p style={styles.headerSub}>SBP-Licensed Payment gateway integration</p>
          </div>
        </div>

        {/* Transaction Info */}
        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Merchant</span>
            <span style={styles.infoValue}>Wajahat Fabrics and Bedding Store</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Order Reference</span>
            <span style={styles.infoValue}>#{orderId ? orderId.slice(-8) : 'N/A'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Amount Payable</span>
            <span style={styles.amountValue}>Rs. {amount}</span>
          </div>
        </div>

        {errorMessage && <div style={styles.errorNotice}>{errorMessage}</div>}

        {loading ? (
          <div style={styles.loaderArea}>
            <div style={styles.spinner} />
            <p style={styles.stageText}>{loadingStage}</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                type="button"
                style={{ ...styles.tabBtn, ...(activeTab === 'card' ? styles.activeTabBtn : {}) }}
                onClick={() => setActiveTab('card')}
              >
                💳 Card (Visa/Master)
              </button>
              <button
                type="button"
                style={{ ...styles.tabBtn, ...(activeTab === 'easypaisa' ? styles.activeTabBtn : {}) }}
                onClick={() => setActiveTab('easypaisa')}
              >
                📱 Easypaisa
              </button>
              <button
                type="button"
                style={{ ...styles.tabBtn, ...(activeTab === 'jazzcash' ? styles.activeTabBtn : {}) }}
                onClick={() => setActiveTab('jazzcash')}
              >
                📱 JazzCash
              </button>
            </div>

            {/* Payment Fields */}
            <form onSubmit={handlePayment} style={styles.form}>
              {activeTab === 'card' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cardholder Name</label>
                    <input
                      type="text"
                      name="name"
                      value={cardForm.name}
                      onChange={handleCardChange}
                      required
                      placeholder="Jane Doe"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Card Number</label>
                    <input
                      type="text"
                      name="number"
                      value={cardForm.number}
                      onChange={handleCardChange}
                      required
                      maxLength="16"
                      placeholder="4000 1234 5678 9010"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.row} className="responsive-form-row">
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Expiry Date</label>
                      <input
                        type="text"
                        name="expiry"
                        value={cardForm.expiry}
                        onChange={handleCardChange}
                        required
                        maxLength="5"
                        placeholder="MM/YY"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>CVV / CVC</label>
                      <input
                        type="password"
                        name="cvv"
                        value={cardForm.cvv}
                        onChange={handleCardChange}
                        required
                        maxLength="3"
                        placeholder="123"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </>
              )}

              {(activeTab === 'easypaisa' || activeTab === 'jazzcash') && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {activeTab === 'easypaisa' ? 'Easypaisa Account Number' : 'JazzCash Account Number'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={mobileForm.phone}
                    onChange={handleMobileChange}
                    required
                    maxLength="11"
                    placeholder="03001234567"
                    style={styles.input}
                  />
                  <p style={styles.helpText}>
                    Enter your 11-digit mobile wallet number. You will receive an authorization popup on your phone screen.
                  </p>
                </div>
              )}

              <button type="submit" style={styles.payBtn}>
                🔐 Verify & Deduct Rs. {amount}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '85vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf6ef',
    padding: '40px 20px'
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #eadfce',
    boxShadow: '0 12px 36px rgba(46, 35, 25, 0.12)',
    overflow: 'hidden'
  },
  header: {
    padding: '20px',
    background: 'linear-gradient(135deg, #10524b, #0e7a6d)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  shieldIcon: { fontSize: '28px' },
  headerTitle: { margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.8px' },
  headerSub: { margin: '4px 0 0 0', fontSize: '11px', opacity: 0.85 },
  infoBox: { padding: '20px', backgroundColor: '#fffdfa', borderBottom: '1px solid #f2e7d9' },
  infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' },
  infoLabel: { color: '#7c6d61' },
  infoValue: { fontWeight: '600', color: '#2c231d' },
  amountValue: { fontWeight: 'bold', fontSize: '16px', color: '#e94560' },
  errorNotice: { margin: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#f8d7da', color: '#721c24', fontSize: '13px', fontWeight: 'bold' },
  tabs: { display: 'flex', borderBottom: '1px solid #eee' },
  tabBtn: { flex: 1, padding: '12px', border: 'none', background: '#f9f9f9', cursor: 'pointer', fontSize: '13px', color: '#555', transition: 'all 0.2s' },
  activeTabBtn: { background: 'white', borderBottom: '2px solid #0e7a6d', color: '#0e7a6d', fontWeight: 'bold' },
  form: { padding: '24px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '6px' },
  input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  helpText: { fontSize: '11px', color: '#666', marginTop: '6px', lineHeight: 1.4 },
  payBtn: { width: '100%', border: 'none', background: '#0e7a6d', color: 'white', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 12px rgba(14,122,109,0.2)' },
  loaderArea: { padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #0e7a6d', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  stageText: { marginTop: '18px', fontSize: '13px', fontWeight: 'bold', color: '#555' }
};

// Injection of keyframes spin
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default SecureGateway;
