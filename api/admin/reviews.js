const { handleAdminReviews } = require("../../lib/reviews/handlers");
const { createBlobStore } = require("../../lib/reviews/store");

module.exports = function reviewsAdmin(req, res) {
  return handleAdminReviews(req, res, createBlobStore());
};
