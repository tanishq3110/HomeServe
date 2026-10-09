const mongoose = require('mongoose');

const pricingTierSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Service slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Service category is required'],
      trim: true,
      index: true,
    },
    tagline: {
      type: String,
      default: '',
      trim: true,
    },
    shortDesc: {
      type: String,
      default: '',
      trim: true,
    },
    fullDesc: {
      type: String,
      default: '',
      trim: true,
    },
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [0, 'Starting price cannot be negative'],
    },
    duration: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    iconName: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    whatsIncluded: {
      type: [String],
      default: [],
    },
    whyChooseUs: {
      type: [String],
      default: [],
    },
    pricingTiers: {
      basic: { type: pricingTierSchema, default: () => ({}) },
      standard: { type: pricingTierSchema, default: () => ({}) },
      premium: { type: pricingTierSchema, default: () => ({}) },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful text indexes for search performance
serviceSchema.index({ name: 'text', tagline: 'text', shortDesc: 'text', category: 'text' });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;

