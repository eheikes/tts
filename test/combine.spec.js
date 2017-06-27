'use strict';
describe('combine()', () => {
  const testManifest = 'manifest.txt';

  let opts, combine, fs, ora, spawn;

  beforeEach(() => {
    opts = {
      ffmpeg: 'ffmpeg',
      format: 'mp3',
    };
    ({ combine, fs, ora, spawn } = require('./helpers').loadLib());
  });

  it('should start the spinner', () => {
    combine(testManifest, opts);
    expect(ora.start).toHaveBeenCalled();
    expect(ora.text).toMatch('Combine audio');
  });

  describe('when the format is MP3', () => {
    it('should call combineEncodedAudio()', () => {
      combine(testManifest, opts);
      // We can't spy on combineEncodedAudio() directly, so look at its internals.
      expect(spawn).toHaveBeenCalled();
      expect(spawn.calls.mostRecent().args[0]).toBe(opts.ffmpeg);
    });
  });

  describe('when the format is PCM', () => {
    it('should call combineRawAudio()', () => {
      opts.format = 'pcm';
      combine(testManifest, opts);
      // We can't spy on combineRawAudio() directly, so look at its internals.
      expect(fs.createFileSync).toHaveBeenCalled();
    });
  });

  describe('when it succeeds', () => {
    let result;

    beforeEach(done => {
      opts.format = 'pcm';
      combine(testManifest, opts).then(response => {
        result = response;
      }).then(done);
    });

    it('should update the spinner text', () => {
      expect(ora.text).toMatch('Clean up');
    });

    it('should set the spinner to the success state', () => {
      expect(ora.succeed).toHaveBeenCalled();
    });

    it('should return the new filename', () => {
      expect(result).toMatch(/\.pcm$/);
    });
  });

  describe('when it fails', () => {
    let result;

    beforeEach(done => {
      spawn.on.and.callFake((type, callback) => {
        if (type === 'error') { callback(); }
      });
      combine(testManifest, opts).catch(response => {
        result = response;
      }).then(done);
    });

    it('should return a rejected promise with the error', () => {
      expect(result.message).toMatch('Could not start ffmpeg process');
    });
  });
});
