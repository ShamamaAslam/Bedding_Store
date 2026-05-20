import React, { useState } from 'react';
import { sendContactForm } from '../services/api';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await sendContactForm(form);
      if (res.data.success) {
        setSubmitted(true);
        setForm({ name: '', email: '', subject: '', message: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please email us directly at shamamaaslam377@gmail.com');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Contact Us</h1>
        <p style={styles.subtitle}>We would love to hear from you. Get in touch with Wajahat Fabrics support team.</p>

        <div style={styles.layout} className="responsive-grid-layout">
          {/* Info Side */}
          <div style={styles.infoCol}>
            <h2 style={styles.sectionTitle}>Get In Touch</h2>
            <p style={styles.description}>
              Have questions about our premium bedsheets, sizing, custom orders, or shipping? 
              Our support team is here to assist you 24/7.
            </p>

            <div style={styles.infoItem}>
              <span style={styles.icon}>📍</span>
              <div>
                <h4 style={styles.infoLabel}>Local Office Address</h4>
                <p style={styles.infoText}>Wajahat Fabrics, Plot 23-C, Sector G, LDA Scheme, Lahore, Punjab, Pakistan</p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.icon}>📞</span>
              <div>
                <h4 style={styles.infoLabel}>Phone Number</h4>
                <p style={styles.infoText}>+92 327 6354709</p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.icon}>✉️</span>
              <div>
                <h4 style={styles.infoLabel}>Email Support</h4>
                <p style={styles.infoText}>shamamaaslam377@gmail.com</p>
              </div>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.icon}>⏰</span>
              <div>
                <h4 style={styles.infoLabel}>Business Hours</h4>
                <p style={styles.infoText}>Monday - Saturday: 9:00 AM - 6:00 PM (PKT)</p>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div style={styles.formCol}>
            <h2 style={styles.sectionTitle}>Send Us a Message</h2>
            {submitted ? (
              <div style={styles.successBox}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ margin: '0 0 8px', color: '#155724' }}>Message Sent!</h3>
                <p style={{ margin: 0, color: '#155724' }}>
                  Thank you for contacting us. We've sent a confirmation to your email and our team will reply within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{ marginTop: '16px', background: '#0e7a6d', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={styles.input}
                    placeholder="Enter your name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={styles.input}
                    placeholder="Enter your email"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Subject *</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    style={styles.input}
                    placeholder="Message subject"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Message *</label>
                  <textarea
                    required
                    rows="5"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    style={{ ...styles.input, resize: 'vertical' }}
                    placeholder="How can we help you?"
                  />
                </div>
                {error && (
                  <p style={{ color: '#dc3545', fontSize: '14px', margin: '0 0 8px', padding: '10px', background: '#f8d7da', borderRadius: '6px' }}>
                    ⚠️ {error}
                  </p>
                )}
                <button type="submit" style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: { backgroundColor: '#faf6ef', minHeight: '80vh', padding: '60px 20px', fontFamily: 'inherit' },
  container: { maxWidth: '1200px', margin: '0 auto' },
  title: { fontSize: '36px', color: '#172c31', fontFamily: 'Playfair Display, serif', textAlign: 'center', marginBottom: '10px', fontWeight: 800 },
  subtitle: { fontSize: '16px', color: '#6e6056', textAlign: 'center', marginBottom: '50px' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'start' },
  infoCol: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #eadfce', boxShadow: '0 8px 24px rgba(46,35,25,0.06)' },
  sectionTitle: { fontSize: '22px', color: '#172c31', fontFamily: 'Playfair Display, serif', marginBottom: '20px', fontWeight: 700 },
  description: { fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '30px' },
  infoItem: { display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' },
  icon: { fontSize: '24px', backgroundColor: '#faf6ef', padding: '8px', borderRadius: '50%', color: '#0e7a6d' },
  infoLabel: { fontSize: '14px', fontWeight: 'bold', color: '#172c31', margin: '0 0 4px 0' },
  infoText: { fontSize: '13px', color: '#555', margin: 0, lineHeight: 1.4 },
  formCol: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #eadfce', boxShadow: '0 8px 24px rgba(46,35,25,0.06)' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#555' },
  input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  submitBtn: { width: '100%', border: 'none', background: '#0e7a6d', color: 'white', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(14,122,109,0.15)' },
  successBox: { textAlign: 'center', padding: '40px 20px', background: '#d4edda', borderRadius: '12px' },
};

export default Contact;
