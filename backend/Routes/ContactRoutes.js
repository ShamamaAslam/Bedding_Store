const express = require('express');
const router = express.Router();
const rateLimiter = require('../Middleware/rateLimiter');
const sendEmail = require('../Utils/sendEmail');

const contactLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many messages sent. Please wait 15 minutes before trying again.' });

router.post('/', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const emailBody = `
New Contact Form Message — Wajahat Fabrics

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
Sent via wfbedding.com contact form.
    `.trim();

    // Send to store owner
    await sendEmail({
      email: process.env.SMTP_EMAIL,
      subject: `[Contact Form] ${subject} — from ${name}`,
      message: emailBody
    });

    // Send acknowledgement to customer
    await sendEmail({
      email: email,
      subject: `We received your message — Wajahat Fabrics`,
      message: `Dear ${name},\n\nThank you for reaching out to Wajahat Fabrics. We have received your message and our team will get back to you within 24 hours.\n\nYour message:\n"${message}"\n\nBest Regards,\nWajahat Fabrics Team\n+92 327 6354709`
    });

    res.json({ success: true, message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again or email us directly.' });
  }
});

module.exports = router;
