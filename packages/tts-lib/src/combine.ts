import { spawn } from 'child_process'
import { appendFileSync, createFileSync, readFileSync, truncateSync } from 'fs-extra'
import { debug } from './debug'

/**
 * Combines MP3 or OGG files into one file.
 */
export const combineEncodedAudio = async (binary: string, manifestFile: string, outputFile: string): Promise<void> => {
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
export const combineRawAudio = async (manifestFile: string, outputFile: string): Promise<void> => {
  let manifest = readFileSync(manifestFile, 'utf8')
  debug('combineRawAudio')(`Manifest contains: ${manifest}`)
  let regexpState = /^file\s+'(.*)'$/gm
  debug('combineRawAudio')(`Creating file ${outputFile}`)
  createFileSync(outputFile)
  debug('combineRawAudio')(`Truncating file ${outputFile}`)
  truncateSync(outputFile)
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug('combineRawAudio')(`Reading data from ${match[1]}`)
    let dataBuffer = readFileSync(match[1])
    debug('combineRawAudio')(`Appending data to ${outputFile}`)
    appendFileSync(outputFile, dataBuffer)
  }
}
