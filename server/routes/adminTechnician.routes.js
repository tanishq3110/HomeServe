const express = require('express');
const router = express.Router();
const {
  getAllTechnicians,
  getTechnicianById,
  approveTechnician,
  rejectTechnician,
} = require('../controllers/adminTechnician.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateObjectIdParams } = require('../middleware/security.middleware');

// All routes require authentication and ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

/**
 * GET /api/admin/technicians
 * List all technician applications.
 * @query status  (PENDING | APPROVED | REJECTED)
 * @query search  (name or email substring)
 */
router.get('/technicians', getAllTechnicians);

/**
 * GET /api/admin/technicians/:id
 * Full details of a single technician profile.
 */
router.get('/technicians/:id', validateObjectIdParams('id'), getTechnicianById);

/**
 * PATCH /api/admin/technicians/:id/approve
 * Approve a technician application.
 */
router.patch('/technicians/:id/approve', validateObjectIdParams('id'), approveTechnician);

/**
 * PATCH /api/admin/technicians/:id/reject
 * Reject a technician application.
 * @body rejectionReason (optional string)
 */
router.patch('/technicians/:id/reject', validateObjectIdParams('id'), rejectTechnician);

module.exports = router;
