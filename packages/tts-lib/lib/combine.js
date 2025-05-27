const debug = require('debug')
const { combineEncodedAudio } = require('./combine-encoded-audio')
const { combineRawAudio } = require('./combine-raw-audio')

/**
 * Combines all the parts into one file.
 * Resolves with the new filename.
 */
exports.combine = async (manifestFile, newFile, format = 'encoded', ffmpegBinary = 'ffmpeg') => {
  debug('combine')(`Combining files into ${newFile}`)
  if (format === 'raw') {
    await combineRawAudio(manifestFile, newFile)
  } else {
    await combineEncodedAudio(ffmpegBinary, manifestFile, newFile)
  }
  return newFile
}
