/* Private Vercel Blob. Pending reviews are not public files.
   Connect a private store (BLOB_STORE_ID, read with Vercel OIDC) or set
   BLOB_READ_WRITE_TOKEN. Do not use a public store. */

const { get, put, BlobPreconditionFailedError } = require("@vercel/blob");
const { emptyState, normalizeState } = require("./logic");

const PATHNAME = "reviews/state.json";

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function isConflict(error) {
  if (!error) return false;
  if (error instanceof BlobPreconditionFailedError) return true;
  if (error.code === "CONFLICT") return true;
  return /precondition failed|already exists/i.test(String(error.message || ""));
}

async function readBody(result) {
  if (!result || result.statusCode !== 200 || !result.stream) {
    const error = new Error("Reviews store could not be read");
    error.code = "READ";
    throw error;
  }
  const text = await new Response(result.stream).text();
  if (!text) return emptyState();
  return normalizeState(JSON.parse(text));
}

function createBlobStore() {
  if (!blobConfigured()) return null;
  return {
    async load() {
      const result = await get(PATHNAME, { access: "private", useCache: false });
      if (!result) return { state: emptyState(), etag: null };
      const state = await readBody(result);
      return { state, etag: result.blob && result.blob.etag ? result.blob.etag : null };
    },
    async save(state, etag) {
      const options = {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: Boolean(etag),
        contentType: "application/json",
        cacheControlMaxAge: 60,
      };
      if (etag) options.ifMatch = etag;
      try {
        await put(PATHNAME, JSON.stringify(state), options);
      } catch (error) {
        if (isConflict(error)) {
          const conflict = new Error("Reviews store changed while saving");
          conflict.code = "CONFLICT";
          throw conflict;
        }
        throw error;
      }
    },
  };
}

module.exports = {
  PATHNAME,
  blobConfigured,
  createBlobStore,
  isConflict,
};
