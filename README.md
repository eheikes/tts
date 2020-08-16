# Text-To-Speech Tools

This monorepository includes tools to convert a text file of any size to speech:

* [Command-line interface (CLI) tool](packages/tts-cli)

These tools require an account with at least one of these (paid) services:

* [Amazon Web Services](https://aws.amazon.com) for [AWS Polly](https://aws.amazon.com/polly/)
* [Google Cloud Platform](https://cloud.google.com) for [GCP Text-to-Speech](https://cloud.google.com/text-to-speech/)

[![Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/tts-cli)](https://snyk.io/vuln/npm:tts-cli)
[![Build Status](https://img.shields.io/travis/eheikes/tts)](https://travis-ci.org/github/eheikes/tts)
[![Dependencies](https://img.shields.io/david/eheikes/tts)](https://david-dm.org/eheikes/tts)
[![Coverage](https://img.shields.io/codecov/c/gh/eheikes/tts?token=9bd5731ce1a34766bdf3d780a648fa05)](https://codecov.io/gh/eheikes/tts)
[![License](https://img.shields.io/github/license/eheikes/tts)](https://github.com/eheikes/tts/blob/master/LICENSE.txt)
        
## Contributing

Pull requests and suggestions are welcome. [Create a new issue](https://github.com/eheikes/tts/issues/new) to report a bug or suggest a new feature.

Development commands:

```
npx lerna bootstrap   # download the project dependencies
lerna run lint        # lint code
lerna run test        # run tests
```
