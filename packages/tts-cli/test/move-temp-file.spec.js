const proxyquire = require('proxyquire')

describe('moveTempFile()', () => {
  const sourceFile = 'source file'
  const destFile = 'destination file'

  let moveTempFile
  let fsSpy
  let ctx, task

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', ['move'])
    fsSpy.move.and.callFake((src, dest, opts, callback) => { callback() })
    ;({ moveTempFile } = proxyquire('../lib/move-temp-file', {
      'fs-extra': fsSpy
    }))
    ctx = {
      tempFile: sourceFile,
      outputFilename: destFile
    }
    task = { title: 'test task' }
    return moveTempFile(ctx, task)
  })

  it('should overwrite the destination filename with the specified temp file', () => {
    expect(fsSpy.move).toHaveBeenCalledWith(
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
    fsSpy.move.and.callFake((src, dest, opts, callback) => callback(new Error('test error')))
    return moveTempFile(ctx, task).then(() => {
      throw new Error('should have thrown!')
    }).catch(err => {
      expect(err.message).toBe('test error')
    })
  })
})
