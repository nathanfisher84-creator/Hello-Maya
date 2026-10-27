const { handleReviews } = require("../lib/reviews/handlers");
const { createBlobStore } = require("../lib/reviews/store");

module.exports = function reviews(req, res) {
  return handleReviews(req, res, createBlobStore());
};
