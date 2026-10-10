const mongoose = require('mongoose');
const Service = require('../models/service.model');

/**
 * @desc    Get all active services with search & category filters
 * @route   GET /api/services
 * @access  Public
 */
const getServices = async (req, res) => {
  try {
    const { search, category } = req.query;

    // Public query always restricts to active services
    const query = { isActive: true };

    // Category filter
    if (category && typeof category === 'string' && category.trim() !== '' && category.toLowerCase() !== 'all') {
      const safeCat = category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.category = { $regex: new RegExp(`^${safeCat}$`, 'i') };
    }

    // Keyword search filter (across name, category, tagline, shortDesc)
    if (search && typeof search === 'string' && search.trim() !== '') {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeSearch, 'i');
      query.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { tagline: searchRegex },
        { shortDesc: searchRegex },
      ];
    }

    const services = await Service.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error('[GetServices Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve services.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single service by slug or ObjectId
 * @route   GET /api/services/:id
 * @access  Public
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service identifier is required.',
      });
    }

    const identifier = id.trim().toLowerCase();
    let service = null;

    // Check if valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      service = await Service.findOne({
        $or: [{ _id: id }, { slug: identifier }],
        isActive: true,
      });
    } else {
      service = await Service.findOne({
        slug: identifier,
        isActive: true,
      });
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service '${id}' not found or is currently unavailable.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('[GetServiceById Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve service details.',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new service (Admin only)
 * @route   POST /api/services
 * @access  Private/Admin
 */
const createService = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      tagline,
      shortDesc,
      fullDesc,
      startingPrice,
      duration,
      rating,
      reviewCount,
      iconName,
      image,
      whatsIncluded,
      whyChooseUs,
      pricingTiers,
      isActive,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required.',
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service category is required.',
      });
    }

    if (startingPrice === undefined || startingPrice === null || startingPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid starting price is required.',
      });
    }

    // Auto-generate slug if omitted
    const generatedSlug = slug
      ? slug.trim().toLowerCase()
      : name.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    // Check duplicate slug
    const existing = await Service.findOne({ slug: generatedSlug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A service with slug '${generatedSlug}' already exists.`,
      });
    }

    const service = await Service.create({
      name: name.trim(),
      slug: generatedSlug,
      category: category.trim(),
      tagline: tagline || '',
      shortDesc: shortDesc || '',
      fullDesc: fullDesc || '',
      startingPrice: Number(startingPrice),
      duration: duration || '',
      rating: rating ? Number(rating) : 0,
      reviewCount: reviewCount ? Number(reviewCount) : 0,
      iconName: iconName || '',
      image: image || '',
      whatsIncluded: Array.isArray(whatsIncluded) ? whatsIncluded : [],
      whyChooseUs: Array.isArray(whyChooseUs) ? whyChooseUs : [],
      pricingTiers: pricingTiers || {},
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: service,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    console.error('[CreateService Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create service.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update a service (Admin only)
 * @route   PUT /api/services/:id
 * @access  Private/Admin
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const identifier = id.trim().toLowerCase();

    let query = { slug: identifier };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { slug: identifier }] };
    }

    const service = await Service.findOne(query);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service '${id}' not found.`,
      });
    }

    if (req.body.startingPrice !== undefined) {
      const price = Number(req.body.startingPrice);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Starting price must be a non-negative number.',
        });
      }
    }

    // Apply updates
    const updateFields = [
      'name',
      'category',
      'tagline',
      'shortDesc',
      'fullDesc',
      'startingPrice',
      'duration',
      'rating',
      'reviewCount',
      'iconName',
      'image',
      'whatsIncluded',
      'whyChooseUs',
      'pricingTiers',
      'isActive',
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    if (req.body.slug && req.body.slug.trim().toLowerCase() !== service.slug) {
      const newSlug = req.body.slug.trim().toLowerCase();
      const existingSlug = await Service.findOne({ slug: newSlug });
      if (existingSlug && existingSlug._id.toString() !== service._id.toString()) {
        return res.status(409).json({
          success: false,
          message: `Slug '${newSlug}' is already taken.`,
        });
      }
      service.slug = newSlug;
    }

    await service.save();

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: service,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    console.error('[UpdateService Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update service.',
      error: error.message,
    });
  }
};

/**
 * @desc    Soft delete / deactivate a service (Admin only)
 * @route   DELETE /api/services/:id
 * @access  Private/Admin
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const identifier = id.trim().toLowerCase();

    let query = { slug: identifier };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { slug: identifier }] };
    }

    const service = await Service.findOne(query);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service '${id}' not found.`,
      });
    }

    // Soft delete by setting isActive to false
    service.isActive = false;
    await service.save();

    return res.status(200).json({
      success: true,
      message: `Service '${service.name}' deactivated successfully (soft delete).`,
      data: service,
    });
  } catch (error) {
    console.error('[DeleteService Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate service.',
      error: error.message,
    });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};

