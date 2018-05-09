const debug = require('debug')('readText')
const fs = require('fs-extra')

/**
 * Read in the text from a file.
 * If no file is specified, read from stdin.
 */
exports.readText = (ctx) => {
  const inputFilename = ctx.input
  const proc = ctx.proc
  return new Promise((resolve, reject) => {
    if (inputFilename) {
      // Read from a file.
      debug(`Reading from ${inputFilename}`)
      fs.readFile(inputFilename, 'utf8', (err, data) => {
        if (err) { return reject(err) }
        debug(`Finished reading (${data.length} bytes)`)
        resolve(data)
      })
    } else {
      // Read from stdin.
      debug('Reading from stdin')
      let data = ''
      proc.stdin.setEncoding('utf8')
      proc.stdin.on('readable', () => {
        let chunk = proc.stdin.read()
        /* istanbul ignore else: need to add test for this */
        if (chunk !== null) { data += chunk }
      })
      proc.stdin.on('end', () => {
        debug(`Finished reading (${data.length} bytes)`)
        resolve(data)
      })
    }
  }).then(text => {
    ctx.text = text
  })
}
