const debug = require('debug')('cleanup')
const { readFile, rm } = require('fs/promises')

/**
 * Deletes the manifest and its files.
 */
exports.cleanup = async (manifestFile) => {
  const manifest = await readFile(manifestFile, 'utf8')
  debug(`Manifest is ${manifest}`)
  const regexpState = /^file\s+'(.*)'$/gm
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug(`Deleting temporary file ${match[1]}`)
    rm(match[1], { force: true, recursive: true })
  }
  debug(`Deleting manifest file ${manifestFile}`)
  rm(manifestFile, { force: true, recursive: true })
}
