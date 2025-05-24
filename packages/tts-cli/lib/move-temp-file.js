const debug = require('debug')('moveTempFile')
const { rename } = require('fs/promises')

/**
 * Moves the temporary file to the final destination.
 */
exports.moveTempFile = async (ctx, task) => {
  const tempFile = ctx.tempFile
  const outputFilename = ctx.outputFilename
  debug(`copying ${tempFile} to ${outputFilename}`)
  await rename(tempFile, outputFilename)
  task.title = `Done. Saved to ${outputFilename}`
}
