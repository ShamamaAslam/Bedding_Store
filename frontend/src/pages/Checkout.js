// ── SETUP INSTRUCTIONS ────────────────────────────────────────────────────────
// Run in your frontend folder:
//   npm install @stripe/react-stripe-js @stripe/stripe-js
// Add to your frontend .env:
//   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, createPaymentIntent } from '../services/api';
import { getEffectivePrice, getOriginalPrice, getSaleLabel } from '../utils/pricing';
import { getStoredMarketingSource } from '../utils/attribution';
import { getBehaviorSessionId, trackCheckoutEvent } from '../utils/behaviorTracker';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')
  .catch((err) => {
    // Prevent uncaught runtime error when the Stripe script fails to load
    // (network blocked, CSP, or offline). Components will see `stripe` as null
    // and the UI already handles the case where `stripe` is not available.
    // Log the error for debugging.
    // eslint-disable-next-line no-console
    console.error('Failed to load Stripe.js', err);
    return null;
  });
const COUPON_KEY = 'wf_applied_coupon';
const DELIVERY_CHARGE = 250;

const PAKISTAN_STATES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir'
];

const PAKISTAN_CITIES = {
  Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur'],
  Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas'],
  'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Abbottabad', 'Swat', 'Kohat'],
  Balochistan: ['Quetta', 'Gwadar', 'Khuzdar', 'Turbat'],
  'Islamabad Capital Territory': ['Islamabad'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza'],
  'Azad Jammu and Kashmir': ['Muzaffarabad', 'Mirpur', 'Kotli']
};

