/**
 * TomTom HTTP Client
 *
 * Shared fetch wrapper that auto-appends the API key,
 * handles errors, and parses JSON responses.
 */

const { TOMTOM_API_KEY } = require("../config/tomtom");

const fetch = globalThis.fetch || require("node-fetch");

/**
 * Make a GET request to a TomTom API endpoint.
 *
 * @param {string} baseUrl  - The full base URL (no query string)
 * @param {Object} [params] - Query parameters (key is auto-added)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function get(baseUrl, params = {}) {
  // Inject API key
  params.key = TOMTOM_API_KEY;

  const query = new URLSearchParams(params).toString();
  const url = `${baseUrl}?${query}`;

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(
      `TomTom API error ${response.status}: ${body}`
    );
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Fetch raw bytes (for tile proxy endpoints).
 *
 * @param {string} url      - Full tile URL (with path params already filled)
 * @param {Object} [params] - Additional query parameters (key is auto-added)
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function getRaw(url, params = {}) {
  params.key = TOMTOM_API_KEY;

  const query = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${query}`;

  const response = await fetch(fullUrl);

  if (!response.ok) {
    const err = new Error(`TomTom tile error ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type");

  return { buffer, contentType };
}

module.exports = { get, getRaw };
