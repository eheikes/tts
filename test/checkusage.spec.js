'use strict';
describe('checkUsage()', () => {
  let checkUsage, ora;
  let proc, exit, write;

  beforeEach(() => {
    ({ checkUsage, ora } = require('./helpers').loadLib());
  });

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
