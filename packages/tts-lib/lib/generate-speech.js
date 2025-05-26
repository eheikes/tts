const async = require('async')
const debug = require('debug')
const { writeFile } = require('fs/promises')
const tempfile = require('tempfile')

/**
 * Writes down all the temp files for ffmpeg to read in.
 * Returns the text filename.
 */
exports.createManifest = async (parts) => {
  const txtFile = tempfile('.txt')
  debug('createManifest')(`Creating ${txtFile} for manifest`)
  const contents = parts.map(info => {
    return `file '${info.tempfile}'`
  }).join('\n')
  debug('createManifest')(`Writing manifest contents:\n${contents}`)
  await writeFile(txtFile, contents, 'utf8')
  return txtFile
}

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
  task.title = task.title.replace(/\d+\//, `${count}/`)
  return parts
}
