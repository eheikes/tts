const spawn = require('child_process').spawn
const debug = require('debug')
const fs = require('fs-extra')
const tempfile = require('tempfile')
const { extensionFor } = require('./file-extensions')

/**
 * Combines MP3 or OGG files into one file.
 */
exports.combineEncodedAudio = (binary, manifestFile, outputFile) => {
  let args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', manifestFile,
    '-c', 'copy',
    outputFile
  ]
  return new Promise((resolve, reject) => {
    debug('combineEncodedAudio')(`Running ${binary} ${args.join(' ')}`)
    let ffmpeg = spawn(binary, args)
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
exports.combineRawAudio = (manifestFile, outputFile) => {
  let manifest = fs.readFileSync(manifestFile, 'utf8')
  debug('combineRawAudio')(`Manifest contains: ${manifest}`)
  let regexpState = /^file\s+'(.*)'$/gm
  debug('combineRawAudio')(`Creating file ${outputFile}`)
  fs.createFileSync(outputFile)
  debug('combineRawAudio')(`Truncating file ${outputFile}`)
  fs.truncateSync(outputFile)
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug('combineRawAudio')(`Reading data from ${match[1]}`)
    let dataBuffer = fs.readFileSync(match[1])
    debug('combineRawAudio')(`Appending data to ${outputFile}`)
    fs.appendFileSync(outputFile, dataBuffer)
  }
  return Promise.resolve()
}

/**
 * Combines all the parts into one file.
 * Resolves with the new filename.
 */
exports.combine = (ctx) => {
  const manifestFile = ctx.manifestFile
  const opts = ctx.opts
  let newFile = tempfile(`.${extensionFor(opts.format, ctx.service)}`)
  debug('combine')(`Combining files into ${newFile}`)
  let combiner = opts.format === 'pcm' && ctx.service === 'aws'
    ? exports.combineRawAudio(manifestFile, newFile)
    : exports.combineEncodedAudio(opts.ffmpeg, manifestFile, newFile)
  return combiner.then(() => {
    ctx.tempFile = newFile
  })
}
