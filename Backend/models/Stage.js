const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema(
  {
    stageId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 0
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    pricePerToken: {
      type: Number,
      required: true,
      min: 0
    },
    supply: {
      type: Number,
      required: true,
      min: 0
    },
    sold: {
      type: Number,
      default: 0,
      min: 0
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return v > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    strict: true,
    collection: 'stages'
  }
);

stageSchema.index({ stageId: 1, isActive: 1 });

const Stage = mongoose.models.Stage || mongoose.model('Stage', stageSchema);

module.exports = Stage;
