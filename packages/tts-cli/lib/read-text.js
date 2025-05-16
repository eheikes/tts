const debug = require('debug')('readText')
const { readFile } = require('fs/promises')

/**
 * Read in the text from a file.
 * If no file is specified, read from stdin.
 */
exports.readText = async (inputFilename, proc) => {
  return new Promise((resolve, reject) => {
    if (inputFilename) {
      // Read from a file.
      debug(`Reading from ${inputFilename}`)
      readFile(inputFilename, 'utf8').then((data) => {
        debug(`Finished reading (${data.length} bytes)`)
        resolve(data)
      }).catch((err) => {
        reject(err)
      })
    } else {
      // Read from stdin.
      debug('Reading from stdin')
      let data = ''
      proc.stdin.setEncoding('utf8')
      proc.stdin.on('readable', () => {
        const chunk = proc.stdin.read()
        /* istanbul ignore else: need to add test for this */
        if (chunk !== null) { data += chunk }
      })
      proc.stdin.on('end', () => {
        debug(`Finished reading (${data.length} bytes)`)
        resolve(data)
      })
    }
  })
}
