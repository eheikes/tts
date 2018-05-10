const debug = require('debug')('cleanup')
const fs = require('fs-extra')

/**
 * Deletes the manifest and its files.
 */
exports.cleanup = ctx => {
  const manifestFile = ctx.manifestFile
  let manifest = fs.readFileSync(manifestFile, 'utf8')
  debug(`Manifest is ${manifest}`)
  let regexpState = /^file\s+'(.*)'$/gm
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug(`Deleting temporary file ${match[1]}`)
    fs.removeSync(match[1])
  }
  debug(`Deleting manifest file ${manifestFile}`)
  fs.removeSync(manifestFile)
}
