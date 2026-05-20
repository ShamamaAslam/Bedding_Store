import React from 'react';

const ShippingPolicy = () => {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Shipping & Delivery Policy</h1>
        <p style={styles.updated}>Last Updated: May 18, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Delivery Locations</h2>
          <p style={styles.text}>
            We deliver our premium bedding and home fabrics products to all cities, towns, and regions **across the Islamic Republic of Pakistan**.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Timelines & Shipping Speeds</h2>
          <p style={styles.text}>
            Once your order is confirmed, we ship it from our Lahore warehouse within **24 hours**:
          </p>
          <ul style={styles.list}>
            <li><strong>Lahore:</strong> 1 to 2 business days.</li>
            <li><strong>Major Cities (Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, etc.):</strong> 2 to 3 business days.</li>
            <li><strong>Other towns and rural areas:</strong> 3 to 5 business days.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Shipping & Delivery Charges</h2>
          <p style={styles.text}>
            We keep our shipping rates simple and transparent:
          </p>
          <ul style={styles.list}>
            <li><strong>Standard Flat Shipping:</strong> Rs. 250 flat fee per order nationwide.</li>
            <li><strong>Free Shipping Campaign:</strong> Free delivery is automatically applied to orders during select promotional campaigns or coupons!</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Courier Partners & Tracking</h2>
          <p style={styles.text}>
            We partner with Pakistan’s leading shipping logistics networks to ensure your products arrive safely:
          </p>
          <ul style={styles.list}>
            <li><strong>Our Courier Partners:</strong> TCS, Leopards Courier, and Trax Logistics.</li>
            <li><strong>Tracking:</strong> You will receive a secure tracking number via SMS/Email the moment your order leaves our Lahore office. You can track your parcel anytime directly on our website or the courier portal!</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Contact Us</h2>
          <p style={styles.text}>
            If you have questions about our delivery or shipping timelines, email **shamamaaslam377@gmail.com** or call us at **+92 327 6354709**.
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

export default ShippingPolicy;
