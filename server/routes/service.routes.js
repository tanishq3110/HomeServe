const express = require('express');
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require('../controllers/service.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

/**
 * Public routes
 */
router.get('/', getServices);
router.get('/:id', getServiceById);

/**
 * Admin-protected CRUD routes
 */
router.post('/', protect, authorize('ADMIN'), createService);
router.put('/:id', protect, authorize('ADMIN'), updateService);
router.delete('/:id', protect, authorize('ADMIN'), deleteService);

module.exports = router;

