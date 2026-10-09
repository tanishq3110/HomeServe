const { protect, authorize } = require('./auth.middleware');

module.exports = {
  protect,
  authorize,
};
