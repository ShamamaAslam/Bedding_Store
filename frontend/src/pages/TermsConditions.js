import React from 'react';

const TermsConditions = () => {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Terms & Conditions</h1>
        <p style={styles.updated}>Last Updated: May 18, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Website Access & Agreement</h2>
          <p style={styles.text}>
            By browsing, accessing, or purchasing from Wajahat Fabrics and Bedding Store, you agree to comply with and 
            be bound by the following Terms and Conditions. Please review them carefully.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Product Pricing & Accuracy</h2>
          <p style={styles.text}>
            We make every effort to display accurate product details, fabric sizes, colors, and prices:
          </p>
          <ul style={styles.list}>
            <li>Prices listed are in Pakistani Rupees (PKR) and include local sales taxes.</li>
            <li>In the event of an unintended pricing error, we reserve the right to cancel or adjust orders placed at the incorrect price.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Ordering & Payment Authorization</h2>
          <p style={styles.text}>
            We support secure checkout payments through State Bank of Pakistan licensed payment gateways:
          </p>
          <ul style={styles.list}>
            <li>You agree to provide accurate, current, and complete shipping and card details for all checkouts.</li>
            <li>For online transactions, you certify that you are the authorized holder of the card or mobile wallet account.</li>
            <li>Orders are processed only after successful payment authorization (for card/wallet orders) or order verification (for Cash on Delivery).</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Governing Law</h2>
          <p style={styles.text}>
            These Terms & Conditions are governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. 
            Any dispute arising out of or related to these terms shall be subject to the exclusive jurisdiction of the courts of Lahore.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Updates to Terms</h2>
          <p style={styles.text}>
            We reserve the right to modify these terms at any time. Updates take effect immediately upon their publication on this page.
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

export default TermsConditions;
