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
   ```

## API Endpoints

### Health Check
- `GET /` - API status and health check
- `GET /health` - Health check endpoint

## Project Structure

```
api/
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (create from sample.env)
├── .gitignore         # Git ignore rules
└── folders/
    ├── routes/        # API route definitions
    ├── controllers/   # Request handlers
    ├── middleware/    # Custom middleware
    ├── models/        # Data models
    ├── config/        # Configuration files
    └── utils/         # Utility functions
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

## API Features

- ✅ Express server setup
- ✅ CORS configuration
- ✅ Environment variable support
- ✅ JSON request/response handling
- ✅ Health check endpoints
- ✅ Organized folder structure

## Next Steps

- Add authentication middleware
- Set up database connection
- Create API routes
- Add error handling middleware
- Set up logging
- Add input validation
- Write tests