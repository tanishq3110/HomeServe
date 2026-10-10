const Technician = require('../models/technician.model');
const User = require('../models/user.model');

/**
 * Helper: build a safe populated technician response object (admin view)
 */
const buildAdminTechnicianResponse = (technician) => {
  const t = technician.toObject ? technician.toObject() : technician;
  return {
    id: t._id,
    user: t.userId
      ? {
          id: t.userId._id,
          name: t.userId.name,
          email: t.userId.email,
          phone: t.userId.phone,
          profileImage: t.userId.profileImage,
        }
      : null,
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
 * @desc    Get all technician applications with optional filter & search
 * @route   GET /api/admin/technicians
 * @access  Private — ADMIN only
 * @query   status (PENDING | APPROVED | REJECTED), search (name/email)
 */
const getAllTechnicians = async (req, res) => {
  try {
    const { status, search } = req.query;

    // Build filter query
    const filter = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      filter.verificationStatus = status.toUpperCase();
    }

    // If search query provided, find matching user IDs first
    let userIdFilter = null;
    if (search && typeof search === 'string' && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeSearch, 'i');
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id');
      userIdFilter = matchingUsers.map((u) => u._id);
      filter.userId = { $in: userIdFilter };
    }

    const technicians = await Technician.find(filter)
      .populate('userId', 'name email phone profileImage')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: technicians.length,
      data: technicians.map(buildAdminTechnicianResponse),
    });
  } catch (error) {
    console.error('[Admin.getAllTechnicians]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching technician applications.',
    });
  }
};

/**
 * @desc    Get single technician details by technician profile ID
 * @route   GET /api/admin/technicians/:id
 * @access  Private — ADMIN only
 */
const getTechnicianById = async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id).populate(
      'userId',
      'name email phone profileImage'
    );

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: buildAdminTechnicianResponse(technician),
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid technician ID.' });
    }
    console.error('[Admin.getTechnicianById]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching technician details.',
    });
  }
};

/**
 * @desc    Approve a technician application
 * @route   PATCH /api/admin/technicians/:id/approve
 * @access  Private — ADMIN only
 */
const approveTechnician = async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id).populate(
      'userId',
      'name email phone profileImage'
    );

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found.',
      });
    }

    if (technician.verificationStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'This technician application has already been approved.',
      });
    }

    technician.verificationStatus = 'APPROVED';
    technician.isVerified = true;
    technician.rejectionReason = '';
    // Note: isAvailable stays false — technician must manually go ONLINE
    await technician.save();

    return res.status(200).json({
      success: true,
      message: `Technician "${technician.userId?.name || 'Unknown'}" has been approved. They may now go online.`,
      data: buildAdminTechnicianResponse(technician),
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid technician ID.' });
    }
    console.error('[Admin.approveTechnician]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error approving technician.',
    });
  }
};

/**
 * @desc    Reject a technician application
 * @route   PATCH /api/admin/technicians/:id/reject
 * @access  Private — ADMIN only
 */
const rejectTechnician = async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id).populate(
      'userId',
      'name email phone profileImage'
    );

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician profile not found.',
      });
    }

    if (technician.verificationStatus === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'This technician application has already been rejected.',
      });
    }

    const { rejectionReason } = req.body;

    technician.verificationStatus = 'REJECTED';
    technician.isVerified = false;
    technician.isAvailable = false;
    if (rejectionReason && typeof rejectionReason === 'string') {
      technician.rejectionReason = rejectionReason.trim();
    }
    await technician.save();

    return res.status(200).json({
      success: true,
      message: `Technician "${technician.userId?.name || 'Unknown'}" application has been rejected.`,
      data: buildAdminTechnicianResponse(technician),
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid technician ID.' });
    }
    console.error('[Admin.rejectTechnician]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error rejecting technician.',
    });
  }
};

module.exports = {
  getAllTechnicians,
  getTechnicianById,
  approveTechnician,
  rejectTechnician,
};
