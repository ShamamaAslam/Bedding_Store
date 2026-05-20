import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Privacy Policy</h1>
        <p style={styles.updated}>Last Updated: May 18, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Introduction</h2>
          <p style={styles.text}>
            Wajahat Fabrics ("we," "our," or "us") is committed to protecting the privacy of our valued customers. 
            This Privacy Policy describes how we collect, use, share, and protect personal data gathered from your visits 
            to and purchases on Wajahat Fabrics and Bedding Store.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Information We Collect</h2>
          <p style={styles.text}>
            When you visit or make a purchase from our store, we collect details necessary to process your transaction:
          </p>
          <ul style={styles.list}>
            <li><strong>Personal Contact Details:</strong> Name, shipping/billing address, phone number, and email.</li>
            <li><strong>Order details:</strong> Purchased bedsheets, items, sizes, colors, and notes.</li>
            <li><strong>Device & Browsing Info:</strong> IP address, browser type, and cookie logs to improve layout and security.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Secure Online Payments</h2>
          <p style={styles.text}>
            We integrate with fully certified and licensed payment services, including **Payfast (licensed by the State Bank of Pakistan)** 
            and **Stripe**. 
            All payment collections are performed securely:
          </p>
          <ul style={styles.list}>
            <li>Your sensitive financial data (credit card number, CVV, PINs) is processed through secure, bank-grade encrypted channels.</li>
            <li><strong>Our servers never store your raw credit or debit card data.</strong> This ensures 100% security against fraud.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. How We Use Your Data</h2>
          <p style={styles.text}>
            We use your data only for legitimate business purposes:
          </p>
          <ul style={styles.list}>
            <li>Fulfilling and shipping your orders via our trusted courier partners (TCS, Leopards, Trax).</li>
            <li>Updating you on order status and delivery tracking.</li>
            <li>Detecting potential risk or fraudulent activity.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Contact Us</h2>
          <p style={styles.text}>
            If you have questions about this policy or your personal data, contact us at **shamamaaslam377@gmail.com** 
            or call us at **+92 327 6354709**.
          </p>
        </section>
      </div>
    </div>
  );
};

const styles = {
  page: { backgroundColor: '#faf6ef', minHeight: '80vh', padding: '60px 20px', display: 'flex', justifyContent: 'center' },
  card: { width: '100%', maxWidth: '800px', backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #eadfce', boxShadow: '0 8px 24px rgba(46,35,25,0.06)' },
  title: { fontSize: '32px', color: '#172c31', fontFamily: 'Playfair Display, serif', fontWeight: 800, marginBottom: '6px' },
  updated: { fontSize: '12px', color: '#888', marginBottom: '30px' },
  section: { marginBottom: '28px' },
  sectionTitle: { fontSize: '18px', color: '#172c31', fontWeight: 'bold', marginBottom: '10px' },
  text: { fontSize: '14px', color: '#555', lineHeight: 1.6, margin: '0 0 10px 0' },
  list: { paddingLeft: '20px', margin: '10px 0', fontSize: '14px', color: '#555', lineHeight: 1.6 }
};

export default PrivacyPolicy;
