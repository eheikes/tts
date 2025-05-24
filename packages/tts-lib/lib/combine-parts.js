const spawn = require('child_process').spawn
const debug = require('debug')
const { appendFile, readFile, writeFile } = require('fs/promises')

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

/**
 * Concatenates raw PCM audio into one file.
 */
exports.combineRawAudio = async (manifestFile, outputFile) => {
  const manifest = await readFile(manifestFile, 'utf8')
  debug('combineRawAudio')(`Manifest contains: ${manifest}`)
  const regexpState = /^file\s+'(.*)'$/gm
  debug('combineRawAudio')(`Creating file ${outputFile}`)
  await writeFile(outputFile, '')
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug('combineRawAudio')(`Reading data from ${match[1]}`)
    const dataBuffer = await readFile(match[1])
    debug('combineRawAudio')(`Appending data to ${outputFile}`)
    await appendFile(outputFile, dataBuffer)
  }
  return Promise.resolve()
}

/**
 * Combines all the parts into one file.
 * Resolves with the new filename.
 */
exports.combine = async (manifestFile, newFile, format = 'encoded', ffmpegBinary = 'ffmpeg') => {
  debug('combine')(`Combining files into ${newFile}`)
  if (format === 'raw') {
    await exports.combineRawAudio(manifestFile, newFile)
  } else {
    await exports.combineEncodedAudio(ffmpegBinary, manifestFile, newFile)
  }
  return newFile
}
