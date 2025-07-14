const emailService = require('../utils/emailService');
const Contact = require('../models/Contact');

const emailController = {
  async sendContactForm(req, res) {
    try {
      const { name, email, message, subject } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Name, email, and message are required fields'
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide a valid email address'
        });
      }

      const ipAddress = getClientIpAddress(req);
      const userAgent = req.get('User-Agent') || 'Unknown';

      const contactData = {
        name: sanitizeInput(name),
        email: sanitizeInput(email).toLowerCase(),
        message: sanitizeInput(message),
        subject: subject ? sanitizeInput(subject) : 'Contact Form Submission',
        ipAddress,
        userAgent
      };

      const existingContact = await Contact.findByEmail(contactData.email);
      if (existingContact) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate Submission',
          message: 'A contact form with this email has already been submitted'
        });
      }

      let emailResult;
      let contact;

      try {
        emailResult = await emailService.sendContactFormEmail(contactData);
        
        contact = new Contact({
          ...contactData,
          emailSent: true,
          emailMessageId: emailResult.messageId
        });

        await contact.save();
        
        console.log(`✅ Contact form saved to database: ${contact._id}`);

      } catch (emailError) {
        console.error('Email sending failed:', emailError.message);
        
        contact = new Contact({
          ...contactData,
          emailSent: false
        });

        await contact.save();
        
        return res.status(500).json({
          success: false,
          error: 'Email Service Error',
          message: 'Contact form saved but email failed to send. We will contact you soon.',
          contactId: contact._id
        });
      }

      res.status(200).json({
        success: true,
        message: 'Contact form submitted successfully',
        contactId: contact._id,
        messageId: emailResult.messageId
      });

    } catch (error) {
      console.error('Contact form submission error:', error.message);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to process contact form. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async sendEmail(req, res) {
    try {
      const { to, subject, text, html, from } = req.body;

      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'To, subject, and content (text or html) are required fields'
        });
      }

      if (!isValidEmail(to)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide a valid email address'
        });
      }

      const result = await emailService.sendEmail({
        to: sanitizeInput(to),
        subject: sanitizeInput(subject),
        text: text ? sanitizeInput(text) : undefined,
        html: html ? sanitizeInput(html) : undefined,
        from: from ? sanitizeInput(from) : undefined
      });

      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      });

    } catch (error) {
      console.error('Email sending error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Email Service Error',
        message: 'Failed to send email. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async getEmailServiceStatus(req, res) {
    try {
      const status = emailService.getServiceStatus();
      
      const healthStatus = {
        service: 'email',
        configured: status.configured,
        timestamp: new Date().toISOString(),
        config: {
          host: status.host,
          port: status.port,
          user: status.user,
          from: status.from
        }
      };

      if (status.configured) {
        try {
          await emailService.validateEmailConfig();
          healthStatus.status = 'operational';
          healthStatus.message = 'Email service is working correctly';
        } catch (error) {
          healthStatus.status = 'error';
          healthStatus.message = error.message;
        }
      } else {
        healthStatus.status = 'not_configured';
        healthStatus.message = 'Email service is not configured';
      }

      const httpStatus = healthStatus.status === 'operational' ? 200 : 503;
      res.status(httpStatus).json(healthStatus);

    } catch (error) {
      console.error('Email service status check error:', error.message);
      
      res.status(500).json({
        service: 'email',
        status: 'error',
        message: 'Failed to check email service status',
        timestamp: new Date().toISOString()
      });
    }
  }
};

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000);
}

function getClientIpAddress(req) {
  return req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.headers['x-client-ip'] ||
    '127.0.0.1';
}

module.exports = emailController;