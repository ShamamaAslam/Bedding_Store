import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const publicUrl = process.env.PUBLIC_URL || '';

  return (
    <footer style={styles.footer}>
      {/* Top Section */}
      <div style={styles.topSection}>
        <div style={styles.container}>
          {/* Brand & About */}
          <div style={styles.column}>
            <div style={styles.brandSection}>
              <div style={styles.brandLogoSmall}>
                <img src={`${publicUrl}/brand-logo.png`} alt="Wajahat Fabrics" style={styles.logoImg} />
              </div>
              <div>
                <h3 style={styles.brandName}>Wajahat Fabrics</h3>
                <p style={styles.brandTagline}>Luxury Bedding & Home Textiles</p>
              </div>
            </div>
            <p style={styles.description}>
              Premium quality bedsheets, fabrics, and home textiles designed to elevate your lifestyle with comfort and elegance.
            </p>
            <div style={styles.socialLinks}>
              <a href="#" style={styles.socialIcon} title="Facebook">f</a>
              <a href="#" style={styles.socialIcon} title="Instagram">📷</a>
              <a href="#" style={styles.socialIcon} title="Twitter">𝕏</a>
              <a href="#" style={styles.socialIcon} title="LinkedIn">in</a>
            </div>
          </div>

          {/* Quick Links */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Shop</h4>
            <ul style={styles.linkList}>
              <li><Link to="/products" style={styles.footerLink}>All Products</Link></li>
              <li><Link to="/products?category=bedsheets" style={styles.footerLink}>Bedsheets</Link></li>
              <li><Link to="/products?category=fabrics" style={styles.footerLink}>Fabrics</Link></li>
              <li><Link to="/products?category=home-decor" style={styles.footerLink}>Home Decor</Link></li>
              <li><Link to="/products?sort=trending" style={styles.footerLink}>Trending</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Support</h4>
            <ul style={styles.linkList}>
              <li><Link to="/contact" style={styles.footerLink}>Contact Us</Link></li>
              <li><Link to="/shipping-policy" style={styles.footerLink}>Shipping Info</Link></li>
              <li><Link to="/return-policy" style={styles.footerLink}>Returns & Refunds</Link></li>
              <li><Link to="/products" style={styles.footerLink}>FAQ</Link></li>
              <li><Link to="/profile" style={styles.footerLink}>Order Tracking</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Company</h4>
            <ul style={styles.linkList}>
              <li><Link to="/products" style={styles.footerLink}>About Us</Link></li>
              <li><Link to="/products" style={styles.footerLink}>Blog</Link></li>
              <li><Link to="/products" style={styles.footerLink}>Careers</Link></li>
              <li><Link to="/products" style={styles.footerLink}>Press</Link></li>
              <li><Link to="/products" style={styles.footerLink}>Partnerships</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Newsletter</h4>
            <p style={styles.newsletterText}>Subscribe for exclusive offers and new arrivals.</p>
            <div style={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Enter your email"
                style={styles.emailInput}
              />
              <button style={styles.subscribeBtn}>Subscribe</button>
            </div>
            <p style={styles.privacyText}>We respect your privacy. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={styles.bottomSection}>
        <div style={styles.container}>
          <div style={styles.bottomContent}>
            <p style={styles.copyright}>
              © {currentYear} Wajahat Fabrics and Bedding Store. All rights reserved.
              <br />
              <span style={{ fontSize: '11px', color: '#888', marginTop: '4px', display: 'inline-block' }}>
                Disclaimer: This is a student class project for learning purposes. The product images are taken from various websites.
              </span>
            </p>
            <div style={styles.bottomLinks}>
              <Link to="/privacy-policy" style={styles.bottomLink}>Privacy Policy</Link>
              <span style={styles.divider}>•</span>
              <Link to="/terms-conditions" style={styles.bottomLink}>Terms of Service</Link>
              <span style={styles.divider}>•</span>
              <Link to="/privacy-policy" style={styles.bottomLink}>Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
    color: '#e5e5e5',
    paddingTop: '60px',
    paddingBottom: '0',
    marginTop: '80px',
    fontFamily: 'inherit'
  },
  topSection: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '50px'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '40px'
  },
  column: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  brandLogoSmall: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center'
  },
  brandName: {
    fontSize: '18px',
    fontWeight: 700,
    margin: '0',
    color: '#fff',
    fontFamily: 'Playfair Display, serif'
  },
  brandTagline: {
    fontSize: '12px',
    margin: '3px 0 0 0',
    color: '#b8936d',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  description: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#b8b8b8',
    margin: '12px 0',
    fontWeight: 400
  },
  socialLinks: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  socialIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(184, 147, 109, 0.15)',
    border: '1px solid rgba(184, 147, 109, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#b8936d',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 300ms ease',
    cursor: 'pointer',
    ':hover': {
      background: 'rgba(184, 147, 109, 0.3)',
      color: '#fff'
    }
  },
  columnTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 20px 0'
  },
  linkList: {
    listStyle: 'none',
    padding: '0',
    margin: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  footerLink: {
    color: '#b8b8b8',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'color 260ms ease',
    ':hover': {
      color: '#b8936d'
    }
  },
  newsletterText: {
    fontSize: '13px',
    color: '#b8b8b8',
    margin: '0 0 14px 0',
    lineHeight: '1.5'
  },
  newsletterForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px'
  },
  emailInput: {
    padding: '10px 14px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#e5e5e5',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 260ms ease, background-color 260ms ease',
    ':focus': {
      borderColor: 'rgba(184, 147, 109, 0.5)',
      background: 'rgba(255, 255, 255, 0.08)'
    }
  },
  subscribeBtn: {
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #b8936d, #a0825f)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 260ms ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 16px rgba(184, 147, 109, 0.3)'
    }
  },
  privacyText: {
    fontSize: '12px',
    color: '#808080',
    margin: '0'
  },
  bottomSection: {
    padding: '24px 20px',
    background: 'rgba(0, 0, 0, 0.4)'
  },
  bottomContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  copyright: {
    fontSize: '12px',
    color: '#808080',
    margin: '0'
  },
  bottomLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  bottomLink: {
    color: '#808080',
    textDecoration: 'none',
    fontSize: '12px',
    transition: 'color 260ms ease',
    ':hover': {
      color: '#b8936d'
    }
  },
  divider: {
    color: '#505050'
  }
};

export default Footer;
