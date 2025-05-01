const async = require('async')
const debug = require('debug')
const fs = require('fs-extra')
const tempfile = require('tempfile')

/**
 * Writes down all the temp files for ffmpeg to read in.
 * Returns the text filename.
 */
exports.createManifest = parts => {
  const txtFile = tempfile('.txt')
  debug('createManifest')(`Creating ${txtFile} for manifest`)
  const contents = parts.map(info => {
    return `file '${info.tempfile}'`
  }).join('\n')
  debug('createManifest')(`Writing manifest contents:\n${contents}`)
  fs.writeFileSync(txtFile, contents, 'utf8')
  return txtFile
}

/**
 * Calls the API for each text part (throttled). Returns a Promise.
 */
exports.generateAll = (parts, limit, func, task) => {
  const count = parts.length
  task.title = `Convert to audio (0/${count})`
  return (new Promise((resolve, reject) => {
    debug('generateAll')(`Requesting ${count} audio segments, ${limit} at a time`)
    async.eachOfLimit(
      parts,
      limit,
      func,
      err => {
        debug('generateAll')(`Requested all parts, with error ${err}`)
        if (err) {
          return reject(err)
        }
        task.title = task.title.replace(/\d+\//, `${count}/`)
        resolve(parts)
      }
    )
  }))
}
