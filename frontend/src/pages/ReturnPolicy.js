import React from 'react';

const ReturnPolicy = () => {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Returns & Refunds Policy</h1>
        <p style={styles.updated}>Last Updated: May 18, 2026</p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Our Commitment</h2>
          <p style={styles.text}>
            At Wajahat Fabrics, we strive to deliver the absolute finest quality bedsheets and bedding textiles. 
            If you are not completely satisfied with your purchase, we offer a flexible, customer-friendly return policy.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Return Eligibility</h2>
          <p style={styles.text}>
            To qualify for a return or exchange:
          </p>
          <ul style={styles.list}>
            <li>You must submit your return request within **7 days** of delivery.</li>
            <li>Bedsheets and items must be **unwashed, unused, and undamaged**, with all original tags and luxury packaging intact.</li>
            <li>Items that are custom-stitched or tailored cannot be returned unless they are defective or damaged upon delivery.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Defective or Damaged Items</h2>
          <p style={styles.text}>
            If you receive a damaged, defective, or incorrect product, we apologize for the inconvenience! 
            We will arrange a **free replacement** or a **100% refund**:
          </p>
          <ul style={styles.list}>
            <li>Please contact us via phone or email within **48 hours** of delivery.</li>
            <li>Provide your Order ID and photo/video evidence of the defect.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. How Refunds Are Processed</h2>
          <p style={styles.text}>
            Once your returned item is received and inspected at our Lahore office, your refund is approved:
          </p>
          <ul style={styles.list}>
            <li><strong>For Card/Wallet Payments (Payfast/Stripe):</strong> The refund is credited directly back to the original bank card or account used. This takes **7 to 10 working days** depending on your bank's processing times.</li>
            <li><strong>For Cash on Delivery (COD) Orders:</strong> The refund will be sent to your bank account or Easypaisa/JazzCash wallet (you will need to provide your transfer details). This takes **2 to 3 business days**.</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Contact Support</h2>
          <p style={styles.text}>
            For all return and refund inquiries, email **shamamaaslam377@gmail.com** or call us at **+92 327 6354709**.
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

export default ReturnPolicy;
