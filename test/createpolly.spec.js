'use strict';
describe('createPolly()', () => {
  const opts = {
    'access-key': 'accesskey',
    region: 'us-east1',
    'secret-key': 'secretkey',
  };

  let createPolly, Polly;
  let arg, response;

  beforeEach(() => {
    ({ createPolly, Polly } = require('./helpers').loadLib());
    response = createPolly(opts);
    arg = Polly.calls.mostRecent().args[0];
  });

  it('should return a Polly instance', () => {
    expect(response).toEqual(jasmine.any(Object));
  });

  it('should set the API version', () => {
    expect(arg.apiVersion).toEqual(jasmine.any(String));
  });

  it('should pass along the region', () => {
    expect(arg.region).toBe(opts.region);
  });

  it('should pass along the access key', () => {
    expect(arg.accessKeyId).toBe(opts['access-key']);
  });

  it('should pass along the secret key', () => {
    expect(arg.secretAccessKey).toBe(opts['secret-key']);
  });
});
