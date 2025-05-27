const debug = require('debug')
const { appendFile, readFile, writeFile } = require('fs/promises')

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
