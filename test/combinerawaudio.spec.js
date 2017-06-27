'use strict';
describe('combineRawAudio()', () => {
  const manifestFilename = 'manifest.txt';
  const outputFilename = 'foobar.mp3';
  const tempFilenames = ['foo.mp3', 'bar.mp3'];

  let combineRawAudio, fs;

  beforeEach(() => {
    ({ combineRawAudio, fs } = require('./helpers').loadLib());
  });

  beforeEach(done => {
    const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n');
    fs.readFileSync.and.callFake(() => manifestContents);
    combineRawAudio(manifestFilename, outputFilename).then(done);
  });

  it('should create the output file and truncate it', () => {
    expect(fs.createFileSync).toHaveBeenCalledWith(outputFilename);
    expect(fs.truncateSync).toHaveBeenCalledWith(outputFilename);
  });

  it('should read and append each file from the manifest', () => {
    tempFilenames.forEach(filename => {
      expect(fs.readFileSync).toHaveBeenCalledWith(filename);
    });
    expect(fs.appendFileSync.calls.count()).toBe(tempFilenames.length);
  });
});
