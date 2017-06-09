describe('lib', () => {

  const proxyquire = require('proxyquire');

  let ora, fs;
  let checkUsage, getSpinner, readText;

  beforeEach(() => {
    fs = jasmine.createSpyObj('fs', ['readFile']);
    ora = jasmine.createSpyObj('ora', ['start', 'stop', 'succeed']);
    let oraStub = () => {
      return {
        start: () => {
          return ora;
        }
      };
    };
    ({
      checkUsage, getSpinner, readText
    } = proxyquire('../lib', { 'fs-extra': fs, ora: oraStub }));
  });

  describe('checkUsage()', () => {
    let proc, exit, write;

    beforeEach(() => {
      exit = jasmine.createSpy('process.exit');
      write = jasmine.createSpy('process.stderr.write');
      proc = {
        argv: ['node', 'tts.js'],
        exit: exit,
        stderr: {
          write: write
        }
      };
    });

    it('should stop the spinner', () => {
      checkUsage({ _: [] }, proc);
      expect(ora.stop).toHaveBeenCalled();
    });

    describe('when --help is specified', () => {
      beforeEach(() => {
        checkUsage({ _: [], help: true }, proc);
      });

      it('should output the usage statement', () => {
        expect(write).toHaveBeenCalled();
      });

      it('should exit without an error', () => {
        expect(exit).toHaveBeenCalledWith(0);
      });
    });

    describe('when 1 argument is passed', () => {
      beforeEach(() => {
        checkUsage({ _: ['foo'] }, proc);
      });

      it('should NOT output the usage statement', () => {
        expect(write).not.toHaveBeenCalled();
      });

      it('should NOT exit', () => {
        expect(exit).not.toHaveBeenCalled();
      });
    });

    describe('when no arguments are passed', () => {
      beforeEach(() => {
        checkUsage({ _: [] }, proc);
      });

      it('should output the usage statement', () => {
        expect(write).toHaveBeenCalled();
      });

      it('should exit with an error', () => {
        expect(exit).toHaveBeenCalledWith(1);
      });
    });
  });

  xdescribe('generateSpeech()', () => {});

  describe('getSpinner()', () => {
    it('should return the spinner', () => {
      expect(getSpinner()).toBe(ora);
    });
  });

  describe('readText()', () => {
    const testData = 'hello world';
    let proc, stdin;

    beforeEach(() => {
      let sentData = false;
      stdin = jasmine.createSpyObj('stdin', ['on', 'read', 'setEncoding']);
      stdin.on.and.callFake((type, callback) => { callback(); });
      stdin.read.and.callFake(() => {
        let response = sentData ? null : testData;
        sentData = true;
        return response;
      })
      proc = {
        stdin: stdin
      };
    });

    it('should update the spinner', done => {
      readText(null, proc).then(() => {
        expect(ora.start).toHaveBeenCalled();
        expect(ora.text).toMatch('Reading text');
      }).then(done);
    });

    describe('when it succeeds', () => {
      it('should show the spinner success state', done => {
        readText(null, proc).then(() => {
          expect(ora.succeed).toHaveBeenCalled();
        }).then(done);
      });

      it('should return the read text', done => {
        readText(null, proc).then(text => {
          expect(text).toBe(testData);
        }).then(done);
      });
    });

    describe('when no filename is specified', () => {
      it('should read data from stdin', done => {
        readText(null, proc).then(() => {
          expect(stdin.on).toHaveBeenCalled();
          expect(stdin.read).toHaveBeenCalled();
        }).then(done);
      });

      it('should use UTF-8 encoding', done => {
        readText(null, proc).then(() => {
          expect(stdin.setEncoding).toHaveBeenCalledWith('utf8');
        }).then(done);
      });
    });

    describe('when a filename is specified', () => {
      const testFilename = 'test.txt';

      beforeEach(() => {
        fs.readFile.and.callFake((filename, opts, callback) => {
          callback(null, testData);
        });
      });

      it('should read data from the file', done => {
        readText(testFilename, proc).then(() => {
          expect(fs.readFile).toHaveBeenCalledWith(
            testFilename,
            'utf8',
            jasmine.any(Function)
          );
        }).then(done);
      });

      describe('and can read the file', () => {
        it('should return the file\'s data', done => {
          readText(testFilename, proc).then(text => {
            expect(text).toBe(testData);
          }).then(done);
        });
      });

      describe('and cannot read the file', () => {
        it('should reject with the error', done => {
          const testError = 'error object';
          fs.readFile.and.callFake((filename, opts, callback) => {
            callback(testError);
          });
          readText(testFilename, proc).catch(err => {
            expect(err).toBe(testError);
          }).then(done);
        });
      });
    });

  });

});
