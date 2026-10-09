const mongoose = require('mongoose');

/**
 * Sub-schema for documents submitted by technicians
 */
const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['ID_PROOF', 'ADDRESS_PROOF', 'CERTIFICATE'],
        message: '{VALUE} is not a valid document type',
      },
      required: [true, 'Document type is required'],
    },
    url: {
      type: String,
      required: [true, 'Document URL is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED'],
        message: '{VALUE} is not a valid document status',
      },
      default: 'PENDING',
    },
  },
  { _id: false }
);

/**
 * Technician profile schema
 * One-to-one relationship with User (role === TECHNICIAN)
 */
const technicianSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },

    skills: {
      type: [String],
      default: [],
    },

    experience: {
      type: Number,
      min: [0, 'Experience cannot be negative'],
      default: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    profileImage: {
      type: String,
      trim: true,
      default: '',
    },

    documents: {
      type: [documentSchema],
      default: [],
    },

    verificationStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED'],
        message: '{VALUE} is not a valid verification status',
      },
      default: 'PENDING',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      default: '',
    },

    isAvailable: {
      type: Boolean,
      default: false,
    },

    rating: {
      type: Number,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0,
    },

    totalReviews: {
      type: Number,
      min: [0, 'Total reviews cannot be negative'],
      default: 0,
    },

    // GPS Live Tracking Location (Phase 8)
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
      activeBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
      isSharing: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Clean up object — never expose internal Mongoose fields
 */
technicianSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Technician = mongoose.model('Technician', technicianSchema);

module.exports = Technician;