// ── Inner Checkout Form (must be inside <Elements>) ───────────────────────────
const CheckoutForm = () => {
  const { cartItems, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    street: '', city: '', state: '', pincode: '',
    phone: user?.phone || '',
    paymentMethod: 'COD',
    notes: ''
  });
  const [cardError, setCardError] = useState('');
  const [coupon, setCoupon] = useState(() => {
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed?.code || !parsed?.discountPercent) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  const discountAmount = coupon ? Math.round((totalPrice * coupon.discountPercent) / 100) : 0;
  const discountedSubtotal = Math.max(0, totalPrice - discountAmount);
  const payableTotal = discountedSubtotal + DELIVERY_CHARGE;
  const cityOptions = PAKISTAN_CITIES[formData.state] || [];

  useEffect(() => {
    trackCheckoutEvent({
      step: 'checkout_start',
      metadata: {
        cartItems: cartItems.length,
        total: payableTotal
      }
    });

    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate, payableTotal]);

  useEffect(() => {
    if (!formData.paymentMethod) return;
    trackCheckoutEvent({
      step: 'checkout_payment_selected',
      metadata: { paymentMethod: formData.paymentMethod }
    });
  }, [formData.paymentMethod]);

  if (cartItems.length === 0) {
    return null;
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCardError('');
    setSubmitMessage({ type: '', text: '' });

    const orderPayload = {
      items: cartItems.map(item => ({
        product: item._id,
        name: item.name,
        price: getEffectivePrice(item),
        quantity: item.quantity,
        size: item.selectedSize,
        color: item.selectedColor
      })),
      totalAmount: payableTotal,
      shippingAddress: {
        fullName: formData.fullName,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        phone: formData.phone
      },
      paymentMethod: formData.paymentMethod,
      marketingSource: getStoredMarketingSource(),
      checkoutSessionId: getBehaviorSessionId(),
      notes: `${formData.notes || ''}${coupon ? `\nCoupon Applied: ${coupon.code} (${coupon.discountPercent}% off)` : ''}`.trim()
    };

    try {
      trackCheckoutEvent({
        step: 'checkout_shipping_filled',
        metadata: {
          city: formData.city,
          state: formData.state
        }
      });
      trackCheckoutEvent({
        step: 'checkout_submit_attempt',
        metadata: {
          paymentMethod: formData.paymentMethod,
          total: payableTotal
        }
      });

      // ── CARD PAYMENT via Stripe ──────────────────────────────────────────
      if (formData.paymentMethod === 'Card') {
        if (!stripe || !elements) {
          setCardError('Stripe is not loaded. Please refresh.');
          trackCheckoutEvent({ step: 'checkout_payment_failed', metadata: { reason: 'stripe_not_loaded' } });
          setLoading(false);
          return;
        }

        // 1. Get client secret from our backend
        const intentRes = await createPaymentIntent({ totalAmount: payableTotal });
        const { clientSecret } = intentRes.data;

        // 2. Confirm the payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { name: formData.fullName }
          }
        });

        if (error) {
          setCardError(error.message);
          trackCheckoutEvent({ step: 'checkout_payment_failed', metadata: { reason: error.message || 'stripe_error' } });
          setLoading(false);
          return;
        }

        if (paymentIntent.status !== 'succeeded') {
          setCardError('Payment was not successful. Please try again.');
          trackCheckoutEvent({ step: 'checkout_payment_failed', metadata: { reason: `status_${paymentIntent.status}` } });
          setLoading(false);
          return;
        }

        trackCheckoutEvent({
          step: 'checkout_payment_success',
          metadata: { paymentMethod: 'Card', paymentIntentId: paymentIntent.id }
        });

        // 3. Payment succeeded → create order with paymentStatus: 'Paid'
        orderPayload.paymentStatus = 'Paid';
        orderPayload.stripePaymentId = paymentIntent.id;
      }

      // ── CREATE ORDER in our backend ──────────────────────────────────────
      const res = await createOrder(orderPayload);
      if (res.data.success) {
        const placedOrder = res.data.order;
        trackCheckoutEvent({
          step: 'checkout_order_success',
          metadata: {
            orderId: placedOrder._id,
            total: placedOrder.totalAmount,
            paymentMethod: placedOrder.paymentMethod
          }
        });
        clearCart();
        localStorage.removeItem(COUPON_KEY);
        setSubmitMessage({
          type: 'success',
          text: `Order placed successfully! Order ID: #${placedOrder._id.slice(-8)}`
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          navigate('/thank-you', {
            state: {
              orderId: placedOrder._id,
              shortOrderId: placedOrder._id.slice(-8),
              totalAmount: placedOrder.totalAmount,
              paymentMethod: placedOrder.paymentMethod,
              customerName: formData.fullName
            }
          });
        }, 700);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Order failed. Please try again.';
      trackCheckoutEvent({ step: 'checkout_payment_failed', metadata: { reason: msg } });
      setSubmitMessage({ type: 'error', text: msg });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Checkout</h1>

      <div style={styles.layout}>
        {/* Left — Shipping + Payment Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.sectionTitle}>Shipping Address</h2>

          {submitMessage.text && (
            <div style={{ ...styles.notice, ...(submitMessage.type === 'error' ? styles.noticeError : styles.noticeSuccess) }}>
              {submitMessage.text}
            </div>
          )}

          {[
            { label: 'Full Name *', name: 'fullName', type: 'text' },
            { label: 'Street Address *', name: 'street', type: 'text' },
          ].map(f => (
            <div key={f.name} style={styles.formGroup}>
              <label style={styles.label}>{f.label}</label>
              <input type={f.type} name={f.name} value={formData[f.name]} onChange={handleChange} required style={styles.input} />
            </div>
          ))}

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>State / Province *</label>
              <select name="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })} required style={styles.input}>
                <option value="">Select Province</option>
                {PAKISTAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>City *</label>
              <select name="city" value={formData.city} onChange={handleChange} required style={styles.input} disabled={!formData.state}>
                <option value="">{formData.state ? 'Select City' : 'Select Province First'}</option>
                {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pincode *</label>
              <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required style={styles.input} />
            </div>
          </div>

          <h2 style={{ ...styles.sectionTitle, marginTop: '28px' }}>Payment Method</h2>

          <div style={styles.paymentOptions}>
            <label style={{ ...styles.radioLabel, ...(formData.paymentMethod === 'COD' ? styles.radioActive : {}) }}>
              <input type="radio" name="paymentMethod" value="COD" checked={formData.paymentMethod === 'COD'} onChange={handleChange} />
              💵 Cash on Delivery
            </label>
            <label style={{ ...styles.radioLabel, ...(formData.paymentMethod === 'Card' ? styles.radioActive : {}) }}>
              <input type="radio" name="paymentMethod" value="Card" checked={formData.paymentMethod === 'Card'} onChange={handleChange} />
              💳 Credit / Debit Card
            </label>
          </div>

          {/* Stripe Card Element — shown only when Card is selected */}
          {formData.paymentMethod === 'Card' && (
            <div style={styles.stripeBox}>
              <CardElement options={cardElementOptions} />
              {cardError && <p style={styles.cardError}>{cardError}</p>}
              <p style={styles.testNote}>
                🧪 Test card: <code>4242 4242 4242 4242</code> · Any future date · Any CVC
              </p>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Order Notes (Optional)</label>
            <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} style={{ ...styles.input, resize: 'vertical' }} placeholder="Special instructions..." />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading || (formData.paymentMethod === 'Card' && !stripe)}>
            {loading ? '⏳ Processing...' : formData.paymentMethod === 'Card' ? '💳 Pay & Place Order' : '📦 Place Order'}
          </button>
        </form>

        {/* Right — Order Summary */}
        <div style={styles.summary}>
          <h2 style={styles.sectionTitle}>Order Summary</h2>

          {cartItems.map(item => (
            <div key={`${item._id}-${item.selectedSize}-${item.selectedColor}`} style={styles.summaryItem}>
              <div style={{ flex: 1 }}>
                <p style={styles.itemName}>{item.name}</p>
                <p style={styles.itemMeta}>
                  {item.selectedColor && `${item.selectedColor} • `}
                  {item.selectedSize && `${item.selectedSize} • `}
                  Qty: {item.quantity}
                </p>
              </div>
              <p style={styles.itemPrice}>Rs. {getEffectivePrice(item) * item.quantity}</p>
            </div>
          ))}

          <hr style={styles.divider} />

          {[
            { label: 'Subtotal', value: `Rs. ${totalPrice}` },
            ...(coupon ? [{ label: `Coupon (${coupon.code})`, value: `- Rs. ${discountAmount}` }] : []),
            { label: 'Delivery Charges', value: `Rs. ${DELIVERY_CHARGE}` },
            { label: 'Tax', value: 'Included' },
          ].map(row => (
            <div key={row.label} style={styles.totalRow}>
              <span>{row.label}</span><span>{row.value}</span>
            </div>
          ))}

          {coupon && (
            <button
              type="button"
              style={styles.clearCouponBtn}
              onClick={() => {
                localStorage.removeItem(COUPON_KEY);
                setCoupon(null);
              }}
            >
              Remove Coupon
            </button>
          )}

          <hr style={styles.divider} />

          <div style={{ ...styles.totalRow, fontWeight: 'bold', fontSize: '20px' }}>
            <span>Total</span>
            <span style={{ color: '#e94560' }}>Rs. {payableTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stripe CardElement styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a2e',
      fontFamily: 'inherit',
      '::placeholder': { color: '#aab7c4' }
    },
    invalid: { color: '#e94560' }
  }
};

