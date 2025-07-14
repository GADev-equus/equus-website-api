const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minLength: [2, 'Name must be at least 2 characters long'],
    maxLength: [100, 'Name must not exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    },
    index: true
  },
  subject: {
    type: String,
    trim: true,
    maxLength: [200, 'Subject must not exceed 200 characters'],
    default: 'Contact Form Submission'
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minLength: [10, 'Message must be at least 10 characters long'],
    maxLength: [2000, 'Message must not exceed 2000 characters']
  },
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === '127.0.0.1';
      },
      message: 'Invalid IP address format'
    }
  },
  userAgent: {
    type: String,
    trim: true,
    maxLength: [500, 'User agent must not exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'read', 'replied', 'archived'],
    default: 'pending'
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailMessageId: {
    type: String,
    trim: true
  },
  metadata: {
    submittedAt: {
      type: Date,
      default: Date.now
    },
    readAt: {
      type: Date
    },
    repliedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

contactSchema.index({ email: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1 });

contactSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.metadata.readAt = new Date();
  return this.save();
};

contactSchema.methods.markAsReplied = function() {
  this.status = 'replied';
  this.metadata.repliedAt = new Date();
  return this.save();
};

contactSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

contactSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

contactSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

contactSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

contactSchema.pre('save', function(next) {
  if (this.isNew) {
    this.metadata.submittedAt = new Date();
  }
  next();
});

contactSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('A contact form submission with this email already exists'));
  } else {
    next(error);
  }
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;