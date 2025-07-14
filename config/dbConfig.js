const mongoose = require('mongoose');

class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.connectionString = this.buildConnectionString();
  }

  buildConnectionString() {
    const { MONGODB_URI } = process.env;

    if (!MONGODB_URI) {
      throw new Error('MongoDB configuration missing. Please provide MONGODB_URI in your .env file');
    }

    return MONGODB_URI;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('📦 Already connected to MongoDB');
        return;
      }

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      };

      await mongoose.connect(this.connectionString, options);
      
      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('📦 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  async checkConnection() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      isConnected: this.isConnected,
      readyState: states[mongoose.connection.readyState],
      database: mongoose.connection.name || 'Not connected',
      host: mongoose.connection.host || 'Not connected'
    };
  }

  async resetDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset database in production environment');
    }

    try {
      await mongoose.connection.db.dropDatabase();
      console.log('🗑️  Database reset successfully');
    } catch (error) {
      console.error('❌ Error resetting database:', error.message);
      throw error;
    }
  }
}

const dbConfig = new DatabaseConfig();

module.exports = dbConfig;