# Contact Form Client Documentation

## Overview

This document provides comprehensive guidance for implementing the contact form on the Equus Website frontend. The contact form integrates with the backend API to handle form submissions, validation, and email notifications.

## API Endpoint

**Base URL:** `http://localhost:8000` (development)  
**Endpoint:** `POST /api/email/contact`  
**Content-Type:** `application/json`

## Request Specification

### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `name` | string | 2-100 characters | Contact person's full name |
| `email` | string | Valid email format | Contact email address |
| `message` | string | 10-2000 characters | Message content |

### Optional Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `subject` | string | Max 200 characters | Email subject (defaults to "Contact Form Submission") |

### Request Example

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "message": "Hello, I would like to inquire about your AI consulting services. Could you please provide more information about your pricing and timeline?",
  "subject": "AI Consulting Inquiry"
}
```

### JavaScript Fetch Example

```javascript
const submitContactForm = async (formData) => {
  try {
    const response = await fetch('http://localhost:8000/api/email/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Contact form submission failed:', error);
    throw error;
  }
};
```

## Response Specification

### Success Response (200)

```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "contactId": "507f1f77bcf86cd799439011",
  "messageId": "email_message_id_from_nodemailer"
}
```

### Validation Error Response (400)

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Name, email, and message are required fields"
}
```

**Common Validation Errors:**
- Missing required fields
- Invalid email format
- Name too short/long (2-100 characters)
- Message too short/long (10-2000 characters)
- Subject too long (200+ characters)

### Duplicate Submission Error (400)

```json
{
  "success": false,
  "error": "Duplicate Submission",
  "message": "A contact form with this email has already been submitted"
}
```

### Email Service Error (500)

```json
{
  "success": false,
  "error": "Email Service Error",
  "message": "Contact form saved but email failed to send. We will contact you soon.",
  "contactId": "507f1f77bcf86cd799439011"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Server Error",
  "message": "Failed to process contact form. Please try again later.",
  "details": "Additional error details in development mode"
}
```

## Frontend Implementation Guide

### 1. Form Structure

```jsx
const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    subject: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  
  // Implementation continues...
};
```

### 2. Form Validation

**Client-side validation should mirror server-side rules:**

```javascript
const validateForm = (data) => {
  const errors = {};
  
  // Name validation
  if (!data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2 || data.name.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters';
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Message validation
  if (!data.message.trim()) {
    errors.message = 'Message is required';
  } else if (data.message.length < 10 || data.message.length > 2000) {
    errors.message = 'Message must be between 10 and 2000 characters';
  }
  
  // Subject validation (optional)
  if (data.subject && data.subject.length > 200) {
    errors.subject = 'Subject must be less than 200 characters';
  }
  
  return errors;
};
```

