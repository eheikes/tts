const spawn = require('child_process').spawn
const debug = require('debug')

/**
 * Combines MP3 or OGG files into one file.
 */
exports.combineEncodedAudio = (binary, manifestFile, outputFile) => {
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', manifestFile,
    '-c', 'copy',
    outputFile
  ]
  return new Promise((resolve, reject) => {
    debug('combineEncodedAudio')(`Running ${binary} ${args.join(' ')}`)
    const ffmpeg = spawn(binary, args)
    let stderr = ''
    ffmpeg.stderr.on('data', (data) => {
      stderr += `\n${data}`
    })
    ffmpeg.on('error', () => {
      reject(new Error('Could not start ffmpeg process'))
    })
    ffmpeg.on('close', code => {
      debug('combineEncodedAudio')(stderr)
      debug('combineEncodedAudio')(`ffmpeg process completed with code ${code}`)
      if (code > 0) {
        return reject(new Error(`ffmpeg returned an error (${code}): ${stderr}`))
      }
      resolve()
    })
  })
}
