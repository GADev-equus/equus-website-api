# Equus Website API

Node.js/Express backend API for the Equus website.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

The server will run on **port 8000** by default.

## Environment Setup

1. Copy `sample.env` to `.env`:
   ```bash
   cp sample.env .env
   ```

2. Update the `.env` file with your configuration:
   ```
   PORT=8000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/equus-website
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@equus-website.com
   ```

## API Endpoints

### Health Check
- `GET /` - API status and health check
- `GET /health` - Health check endpoint (includes database status)

### Email Service
- `POST /api/email/contact` - Contact form submission with database storage
- `POST /api/email/send` - Generic email sending
- `GET /api/email/status` - Email service health check

See [docs/email_service.md](docs/email_service.md) for detailed email service documentation.

## Project Structure

```
api/
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (create from sample.env)
├── .gitignore         # Git ignore rules
├── config/
│   └── dbConfig.js    # MongoDB connection configuration
├── controllers/
│   └── emailController.js # Email and contact form handlers
├── docs/
│   └── email_service.md # Email service documentation
├── middleware/
│   └── errorHandler.js # Error handling middleware
├── models/
│   └── Contact.js     # Contact form database model
├── routes/
│   └── emailRoutes.js # Email service routes
└── utils/
    └── emailService.js # Email service utility
```

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (setup required)

### Dependencies
- **express** - Web framework
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **nodemon** - Development server with auto-restart
- **mongoose** - MongoDB object modeling
- **nodemailer** - Email sending service

## API Features

- ✅ Express server setup
- ✅ CORS configuration
- ✅ Environment variable support
- ✅ JSON request/response handling
- ✅ Health check endpoints (with database status)
- ✅ MongoDB integration with Mongoose
- ✅ Email service with Nodemailer
- ✅ Contact form with database storage
- ✅ IP address tracking and email validation
- ✅ Error handling middleware
- ✅ Organized folder structure with documentation

## Implemented Features

- ✅ Database connection (MongoDB)
- ✅ Email service (Nodemailer)
- ✅ Contact form with database storage
- ✅ Error handling middleware
- ✅ Input validation
- ✅ IP address tracking

## Next Steps

- Add authentication middleware
- Set up logging
- Write tests
- Add rate limiting
- Implement user management