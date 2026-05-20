import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getEffectivePrice, getOriginalPrice, getSaleLabel } from '../utils/pricing';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();

  if (cartItems.length === 0) {
    return (
      <div style={styles.emptyCart}>
        <h2>🛒 Your cart is empty</h2>
        <Link to="/products" style={styles.shopBtn}>Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div style={styles.container} className="responsive-container">
      <h1 style={styles.title}>Shopping Cart ({totalItems} items)</h1>
      
      <div style={styles.cartContainer} className="cart-grid-layout">
        {/* Cart Items */}
        <div style={styles.itemsSection}>
          {cartItems.map(item => (
            <div key={`${item._id}-${item.selectedSize || 'nosize'}-${item.selectedColor || 'nocolor'}`} style={styles.cartItem} className="cart-item-row">
              <div style={styles.itemInfo} className="cart-item-info">
                <div style={styles.itemIcon}>🛍️</div>
                <div>
                  <h3 style={styles.itemName}>{item.name}</h3>
                  <p style={styles.itemPrice}>
                    {getSaleLabel(item) > 0 && <s style={styles.oldInlinePrice}>Rs.{getOriginalPrice(item)}</s>}
                    Rs.{getEffectivePrice(item)}
                  </p>
                  {item.selectedSize && <p style={styles.itemMeta}>Size: {item.selectedSize}</p>}
                  {item.selectedColor && <p style={styles.itemMeta}>Color: {item.selectedColor}</p>}
                </div>
              </div>
              
              <div style={styles.itemActions} className="cart-item-actions-row">
                <div style={styles.quantityControl}>
                  <button onClick={() => updateQuantity(item._id, item.quantity - 1, item.selectedSize, item.selectedColor)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item._id, item.quantity + 1, item.selectedSize, item.selectedColor)}>+</button>
                </div>
                <div style={styles.itemTotal}>
                  Rs.{getEffectivePrice(item) * item.quantity}
                </div>
                <button onClick={() => removeFromCart(item._id, item.selectedSize, item.selectedColor)} style={styles.removeBtn}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div style={styles.summarySection}>
          <h2 style={styles.summaryTitle}>Order Summary</h2>
          <div style={styles.summaryRow}>
            <span>Subtotal ({totalItems} items)</span>
            <span>Rs.{totalPrice}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <hr style={styles.divider} />
          <div style={styles.totalRow}>
            <span>Total</span>
            <span style={styles.totalPrice}>Rs.{totalPrice}</span>
          </div>
          <Link to="/checkout" style={styles.checkoutBtn}>Proceed to Checkout →</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '26px 18px 44px'
  },
  title: {
    fontSize: 'clamp(30px, 4vw, 42px)',
    marginBottom: '30px',
    color: '#171310',
    fontFamily: 'Playfair Display, serif'
  },
  cartContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '40px'
  },
  itemsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(8px)',
    borderRadius: '18px',
    boxShadow: '0 18px 40px rgba(34,24,17,0.08)',
    border: '1px solid rgba(227, 214, 200, 0.8)'
  },
  itemInfo: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  itemIcon: {
    fontSize: '48px'
  },
  itemName: {
    margin: 0,
    fontSize: '16px',
    color: '#1a1a2e'
  },
  itemPrice: {
    margin: '5px 0 0',
    color: '#b35d00',
    fontWeight: 'bold'
  },
  oldInlinePrice: { color: '#aaa', marginRight: '8px', fontWeight: 400 },
  itemMeta: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#666'
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    padding: '5px 10px'
  },
  itemTotal: {
    fontWeight: 'bold',
    minWidth: '80px',
    textAlign: 'right'
  },
  removeBtn: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  summarySection: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,240,231,0.92))',
    padding: '24px',
    borderRadius: '22px',
    height: 'fit-content',
    border: '1px solid rgba(227, 214, 200, 0.8)',
    boxShadow: '0 18px 40px rgba(34,24,17,0.08)'
  },
  summaryTitle: {
    fontSize: '18px',
    marginBottom: '20px',
    color: '#171310',
    fontFamily: 'Playfair Display, serif'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    color: '#666'
  },
  divider: {
    margin: '15px 0',
    border: 'none',
    borderTop: '1px solid #ddd'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  totalPrice: {
    color: '#e94560'
  },
  checkoutBtn: {
    display: 'block',
    background: 'linear-gradient(135deg, #0e7a6d, #0a564d)',
    color: 'white',
    textAlign: 'center',
    padding: '12px',
    borderRadius: '14px',
    textDecoration: 'none',
    fontWeight: 'bold',
    boxShadow: '0 16px 28px rgba(10,86,77,0.22)'
  },
  emptyCart: {
    textAlign: 'center',
    padding: '80px 20px'
  },
  shopBtn: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #0e7a6d, #0a564d)',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '14px',
    textDecoration: 'none',
    marginTop: '20px',
    boxShadow: '0 16px 28px rgba(10,86,77,0.22)'
  }
};

export default Cart;