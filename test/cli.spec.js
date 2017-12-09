'use strict';
describe('CLI', () => {
  const proxyquire = require('proxyquire');

  const text = 'hello world';
  const parts = ['hello', 'world'];
  const tempFile = 'tempfile.mp3';

  let fs, lib, loadCli, infoSpy, succeedSpy;

  beforeEach(() => {
    fs = jasmine.createSpyObj('fs', ['move']);
    infoSpy = jasmine.createSpy('spinner info');
    succeedSpy = jasmine.createSpy('spinner succeed');

    lib = jasmine.createSpyObj('lib', [
      'checkUsage',
      'generateSpeech',
      'getSpinner',
      'readText',
      'splitText'
    ]);
    lib['@noCallThru'] = true; // prevent calling of original file
    lib.getSpinner.and.returnValue({
      info: infoSpy,
      succeed: succeedSpy
    });
    lib.generateSpeech.and.returnValue(Promise.resolve(tempFile));
    lib.readText.and.returnValue(Promise.resolve(text));
    lib.splitText.and.returnValue(Promise.resolve(parts));

    loadCli = () => {
      return new Promise((resolve) => {
        fs.move.and.callFake((tempFile, outFile, opts, callback) => {
          callback();
          resolve(); // wait after fs.move() is called
        });
        proxyquire('../tts', {
          'fs-extra': fs,
          './lib': lib,
        });
      });
    };
  });

  describe('when 2 arguments are given', () => {
    const inputFile = 'input-file';
    const outputFile = 'output-file';

    beforeEach(done => {
      process.argv = ['node', 'tts.js', inputFile, outputFile];
      loadCli().then(done);
    });

    it('should use the first argument for the input filename', () => {
      expect(lib.readText.calls.mostRecent().args[0]).toBe(inputFile);
    });

    it('should use the second argument for the output filename', () => {
      expect(fs.move.calls.mostRecent().args[1]).toBe(outputFile);
    });
  });

  describe('when only 1 argument is given', () => {
    const outputFile = 'output-file';

    beforeEach(done => {
      process.argv = ['node', 'tts.js', outputFile];
      loadCli().then(done);
    });

    it('should use null for the input filename', () => {
      expect(lib.readText.calls.mostRecent().args[0]).toBe(null);
    });

    it('should use the first argument for the output filename', () => {
      expect(fs.move.calls.mostRecent().args[1]).toBe(outputFile);
    });
  });

  describe('when everything succeeds', () => {
    const inputFile = 'input-file';
    const outputFile = 'output-file';

    beforeEach(done => {
      process.argv = ['node', 'tts.js', inputFile, outputFile];
      loadCli().then(done);
    });

    it('should check the usage', () => {
      expect(lib.checkUsage).toHaveBeenCalled();
    });

    it('should read the text from the input file', () => {
      expect(lib.readText).toHaveBeenCalledWith(inputFile, process);
    });

    it('should split the text', () => {
      const defaultNumChars = 1500;
      expect(lib.splitText).toHaveBeenCalledWith(text, defaultNumChars, jasmine.any(Object));
    });

    it('should generate the speech', () => {
      expect(lib.generateSpeech).toHaveBeenCalledWith(parts, jasmine.any(Object));
    });

    it('should move the temp file to the output file', () => {
      expect(fs.move).toHaveBeenCalledWith(
        tempFile,
        outputFile,
        { overwrite: true },
        jasmine.any(Function)
      );
    });

    it('should switch the spinner to the success state, with the output filename', () => {
      expect(succeedSpy).toHaveBeenCalled();
      expect(succeedSpy.calls.mostRecent().args[0]).toMatch(outputFile);
    });
  });

  describe('when something fails', () => {
    const inputFile = 'input-file';
    const outputFile = 'output-file';
    const error = new Error('test error');

    beforeEach(done => {
      process.argv = ['node', 'tts.js', inputFile, outputFile];
      infoSpy.and.callFake(done);
      lib.readText.and.returnValue(Promise.reject(error));
      loadCli().then(done);
    });

    it('should display the error message', () => {
      expect(infoSpy).toHaveBeenCalledWith(error.message);
    });
  });
});
