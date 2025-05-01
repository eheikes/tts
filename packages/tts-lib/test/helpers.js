// TODO clean up this file
const async = require('async')
const originalFs = require('fs')
const proxyquire = require('proxyquire')

exports.loadLib = (file) => {
  // Spy on the async module.
  spyOn(async, 'eachOfLimit').and.callThrough()

  // Stub out the fs(-extra) module with spies.
  const fs = jasmine.createSpyObj('fs', [
    'appendFileSync',
    'createFileSync',
    'createWriteStream',
    'move',
    'readFile',
    'readFileSync',
    'removeSync',
    'truncateSync',
    'writeFile',
    'writeFileSync'
  ])
  fs.createWriteStream.and.callFake(filename => {
    const stream = originalFs.createWriteStream(filename)
    return stream
  })
  fs.move.and.callFake((src, dest, opts, callback) => { callback() })
  fs.writeFile.and.callFake((dest, data, opts, callback) => { callback() })

  // Stub out a provider.
  const providerStub = {
    create: () => ({
      buildPart: () => ({}),
      generate: (item, key, callback) => callback(null, null)
    })
  }

  const spawnOnSpy = jasmine.createSpy('spawn.on').and.callFake((type, callback) => {
    if (type === 'close') { callback() }
  })
  const spawnStderrOn = jasmine.createSpy('spawn.stderr.on')
  const spawn = jasmine.createSpy('spawn').and.callFake(() => {
    return {
      on: spawnOnSpy,
      stderr: {
        on: spawnStderrOn
      }
    }
  })

  // Load the library module.
  const lib = proxyquire(`../lib/${file}`, {
    './providers/aws': providerStub,
    './providers/gcp': providerStub,
    async,
    child_process: { spawn }, // eslint-disable-line camelcase
    'fs-extra': fs
  })

  // Add the spies for inspection.
  lib.async = async
  lib.fs = fs
  lib.provider = providerStub
  lib.spawn = spawn
  lib.spawn.on = spawnOnSpy
  lib.spawn.stderr = { on: spawnStderrOn }

  return lib
}
