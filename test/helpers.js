'use strict';

const async = require('async');
const proxyquire = require('proxyquire');
const { Readable } = require('stream');

exports.loadLib = () => {
  // Spy on the async module.
  spyOn(async, 'eachOfLimit').and.callThrough();

  // Stub out the fs(-extra) module with spies.
  let fs = jasmine.createSpyObj('fs', [
    'appendFileSync',
    'createFileSync',
    'readFile',
    'readFileSync',
    'removeSync',
    'truncateSync',
    'writeFileSync',
  ]);

  // Stub out the got module with a spy.
  let got = jasmine.createSpyObj('got', ['stream']);
  got.stream.and.callFake(url => {
    return new Readable({
      read() {
        if (this.alreadySent) {
          this.push(null);
        } else {
          this.push('test');
          this.alreadySent = true;
        }
      }
    });
  });

  // Stub out the spinner with spies.
  let ora = jasmine.createSpyObj('ora', ['fail', 'start', 'stop', 'succeed']);
  let oraStub = () => {
    return {
      start: () => {
        return ora;
      }
    };
  };

  // Stub out the Polly SDK.
  // let getSynthesizeSpeechUrl = jasmine.createSpy('getSynthesizeSpeechUrl');
  // let PollyStub = function() {
  //   this.getSynthesizeSpeechUrl = getSynthesizeSpeechUrl;
  // };
  let PollyStub = jasmine.createSpy('Polly');
  let pollyStub = {
    Presigner: PollyStub
  };

  let spawnOnSpy = jasmine.createSpy('spawn.on').and.callFake((type, callback) => {
    if (type === 'close') { callback(); }
  });
  let spawnStderrOn = jasmine.createSpy('spawn.stderr.on');
  let spawn = jasmine.createSpy('spawn').and.callFake(() => {
    return {
      on: spawnOnSpy,
      stderr: {
        on: spawnStderrOn
      }
    };
  });

  // Load the library module.
  let lib = proxyquire('../lib', {
    async: async,
    'aws-sdk/clients/polly': pollyStub,
    child_process: { spawn }, // eslint-disable-line camelcase
    'fs-extra': fs,
    got: got,
    ora: oraStub,
  });

  // Add the spies for inspection.
  lib.async = async;
  lib.fs = fs;
  lib.got = got;
  lib.ora = ora;
  lib.Polly = PollyStub;
  lib.spawn = spawn;
  lib.spawn.on = spawnOnSpy;
  lib.spawn.stderr = { on: spawnStderrOn };

  return lib;
};
