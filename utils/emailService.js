const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email service not configured. Missing required environment variables.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        connectionTimeout: parseInt(process.env.EMAIL_TIMEOUT) || 10000,
        greetingTimeout: parseInt(process.env.EMAIL_TIMEOUT) || 10000,
        socketTimeout: parseInt(process.env.EMAIL_TIMEOUT) || 10000
      });

      this.isConfigured = true;
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Email service configuration failed:', error.message);
      this.isConfigured = false;
    }
  }

  async validateEmailConfig() {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'Email configuration is valid'
      };
    } catch (error) {
      console.error('Email configuration validation failed:', error.message);
      throw new Error(`Email configuration validation failed: ${error.message}`);
    }
  }

  async sendEmail(options) {
    if (!this.isConfigured) {
      throw new Error('Email service is not configured');
    }

    const { to, subject, text, html, from } = options;

    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email fields: to, subject, and content (text or html)');
    }

    const mailOptions = {
      from: from || process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html
    };

    const retryAttempts = parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 3;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to} (attempt ${attempt})`);
        return {
          success: true,
          messageId: result.messageId,
          message: 'Email sent successfully'
        };
      } catch (error) {
        console.error(`❌ Email send attempt ${attempt} failed:`, error.message);
        
        if (attempt === retryAttempts) {
          throw new Error(`Failed to send email after ${retryAttempts} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async sendContactFormEmail(contactData) {
    const { name, email, message, subject } = contactData;

    if (!name || !email || !message) {
      throw new Error('Missing required contact form fields: name, email, message');
    }

    const emailSubject = subject || 'New Contact Form Submission';
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${emailSubject}</p>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h3>Message:</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px; font-size: 12px; color: #666;">
          <p>This email was sent from the Equus Website contact form.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    `;

    const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${emailSubject}

Message:
${message}

---
This email was sent from the Equus Website contact form.
Timestamp: ${new Date().toISOString()}
    `;

    return await this.sendEmail({
      to: adminEmail,
      subject: `[Equus Website] ${emailSubject}`,
      text: textContent,
      html: htmlContent,
      from: `"${name}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`
    });
  }

  getServiceStatus() {
    return {
      configured: this.isConfigured,
      host: process.env.EMAIL_HOST || 'Not configured',
      port: process.env.EMAIL_PORT || 'Not configured',
      user: process.env.EMAIL_USER ? '***configured***' : 'Not configured',
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Not configured'
    };
  }
}

module.exports = new EmailService();