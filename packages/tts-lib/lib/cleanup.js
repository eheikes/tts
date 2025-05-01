const debug = require('debug')('cleanup')
const fs = require('fs-extra') // TODO not needed anymore?

/**
 * Deletes the manifest and its files.
 */
exports.cleanup = async (manifestFile) => {
  const manifest = fs.readFileSync(manifestFile, 'utf8') // TODO use async
  debug(`Manifest is ${manifest}`)
  const regexpState = /^file\s+'(.*)'$/gm
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug(`Deleting temporary file ${match[1]}`)
    fs.removeSync(match[1]) // TODO use async
  }
  debug(`Deleting manifest file ${manifestFile}`)
  fs.removeSync(manifestFile) // TODO use async
}
