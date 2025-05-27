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
