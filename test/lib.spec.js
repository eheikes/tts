describe('lib', () => {

  const proxyquire = require('proxyquire');
  const { Readable } = require('stream');
  const tempfile = require('tempfile');

  let async, fs, getSynthesizeSpeechUrl, got, ora, spawn;
  let checkUsage, getSpinner, readText;

  beforeEach(() => {
    async = require('async');
    spyOn(async, 'eachOfLimit').and.callThrough();

    const realFs = require('fs-extra');
    fs = jasmine.createSpyObj('fs', [
      'appendFileSync',
      'createFileSync',
      'readFile',
      'readFileSync',
      'removeSync',
      'truncateSync',
      'writeFileSync',
    ]);

    got = jasmine.createSpyObj('got', ['stream']);
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

    ora = jasmine.createSpyObj('ora', ['fail', 'start', 'stop', 'succeed']);
    let oraStub = () => {
      return {
        start: () => {
          return ora;
        }
      };
    };

    getSynthesizeSpeechUrl = jasmine.createSpy('getSynthesizeSpeechUrl');
    let PollyStub = function() {
      this.getSynthesizeSpeechUrl = getSynthesizeSpeechUrl;
    };
    let pollyStub = {
      Presigner: PollyStub
    };

    let spawnOnSpy = jasmine.createSpy('spawn.on');
    spawnOnSpy.and.callFake((type, callback) => {
      if (type === 'close') { callback(); }
    });
    spawn = jasmine.createSpy('spawn').and.callFake(() => {
      return {
        on: spawnOnSpy,
        stderr: {
          on: jasmine.createSpy('spawn.stderr.on')
        }
      };
    });

    ({
      checkUsage, generateSpeech, getSpinner, readText, splitText
    } = proxyquire('../lib', {
      async: async,
      'aws-sdk/clients/polly': pollyStub,
      'child_process': { spawn },
      'fs-extra': fs,
      got: got,
      ora: oraStub,
    }));
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

  describe('generateSpeech()', () => {
    const textParts = [
      'hello', 'world', 'how are you?',
    ];

    describe('buildInfo()', () => {
      let partsOutput;

      beforeEach(done => {
        generateSpeech(textParts, { format: 'mp3' }).then(() => {
          partsOutput = async.eachOfLimit.calls.mostRecent().args[0];
        }).then(done);
      });

      it('should return an array of objects', () => {
        expect(partsOutput).toEqual(jasmine.any(Array));
      });

      it('should have the same length as the input array', () => {
        expect(partsOutput.length).toBe(textParts.length);
      });

      it('should have a "tempfile" property', () => {
        partsOutput.forEach(part => {
          expect(part.tempfile).toEqual(jasmine.any(String));
        });
      });

      it('should have an appropriate file extension for the tempfile', () => {
        partsOutput.forEach(part => {
          expect(part.tempfile).toMatch(/\.mp3$/);
        });
      });

      it('should have a "text" property with the original text', () => {
        partsOutput.forEach((part, i) => {
          expect(partsOutput[i].text).toBe(partsOutput[i].text);
        });
      });
    });

    describe('generateAll()', () => {
      describe('initial spinner', () => {
        beforeEach(() => {
          // Abort early so we can inspect generateAll().
          async.eachOfLimit.and.callFake((parts, opts, func, callback) => {
            callback(new Error('test error'));
          });
        });

        it('should be updated', done => {
          generateSpeech(textParts, {}).catch(() => {
            expect(ora.start).toHaveBeenCalled();
            expect(ora.text).toMatch('Convert to audio');
          }).then(done);
        });

        it('should show the part count', done => {
          generateSpeech(textParts, {}).catch(() => {
            expect(ora.text).toMatch(`/${textParts.length}\\)$`);
          }).then(done);
        });

        it('should start at 0', done => {
          generateSpeech(textParts, {}).catch(() => {
            expect(ora.text).toMatch('\\(0/');
          }).then(done);
        });
      });

      it('should asynchronously call AWS for each of the parts', done => {
        generateSpeech(textParts, {}).then(() => {
          let parts = async.eachOfLimit.calls.mostRecent().args[0];
          expect(parts).toEqual(jasmine.any(Array));
          expect(parts.length).toBe(textParts.length);
          expect(got.stream.calls.count()).toBe(textParts.length);
        }).then(done);
      });

      it('should limit the async calls according to the option', done => {
        const testLimit = 10;
        generateSpeech(textParts, { limit: testLimit }).then(() => {
          let limit = async.eachOfLimit.calls.mostRecent().args[1];
          expect(limit).toBe(testLimit);
        }).then(done);
      });

      describe('when all requests succeed', () => {
        beforeEach(() => {
          fs.writeFileSync.and.returnValue(new Error('abort early'));
        });

        it('should show the success spinner', done => {
          generateSpeech(textParts, {}).then(() => {
            expect(ora.succeed).toHaveBeenCalled();
          }).then(done);
        });
      });

      describe('when a request fails', () => {
        it('should stop the spinner', done => {
          generateSpeech(textParts, {}).catch(() => {
            expect(ora.fail).toHaveBeenCalled();
          }).then(done);
        });
      });

      describe('callAws()', () => {
        let callAws, opts, file, part;

        beforeEach(done => {
          file = tempfile('.tmp');
          part = {
            tempfile: file,
            text: textParts[0],
          };
          async.eachOfLimit.and.callFake((parts, opts, func, callback) => {
            callAws = func;
            callback(new Error('abort early'));
          });
          opts = {
            format: 'ogg',
            'sample-rate': 16000,
            voice: 'John',
          }
          generateSpeech(textParts, opts).catch(done);
        });

        afterEach(() => {
          fs.removeSync.and.callThrough();
          fs.removeSync(file);
        })

        it('should update the spinner', done => {
          const index = 6;
          callAws(part, index, () => {
            expect(ora.text).toMatch(`\\(${index}/`);
            done();
          });
        });

        it('should default to MP3 format', done => {
          generateSpeech(textParts, {}).catch(() => {
            callAws(part, 0, () => {
              let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
              expect(urlOpts.OutputFormat).toBe('mp3');
              done();
            });
          });
        });

        it('should use the given format, when specified', done => {
          callAws(part, 0, () => {
            let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
            expect(urlOpts.OutputFormat).toBe(opts.format);
            done();
          });
        });

        it('should not use sample rate if not specified', done => {
          generateSpeech(textParts, {}).catch(() => {
            callAws(part, 0, () => {
              let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
              expect(urlOpts.SampleRate).toBeUndefined();
              done();
            });
          });
        });

        it('should use the (string) sample rate, when specified', done => {
          callAws(part, 0, () => {
            let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
            expect(urlOpts.SampleRate).toBe(String(opts['sample-rate']));
            done();
          });
        });

        it('should use the text part', done => {
          callAws(part, 0, () => {
            let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
            expect(urlOpts.Text).toBe(part.text);
            done();
          });
        });

        it('should default to the Joanna voice', done => {
          generateSpeech(textParts, {}).catch(() => {
            callAws(part, 0, () => {
              let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
              expect(urlOpts.VoiceId).toBe('Joanna');
              done();
            });
          });
        });

        it('should use the given voice, when specified', done => {
          callAws(part, 0, () => {
            let urlOpts = getSynthesizeSpeechUrl.calls.mostRecent().args[0];
            expect(urlOpts.VoiceId).toBe(String(opts.voice));
            done();
          });
        });

        it('should time-limit the request to 30mins', done => {
          callAws(part, 0, () => {
            let ttl = getSynthesizeSpeechUrl.calls.mostRecent().args[1];
            expect(ttl).toBe(60 * 30);
            done();
          });
        });
      });
    });
  });

  describe('createManifest()', () => {
    const textParts = [
      'hello', 'world', 'how are you?',
    ];
    let outputFilename, fileContents, options, lines;

    beforeEach(done => {
      generateSpeech(textParts, {}).then(() => {
        [outputFilename, fileContents, options] = fs.writeFileSync.calls.mostRecent().args;
        lines = fileContents.split('\n');
      }).then(done);
    });

    it('should create a text file', () => {
      expect(outputFilename).toMatch(/\.txt$/);
      expect(options).toBe('utf8');
    });

    it('should have a file entry for each part', () => {
      expect(lines.length).toBe(textParts.length);
    });

    it('should use the correct format', () => {
      lines.forEach(line => {
        expect(line).toMatch(/^file '[^']+\.mp3'$/);
      });
    });
  });

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

  describe('splitText()', () => {
    const testData = 'hello world';

    it('should update the spinner', done => {
      splitText(testData).then(() => {
        expect(ora.start).toHaveBeenCalled();
        expect(ora.text).toMatch('Splitting text');
      }).then(done);
    });

    it('should split the text into an array of parts', done => {
      splitText(testData).then(text => {
        expect(text).toEqual([testData]);
      }).then(done);
    });

    it('should condense whitespace', done => {
      splitText('hello   world').then(text => {
        expect(text).toEqual(['hello world']);
      }).then(done);
    });

    it('should trim whitespace from the ends', done => {
      splitText(' hello world ').then(text => {
        expect(text).toEqual(['hello world']);
      }).then(done);
    });

    it('should show the spinner success state', done => {
      splitText(testData).then(() => {
        expect(ora.succeed).toHaveBeenCalled();
      }).then(done);
    });
  });

});
