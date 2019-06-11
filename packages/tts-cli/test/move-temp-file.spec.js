describe('moveTempFile()', () => {
  const sourceFile = 'source file'
  const destFile = 'destination file'

  let moveTempFile, fs
  let ctx, task

  beforeEach(() => {
    ({ fs, moveTempFile } = require('./helpers').loadLib('move-temp-file'))
    ctx = {
      tempFile: sourceFile,
      outputFilename: destFile
    }
    task = { title: 'test task' }
    return moveTempFile(ctx, task)
  })

  it('should overwrite the destination filename with the specified temp file', () => {
    expect(fs.move).toHaveBeenCalledWith(
      sourceFile,
      destFile,
      { overwrite: true },
      jasmine.any(Function)
    )
  })

  it('should update the task title', () => {
    expect(task.title).toContain('Done. Saved to')
  })

  it('should return the error if the filesystem call fails', () => {
    fs.move.and.callFake((src, dest, opts, callback) => callback(new Error('test error')))
    return moveTempFile(ctx, task).then(() => {
      throw new Error('should have thrown!')
    }).catch(err => {
      expect(err.message).toBe('test error')
    })
  })
})
