describe('readText()', () => {
  const testData = 'hello world';

  let readText, ora;
  let proc, stdin;

  beforeEach(() => {
    ({ readText, ora } = require('./helpers').loadLib());
  });


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
