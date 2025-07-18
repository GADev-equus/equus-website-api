class EmailTemplates {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.emailVerificationUrl = process.env.EMAIL_VERIFICATION_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    this.passwordResetUrl = process.env.PASSWORD_RESET_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    this.brandName = 'Equus Website';
    this.supportEmail = process.env.EMAIL_FROM || 'support@equus-website.com';
  }

  // Common email styles
  getCommonStyles() {
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
        }
        .content {
          padding: 0 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .button.success {
          background-color: #28a745;
        }
        .button.success:hover {
          background-color: #1e7e34;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
          font-size: 12px;
          color: #6c757d;
          text-align: center;
        }
        .warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .info {
          background-color: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
      </style>
    `;
  }

  // Email header
  getEmailHeader() {
    return `
      <div class="header">
        <div class="logo">${this.brandName}</div>
      </div>
    `;
  }

  // Email footer
  getEmailFooter() {
    return `
      <div class="footer">
        <p>This email was sent from ${this.brandName}</p>
        <p>If you have any questions, please contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
        <p>&copy; ${new Date().getFullYear()} ${this.brandName}. All rights reserved.</p>
      </div>
    `;
  }

  // Welcome email template
  welcomeEmailTemplate(user) {
    return {
      subject: `Welcome to ${this.brandName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${this.brandName}</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getEmailHeader()}
          <div class="content">
            <h2>Welcome to ${this.brandName}!</h2>
            <p>Hello ${user.firstName},</p>
            <p>Thank you for joining ${this.brandName}! We're excited to have you as part of our community.</p>
            <p>Your account has been successfully created with the email address: <strong>${user.email}</strong></p>
            <p>To get started, you can:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore our features</li>
              <li>Connect with other users</li>
            </ul>
            <p>If you have any questions, don't hesitate to reach out to our support team.</p>
            <p>Best regards,<br>The ${this.brandName} Team</p>
          </div>
          ${this.getEmailFooter()}
        </body>
        </html>
      `
    };
  }

  // Email verification template
  emailVerificationTemplate(user, verificationToken) {
    const verificationLink = `${this.emailVerificationUrl}?token=${verificationToken}`;
    
    return {
      subject: `Verify Your Email - ${this.brandName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getEmailHeader()}
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${user.firstName},</p>
            <p>Thank you for signing up for ${this.brandName}! To complete your registration, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button success">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${verificationLink}</p>
            <div class="info">
              <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
            </div>
            <p>If you didn't create an account with ${this.brandName}, please ignore this email.</p>
            <p>Best regards,<br>The ${this.brandName} Team</p>
          </div>
          ${this.getEmailFooter()}
        </body>
        </html>
      `
    };
  }

  // Password reset template
  passwordResetTemplate(user, resetToken) {
    const resetLink = `${this.passwordResetUrl}?token=${resetToken}`;
    
    return {
      subject: `Password Reset Request - ${this.brandName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getEmailHeader()}
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.firstName},</p>
            <p>You recently requested to reset your password for your ${this.brandName} account. Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
            <div class="warning">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.</p>
            <p>For security reasons, this link can only be used once and will expire after use.</p>
            <p>Best regards,<br>The ${this.brandName} Team</p>
          </div>
          ${this.getEmailFooter()}
        </body>
        </html>
      `
    };
  }

  // Password reset success template
  passwordResetSuccessTemplate(user) {
    return {
      subject: `Password Successfully Reset - ${this.brandName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getEmailHeader()}
          <div class="content">
            <h2>Password Successfully Reset</h2>
            <p>Hello ${user.firstName},</p>
            <p>Your password has been successfully reset for your ${this.brandName} account.</p>
            <div class="info">
              <strong>Account Security:</strong> Your account is now secured with your new password.
            </div>
            <p>If you did not perform this action, please contact our support team immediately.</p>
            <p>For your security, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Regularly updating your password</li>
            </ul>
            <p>Best regards,<br>The ${this.brandName} Team</p>
          </div>
          ${this.getEmailFooter()}
        </body>
        </html>
      `
    };
  }

  // Account locked template
  accountLockedTemplate(user, lockDuration) {
    return {
      subject: `Account Temporarily Locked - ${this.brandName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Temporarily Locked</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getEmailHeader()}
          <div class="content">
            <h2>Account Temporarily Locked</h2>
            <p>Hello ${user.firstName},</p>
            <p>Your ${this.brandName} account has been temporarily locked due to multiple failed login attempts.</p>
            <div class="warning">
              <strong>Security Notice:</strong> Your account will be automatically unlocked in ${lockDuration} minutes.
            </div>
            <p>If you believe this was not you, please:</p>
            <ul>
              <li>Reset your password immediately</li>
              <li>Contact our support team</li>
              <li>Review your account activity</li>
            </ul>
            <p>For your security, we recommend using a strong, unique password.</p>
            <p>Best regards,<br>The ${this.brandName} Team</p>
          </div>
          ${this.getEmailFooter()}
        </body>
        </html>
      `
    };
  }

  // Security alert template
  securityAlertTemplate(user, activity) {
    return {
      subject: `Security Alert - ${this.brandName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert</title>
          ${this.getCommonStyles()}
        </head>
        <body>
          ${this.getEmailHeader()}
          <div class="content">
            <h2>Security Alert</h2>
            <p>Hello ${user.firstName},</p>
            <p>We detected the following security-related activity on your ${this.brandName} account:</p>
            <div class="warning">
              <strong>Activity:</strong> ${activity.type}<br>
              <strong>Date:</strong> ${activity.date}<br>
              <strong>IP Address:</strong> ${activity.ipAddress}<br>
              <strong>Location:</strong> ${activity.location || 'Unknown'}
            </div>
            <p>If this was you, no further action is required. If you don't recognize this activity, please:</p>
            <ul>
              <li>Reset your password immediately</li>
              <li>Review your account settings</li>
              <li>Contact our support team</li>
            </ul>
            <p>Best regards,<br>The ${this.brandName} Team</p>
          </div>
          ${this.getEmailFooter()}
        </body>
        </html>
      `
    };
  }

  // Plain text fallback for email verification
  emailVerificationTextTemplate(user, verificationToken) {
    const verificationLink = `${this.emailVerificationUrl}?token=${verificationToken}`;
    
    return {
      subject: `Verify Your Email - ${this.brandName}`,
      text: `
Hello ${user.firstName},

Thank you for signing up for ${this.brandName}! To complete your registration, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with ${this.brandName}, please ignore this email.

Best regards,
The ${this.brandName} Team

---
This email was sent from ${this.brandName}
If you have any questions, please contact us at ${this.supportEmail}
      `
    };
  }

  // Plain text fallback for password reset
  passwordResetTextTemplate(user, resetToken) {
    const resetLink = `${this.passwordResetUrl}?token=${resetToken}`;
    
    return {
      subject: `Password Reset Request - ${this.brandName}`,
      text: `
Hello ${user.firstName},

You recently requested to reset your password for your ${this.brandName} account. Click the link below to reset your password:

${resetLink}

This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.

Best regards,
The ${this.brandName} Team

---
This email was sent from ${this.brandName}
If you have any questions, please contact us at ${this.supportEmail}
      `
    };
  }
}

// Export singleton instance
module.exports = new EmailTemplates();