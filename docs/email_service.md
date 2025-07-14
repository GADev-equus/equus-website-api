# Email Service Documentation

## Overview

The email service provides a centralized, reusable solution for sending emails across the Equus Website API. Built with Nodemailer, it supports multiple email types and endpoints while maintaining consistent configuration and error handling.

## Architecture

### Service Structure
```
api/
├── utils/emailService.js        # Core email service
├── controllers/emailController.js # Email request handlers
├── routes/emailRoutes.js        # Email endpoints
├── middleware/errorHandler.js   # Error handling
└── docs/email_service.md        # This documentation
```

## Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@equus-website.com

# Email Service Settings
EMAIL_TIMEOUT=10000
EMAIL_RETRY_ATTEMPTS=3
```

## Installation

```bash
npm install nodemailer
```

## Core Email Service (`utils/emailService.js`)

### Features
- SMTP transporter configuration
- HTML and plain text email support
- Error handling and logging
- Email template support
- Retry mechanism for failed sends

### Methods

#### `sendEmail(options)`
Main email sending function.

**Parameters:**
- `to` (string|array): Recipient email address(es)
- `subject` (string): Email subject
- `text` (string): Plain text content
- `html` (string): HTML content
- `from` (string, optional): Sender email (defaults to EMAIL_FROM)
- `attachments` (array, optional): File attachments

**Returns:** Promise resolving to email result

#### `validateEmailConfig()`
Validates email configuration and SMTP connection.

**Returns:** Promise resolving to validation result

## Email Controller (`controllers/emailController.js`)

### Endpoints

#### `POST /api/email/send`
Send a single email.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>",
  "from": "sender@example.com" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "email-message-id"
}
```

#### `POST /api/email/send-bulk`
Send emails to multiple recipients.

**Request Body:**
```json
{
  "recipients": ["user1@example.com", "user2@example.com"],
  "subject": "Bulk Email Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>"
}
```

## Usage Examples

### Basic Email
```javascript
const emailService = require('../utils/emailService');

const emailOptions = {
  to: 'user@example.com',
  subject: 'Welcome to Equus Website',
  text: 'Welcome to our platform!',
  html: '<h1>Welcome to our platform!</h1>'
};

await emailService.sendEmail(emailOptions);
```

### Contact Form Email
```javascript
const contactEmail = {
  to: 'admin@equus-website.com',
  subject: 'New Contact Form Submission',
  html: `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong> ${message}</p>
  `
};

await emailService.sendEmail(contactEmail);
```

### Password Reset Email
```javascript
const resetEmail = {
  to: user.email,
  subject: 'Password Reset Request',
  html: `
    <h2>Password Reset</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetLink}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
  `
};

await emailService.sendEmail(resetEmail);
```

## Error Handling

The service includes comprehensive error handling:

### Error Types
- **Configuration Errors**: Invalid SMTP settings
- **Network Errors**: Connection failures
- **Authentication Errors**: Invalid credentials
- **Validation Errors**: Missing required fields
- **Rate Limiting**: Too many requests

### Error Response Format
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Technical error details"
}
```

## Security Considerations

1. **Environment Variables**: Store sensitive data in `.env` file
2. **Input Validation**: Sanitize all email inputs
3. **Rate Limiting**: Implement rate limiting for email endpoints
4. **Authentication**: Secure email endpoints with authentication
5. **Logging**: Log email activities without exposing sensitive data

## Testing

### Test Configuration
Use a test SMTP service like Ethereal Email for development:

```env
# Test Environment
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=test@ethereal.email
EMAIL_PASS=test-password
```

### Test Endpoints
```bash
# Test basic email sending
curl -X POST http://localhost:8000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email"
  }'
```

## Monitoring and Logging

### Email Service Logs
- Successful sends
- Failed attempts
- Configuration errors
- Performance metrics

### Health Check
Include email service status in health checks:

```javascript
// GET /health
{
  "status": "healthy",
  "services": {
    "email": {
      "status": "operational",
      "lastCheck": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Common Use Cases

1. **Contact Form Submissions**
2. **User Registration Confirmations**
3. **Password Reset Requests**
4. **Newsletter Subscriptions**
5. **Order Confirmations**
6. **System Notifications**

## Future Enhancements

- Email templates system
- Queue system for bulk emails
- Email tracking and analytics
- Webhook support for email events
- Multiple SMTP provider support
- Email scheduling functionality

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Check EMAIL_USER and EMAIL_PASS
2. **Connection Timeout**: Verify EMAIL_HOST and EMAIL_PORT
3. **Emails Not Delivered**: Check spam folders, verify recipient addresses
4. **Rate Limiting**: Implement delays between bulk emails

### Debug Mode
Enable debug logging by setting:
```env
EMAIL_DEBUG=true
```

## Support

For issues related to the email service, check:
1. SMTP provider documentation
2. Nodemailer documentation
3. Server logs for detailed error messages
4. Network connectivity to SMTP server