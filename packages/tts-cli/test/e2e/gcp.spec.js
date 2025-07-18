const { copyFile, writeFile } = require('fs/promises')
const { join } = require('path')
const tempfile = require('tempfile')
const { runWith } = require('./helper')

describe('gcp', () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000

  const GCP_PROJECT_FILE = process.env.GCP_PROJECT_FILE
  const ffmpegBinary = join(__dirname, '../fixtures/ffmpeg-mock.sh')

  const projectFile = tempfile('.json')
  const defaults = [
    '--service', 'gcp',
    '--ffmpeg', ffmpegBinary,
    '--project-file', projectFile
  ]

  let inputFile
  let outputFile
  let stderr
  let stdout
  let exitCode

  beforeEach(async () => {
    await writeFile(projectFile, GCP_PROJECT_FILE, 'utf-8')
    inputFile = tempfile()
    outputFile = tempfile()
    await copyFile(join(__dirname, '../fixtures/lorem-ipsum.txt'), inputFile)
  })

  it('should succeed', async () => {
    ({ exitCode, stdout, stderr } = await runWith(inputFile, outputFile, ...defaults))
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
    expect(stderr).toEqual(jasmine.any(String)) // there is a deprecation warning
    expect(exitCode).toBe(0)
  })
})
