const { copyFile } = require('fs/promises')
const { join } = require('path')
const tempfile = require('tempfile')
const { runWith } = require('./helper')

describe('aws', () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000

  const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY
  const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY
  const ffmpegBinary = join(__dirname, '../fixtures/ffmpeg-mock.sh')

  const defaults = [
    '--service', 'aws',
    '--ffmpeg', ffmpegBinary,
    '--access-key', AWS_ACCESS_KEY,
    '--secret-key', AWS_SECRET_KEY
  ]

  let inputFile
  let outputFile
  let stderr
  let stdout
  let exitCode

  beforeEach(async () => {
    inputFile = tempfile()
    outputFile = tempfile()
    await copyFile(join(__dirname, '../fixtures/lorem-ipsum.txt'), inputFile)
  })

  fit('should succeed', async () => {
    ({ exitCode, stdout, stderr } = await runWith(inputFile, outputFile, ...defaults))
    console.log('**stdout:', Buffer.from(stdout))
    console.log('**comparison:', Buffer.from('❯ Reading text'))
    expect(stdout).toContain('❯ Reading text')
    expect(stdout).toContain('✔ Reading text')
    expect(stdout).toContain('❯ Splitting text')
    expect(stdout).toContain('✔ Splitting text')
    expect(stdout).toContain('❯ Convert to audio')
    expect(stdout).toContain('✔ Convert to audio')
    expect(stdout).toContain('❯ Combine audio')
    expect(stdout).toContain('✔ Combine audio')
    expect(stdout).toContain('❯ Clean up')
    expect(stdout).toContain('✔ Clean up')
    expect(stdout).toContain('❯ Saving file')
    expect(stdout).toContain(`✔ Done. Saved to ${outputFile}`)
    expect(stderr).toBe('')
    expect(exitCode).toBe(0)
  })
})
