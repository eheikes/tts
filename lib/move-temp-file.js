const debug = require('debug')('moveTempFile')
const fs = require('fs-extra')

/**
 * Moves the temporary file to the final destination.
 */
exports.moveTempFile = (ctx, task) => {
  const tempFile = ctx.tempFile
  const outputFilename = ctx.outputFilename
  debug(`copying ${tempFile} to ${outputFilename}`)
  return new Promise((resolve, reject) => {
    fs.move(tempFile, outputFilename, { overwrite: true }, (err) => {
      if (err) { return reject(err) }
      task.title = `Done. Saved to ${outputFilename}`
      resolve()
    })
  })
}
