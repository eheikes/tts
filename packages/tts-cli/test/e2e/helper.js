const runWith = async (...args) => {
  const { execa } = await import('execa')
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
