const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyPrefix: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    default: 'Default API Key'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    trim: true,
    default: ''
  },
  environment: {
    type: String,
    enum: ['dev', 'staging', 'prod'],
    default: 'dev'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  rateLimit: {
    limit: {
      type: Number,
      default: 100
    },
    windowMs: {
      type: Number,
      default: 60000
    }
  },
  ipWhitelist: {
    type: [String],
    default: []
  },
  ipBlacklist: {
    type: [String],
    default: []
  }
}, { timestamps: true });

// Hashes are needed internally for authentication but are never serialized.
ApiKeySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.keyHash;
    delete ret.keyPrefix;
    return ret;
  }
});

module.exports = mongoose.model('ApiKey', ApiKeySchema);
