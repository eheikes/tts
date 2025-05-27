const async = require('async')
const debug = require('debug')

/**
 * Calls the API for each text part (throttled). Returns a Promise.
 */
exports.generateAll = async (parts, limit, func, task) => {
  const count = parts.length
  task.title = `Convert to audio (0/${count})`
  debug('generateAll')(`Requesting ${count} audio segments, ${limit} at a time`)
  try {
    await async.eachOfLimit(parts, limit, func)
  } catch (err) {
    debug('generateAll')(`Requested all parts, with error ${err}`)
    throw err
  }
  /* istanbul ignore else: not a real-life scenario */
  if (task.title.length < 1000) { // prevent regexp DoS
    task.title = task.title.replace(/\d+\//, `${count}/`)
  }
  return parts
}
