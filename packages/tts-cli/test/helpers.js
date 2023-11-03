const async = require('async')
const proxyquire = require('proxyquire')

exports.loadLib = (file) => {
  // Spy on the async module.
  spyOn(async, 'eachOfLimit').and.callThrough()

  // Stub out the fs(-extra) module with spies.
  let fs = jasmine.createSpyObj('fs', [
    'appendFileSync',
    'createFileSync',
    'move',
    'readFile',
    'readFileSync',
    'removeSync',
    'truncateSync',
    'writeFile',
    'writeFileSync'
  ])
  fs.move.and.callFake((src, dest, opts, callback) => { callback() })
  fs.writeFile.and.callFake((dest, data, opts, callback) => { callback() })

  // Stub out a provider.
  let providerStub = {
    create: () => ({
      buildPart: () => ({}),
      generate: (item, key, callback) => callback(null, null)
    })
  }

  let spawnOnSpy = jasmine.createSpy('spawn.on').and.callFake((type, callback) => {
    if (type === 'close') { callback() }
  })
  let spawnStderrOn = jasmine.createSpy('spawn.stderr.on')
  let spawn = jasmine.createSpy('spawn').and.callFake(() => {
    return {
      on: spawnOnSpy,
      stderr: {
        on: spawnStderrOn
      }
    }
  })

  // Load the library module.
  let lib = proxyquire(`../lib/${file}`, {
    './providers/aws': providerStub,
    './providers/gcp': providerStub,
    async: async,
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
