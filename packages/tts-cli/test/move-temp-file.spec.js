const proxyquire = require('proxyquire')

describe('moveTempFile()', () => {
  const sourceFile = 'source file'
  const destFile = 'destination file'

  let moveTempFile
  let fsSpy
  let ctx, task

  beforeEach(async () => {
    fsSpy = jasmine.createSpyObj('fs', ['rename'])
    fsSpy.rename.and.callFake((src, dest) => Promise.resolve())
    ;({ moveTempFile } = proxyquire('../lib/move-temp-file', {
      'fs/promises': fsSpy
    }))
    ctx = {
      tempFile: sourceFile,
      outputFilename: destFile
    }
    task = { title: 'test task' }
    await moveTempFile(ctx, task)
  })

  it('should overwrite the destination filename with the specified temp file', () => {
    expect(fsSpy.rename).toHaveBeenCalledWith(sourceFile, destFile)
  })

  it('should update the task title', () => {
    expect(task.title).toContain('Done. Saved to')
  })

  it('should return the error if the filesystem call fails', async () => {
    fsSpy.rename.and.callFake((src, dest) => Promise.reject(new Error('test error')))
    try {
      await moveTempFile(ctx, task)
      throw new Error('should have thrown!')
    } catch(err) {
      expect(err.message).toBe('test error')
    }
  })
})
