const debug = require('debug')('readText')
const { readFile } = require('fs/promises')

/**
 * Read in the text from a file.
 * If no file is specified, read from stdin.
 */
exports.readText = async (inputFilename, proc) => {
  if (inputFilename) {
    // Read from a file.
    debug(`Reading from ${inputFilename}`)
    const data = await readFile(inputFilename, 'utf8')
    debug(`Finished reading (${data.length} bytes)`)
    return data
  } else {
    // Read from stdin.
    debug('Reading from stdin')
    proc.stdin.setEncoding('utf8')
    let data = ''
    for await (const chunk of proc.stdin) {
      data += chunk
    }
    debug(`Finished reading (${data.length} bytes)`)
    return data
  }
}
