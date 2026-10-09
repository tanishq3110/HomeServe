const Technician = require('../models/technician.model');

/**
 * Helper: build a safe populated technician response object
 */
const buildTechnicianResponse = (technician) => {
  const t = technician.toObject ? technician.toObject() : technician;
  return {
    id: t._id,
    userId: t.userId?._id || t.userId,
    user: t.userId && typeof t.userId === 'object'
      ? {
          id: t.userId._id,
          name: t.userId.name,
          email: t.userId.email,
          phone: t.userId.phone,
          profileImage: t.userId.profileImage,
        }
      : undefined,
    skills: t.skills,
    experience: t.experience,
    description: t.description,
    profileImage: t.profileImage,
    documents: t.documents,
    verificationStatus: t.verificationStatus,
    isVerified: t.isVerified,
    rejectionReason: t.rejectionReason,
    isAvailable: t.isAvailable,
    rating: t.rating,
    totalReviews: t.totalReviews,
    currentLocation: t.currentLocation,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
};

/**
 * @desc    Get own technician profile
 * @route   GET /api/technicians/me
 * @access  Private — TECHNICIAN only
 */
const getMyProfile = async (req, res) => {
  try {
    const technician = await Technician.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone profileImage'
    );

    if (!technician) {
      return res.status(404).json({
        success: false,
        profileExists: false,
        message: 'Technician profile has not been set up yet. Please complete your onboarding.',
      });
    }

    return res.status(200).json({
      success: true,
      profileExists: true,
      data: buildTechnicianResponse(technician),
    });
  } catch (error) {
    console.error('[Technician.getMyProfile]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching technician profile.',
    });
  }
};

/**
 * @desc    Create technician profile (onboarding)
 * @route   POST /api/technicians/profile
 * @access  Private — TECHNICIAN only
 */
const createProfile = async (req, res) => {
  try {
    // Prevent duplicate profile
    const existing = await Technician.findOne({ userId: req.user._id });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Technician profile already exists. Use PUT /api/technicians/profile to update it.',
      });
    }

    const { skills, experience, description, profileImage, documents } = req.body;

    // Validate documents if provided
    if (documents && !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        message: 'Documents must be an array.',
      });
    }

    const technician = await Technician.create({
      userId: req.user._id,
      skills: Array.isArray(skills) ? skills.map((s) => s.trim()).filter(Boolean) : [],
      experience: experience !== undefined ? Number(experience) : 0,
      description: description ? String(description).trim() : '',
      profileImage: profileImage ? String(profileImage).trim() : '',
      documents: documents || [],
    });

    const populated = await Technician.findById(technician._id).populate(
      'userId',
      'name email phone profileImage'
    );

    return res.status(201).json({
      success: true,
      message: 'Technician profile created successfully. Your application is under review.',
      data: buildTechnicianResponse(populated),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('[Technician.createProfile]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error creating technician profile.',
    });
  }
};

/**
 * @desc    Update own technician profile
 * @route   PUT /api/technicians/profile
 * @access  Private — TECHNICIAN only
 */
const updateProfile = async (req, res) => {
  try {
    const technician = await Technician.findOne({ userId: req.user._id });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found. Please create a profile first.',
      });
    }

    const { skills, experience, description, profileImage, documents } = req.body;

    // Apply updates only for fields provided
    if (skills !== undefined) {
      technician.skills = Array.isArray(skills)
        ? skills.map((s) => s.trim()).filter(Boolean)
        : technician.skills;
    }
    if (experience !== undefined) {
      technician.experience = Number(experience);
    }
    if (description !== undefined) {
      technician.description = String(description).trim();
    }
    if (profileImage !== undefined) {
      technician.profileImage = String(profileImage).trim();
    }
    if (documents !== undefined) {
      if (!Array.isArray(documents)) {
        return res.status(400).json({ success: false, message: 'Documents must be an array.' });
      }
      technician.documents = documents;
    }

    await technician.save();

    const populated = await Technician.findById(technician._id).populate(
      'userId',
      'name email phone profileImage'
    );

    return res.status(200).json({
      success: true,
      message: 'Technician profile updated successfully.',
      data: buildTechnicianResponse(populated),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('[Technician.updateProfile]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating technician profile.',
    });
  }
};

/**
 * @desc    Toggle technician availability (ONLINE / OFFLINE)
 * @route   PATCH /api/technicians/availability
 * @access  Private — TECHNICIAN only (must be APPROVED to go ONLINE)
 */
const toggleAvailability = async (req, res) => {
  try {
    const technician = await Technician.findOne({ userId: req.user._id });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found. Please complete your onboarding first.',
      });
    }

    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean value (true or false).',
      });
    }

    // Only APPROVED technicians can go ONLINE
    if (isAvailable === true && !technician.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          'Your account must be approved by an administrator before you can go online. Current status: ' +
          technician.verificationStatus,
      });
    }

    technician.isAvailable = isAvailable;
    await technician.save();

    return res.status(200).json({
      success: true,
      message: `You are now ${isAvailable ? 'ONLINE' : 'OFFLINE'}.`,
      data: {
        isAvailable: technician.isAvailable,
        verificationStatus: technician.verificationStatus,
      },
    });
  } catch (error) {
    console.error('[Technician.toggleAvailability]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating availability.',
    });
  }
};

module.exports = {
  getMyProfile,
  createProfile,
  updateProfile,
  toggleAvailability,
};
