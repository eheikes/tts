'use strict';
describe('splitText()', () => {
  const testData = 'hello world';

  let splitText, ora;

  beforeEach(() => {
    ({ splitText, ora } = require('./helpers').loadLib());
  });

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