// ── Wrapper that provides Stripe context ──────────────────────────────────────
const Checkout = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  title: { fontSize: '32px', color: '#1a1a2e', marginBottom: '30px' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' },
  form: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: '20px', color: '#1a1a2e', marginBottom: '20px', marginTop: 0 },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '6px', fontSize: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  paymentOptions: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 20px', border: '2px solid #ddd', borderRadius: '10px', fontSize: '15px', flex: 1, minWidth: '160px' },
  radioActive: { border: '2px solid #e94560', backgroundColor: '#fff5f6' },
  stripeBox: { border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '20px', backgroundColor: '#f9f9f9' },
  cardError: { color: '#e94560', fontSize: '14px', marginTop: '8px' },
  testNote: { fontSize: '12px', color: '#888', marginTop: '10px', backgroundColor: '#fff3cd', padding: '8px 12px', borderRadius: '6px' },
  notice: { padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px', fontWeight: 'bold' },
  noticeSuccess: { backgroundColor: '#d4edda', color: '#155724' },
  noticeError: { backgroundColor: '#f8d7da', color: '#721c24' },
  submitBtn: { width: '100%', backgroundColor: '#e94560', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' },
  summary: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: 'fit-content', position: 'sticky', top: '80px' },
  summaryItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' },
  itemName: { fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' },
  itemMeta: { fontSize: '12px', color: '#888' },
  itemPrice: { fontWeight: 'bold', color: '#e94560', fontSize: '15px', flexShrink: 0, marginLeft: '12px' },
  divider: { margin: '16px 0', border: 'none', borderTop: '1px solid #eee' },
  totalRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px' },
  clearCouponBtn: {
    width: '100%',
    border: '1px solid #d9c2aa',
    backgroundColor: '#fff8f1',
    color: '#8f4e14',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    marginBottom: '8px',
    fontWeight: 'bold'
  }
};

export default Checkout;