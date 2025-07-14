const emailService = require('../utils/emailService');

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

      const result = await emailService.sendContactFormEmail({
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        message: sanitizeInput(message),
        subject: subject ? sanitizeInput(subject) : undefined
      });

      res.status(200).json({
        success: true,
        message: 'Contact form submitted successfully',
        messageId: result.messageId
      });

    } catch (error) {
      console.error('Contact form submission error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Email Service Error',
        message: 'Failed to send contact form. Please try again later.',
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

module.exports = emailController;