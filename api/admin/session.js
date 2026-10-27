const { handleSession } = require("../../lib/reviews/handlers");
const { createBlobStore } = require("../../lib/reviews/store");

module.exports = function reviewsSession(req, res) {
  return handleSession(req, res, createBlobStore());
};
