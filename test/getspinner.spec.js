describe('getSpinner()', () => {
  let getSpinner, ora;

  beforeEach(() => {
    ({ getSpinner, ora } = require('./helpers').loadLib());
  });

  it('should return the spinner', () => {
    expect(getSpinner()).toBe(ora);
  });
});
