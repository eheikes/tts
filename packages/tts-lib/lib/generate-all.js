const async = require('async')
const debug = require('debug')

/**
 * Calls the API for each text part (throttled).
 * The function must be an AsyncFunction (or have a callback).
 * Returns a Promise.
 */
exports.generateAll = async (parts, limit, func) => {
  const count = parts.length
  debug('generateAll')(`Requesting ${count} audio segments, ${limit} at a time`)
  try {
    return async.mapLimit(parts, limit, func)
  } catch (err) {
    debug('generateAll')(`Requested all parts, with error ${err}`)
    throw err
  }
}
