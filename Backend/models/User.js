const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    walletAddress: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    totalTokensPurchased: {
      type: Number,
      default: 0
    },
    totalAmountPaid: {
      type: Number,
      default: 0
    },
    purchases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase'
      }
    ],
    isWhitelisted: {
      type: Boolean,
      default: false
    },
    maxPurchaseAmount: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
customerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password validity
customerSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
