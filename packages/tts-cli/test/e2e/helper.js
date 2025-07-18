const { execa } = require('execa')

const runWith = async (...args) => {
  return execa(
    'node',
    [
      'tts.js'
    ].concat(args),
    { cwd: '../../packages/tts-cli' }
  )
}

module.exports = {
  runWith
}