### 3. Form Submission Handler

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form
  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  
  setIsSubmitting(true);
  setSubmitStatus(null);
  
  try {
    const response = await fetch('http://localhost:8000/api/email/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      setSubmitStatus({ type: 'success', message: result.message });
      setFormData({ name: '', email: '', message: '', subject: '' });
    } else {
      setSubmitStatus({ type: 'error', message: result.message });
    }
  } catch (error) {
    setSubmitStatus({ 
      type: 'error', 
      message: 'Network error. Please try again.' 
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

### 4. Error Handling Strategies

**Handle different error types appropriately:**

```javascript
const handleApiError = (error, result) => {
  switch (result?.error) {
    case 'Validation Error':
      return 'Please check your form data and try again.';
    case 'Duplicate Submission':
      return 'You have already submitted a contact form. We will get back to you soon.';
    case 'Email Service Error':
      return 'Your message was received but our email service is temporarily unavailable. We will contact you soon.';
    default:
      return 'Something went wrong. Please try again later.';
  }
};
```

## Styling Guidelines

### 1. Form Layout

```css
.contact-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}
```

### 2. Validation States

```css
.form-input.error {
  border-color: #e74c3c;
}

.form-input.success {
  border-color: #27ae60;
}

.error-message {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.success-message {
  color: #27ae60;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

### 3. Button States

```css
.submit-button {
  background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s ease;
  width: 100%;
}

.submit-button:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-button.loading {
  position: relative;
}

.submit-button.loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

## Accessibility Considerations

### 1. Form Labels and ARIA

```jsx
<label htmlFor="name" className="form-label">
  Name *
</label>
<input
  id="name"
  name="name"
  type="text"
  value={formData.name}
  onChange={handleChange}
  aria-describedby={errors.name ? 'name-error' : undefined}
  aria-invalid={errors.name ? 'true' : 'false'}
  className={`form-input ${errors.name ? 'error' : ''}`}
  required
/>
{errors.name && (
  <div id="name-error" className="error-message" role="alert">
    {errors.name}
  </div>
)}
```

### 2. Loading States

```jsx
<button
  type="submit"
  disabled={isSubmitting}
  className={`submit-button ${isSubmitting ? 'loading' : ''}`}
  aria-describedby="submit-status"
>
  {isSubmitting ? 'Sending...' : 'Send Message'}
</button>

{submitStatus && (
  <div
    id="submit-status"
    role="alert"
    className={`status-message ${submitStatus.type}`}
  >
    {submitStatus.message}
  </div>
)}
```

## Testing

### 1. Unit Tests

```javascript
describe('Contact Form Validation', () => {
  test('validates required fields', () => {
    const errors = validateForm({
      name: '',
      email: '',
      message: ''
    });
    
    expect(errors.name).toBe('Name is required');
    expect(errors.email).toBe('Email is required');
    expect(errors.message).toBe('Message is required');
  });
  
  test('validates email format', () => {
    const errors = validateForm({
      name: 'John Doe',
      email: 'invalid-email',
      message: 'Valid message content'
    });
    
    expect(errors.email).toBe('Please enter a valid email address');
  });
});
```

### 2. Integration Tests

```javascript
describe('Contact Form API Integration', () => {
  test('submits form successfully', async () => {
    const mockResponse = {
      success: true,
      message: 'Contact form submitted successfully',
      contactId: '507f1f77bcf86cd799439011'
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });
    
    const result = await submitContactForm({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Test message'
    });
    
    expect(result).toEqual(mockResponse);
  });
});
```

## Performance Considerations

### 1. Debounced Validation

```javascript
import { useCallback } from 'react';
import { debounce } from 'lodash';

const debouncedValidate = useCallback(
  debounce((fieldName, value) => {
    const fieldErrors = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: fieldErrors[fieldName] }));
  }, 300),
  []
);
```

### 2. Form State Management

```javascript
const useFormState = (initialState) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);
  
  return { formData, errors, isSubmitting, handleChange, setErrors, setIsSubmitting };
};
```

## Security Considerations

### 1. Input Sanitization

```javascript
const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 2000); // Limit length
};
```

### 2. Rate Limiting

Implement client-side rate limiting to prevent spam:

```javascript
const useRateLimit = (limit = 1, windowMs = 60000) => {
  const [attempts, setAttempts] = useState([]);
  
  const canSubmit = useCallback(() => {
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    return recentAttempts.length < limit;
  }, [attempts, limit, windowMs]);
  
  const recordAttempt = useCallback(() => {
    setAttempts(prev => [...prev, Date.now()]);
  }, []);
  
  return { canSubmit, recordAttempt };
};
```

## Integration with Existing App

### 1. App.jsx Integration

```jsx
import ContactForm from './components/ContactForm';

function App() {
  return (
    <div className="app">
      {/* existing sections */}
      
      <section className="contact">
        <h3 className="section-title">CONTACT US</h3>
        <ContactForm />
      </section>
      
      {/* footer */}
    </div>
  );
}
```

### 2. Environment Configuration

```javascript
// config/api.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.equus-website.com' 
  : 'http://localhost:8000';

export const API_ENDPOINTS = {
  CONTACT: `${API_BASE_URL}/api/email/contact`,
  EMAIL_STATUS: `${API_BASE_URL}/api/email/status`
};
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for frontend origin
2. **Network Timeouts**: Implement proper timeout handling
3. **Validation Mismatches**: Keep client and server validation in sync
4. **Email Delivery**: Check spam folders and email service configuration

### Debug Mode

```javascript
const DEBUG = process.env.NODE_ENV === 'development';

const debugLog = (message, data) => {
  if (DEBUG) {
    console.log(`[Contact Form] ${message}`, data);
  }
};
```

This documentation provides a complete reference for implementing the contact form on the Equus Website frontend, ensuring consistency with the backend API and following best practices for user experience and security.