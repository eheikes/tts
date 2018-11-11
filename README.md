# Text-To-Speech CLI

Command-line tool to convert a text file of any size to speech using [AWS Polly](https://aws.amazon.com/polly/) or [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech/).

![Animation of the tool in action](docs/tts-cli.gif)

## Requirements / Installation

* [Node.js/npm](https://nodejs.org) v6+
* [ffmpeg](https://ffmpeg.org/)
* An Amazon Web Services (AWS) or Google Cloud Platform (GCP) account

You can then install the package globally:

```
$ npm install tts-cli -g
```

You'll also need to set up your computer:

* AWS Polly: [Get your AWS access keys](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-your-credentials.html) and [configure your machine with your credentials](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html).
* Google Cloud Text-to-Speech: [Create and set up a Cloud Platform account](https://cloud.google.com/nodejs/docs/reference/text-to-speech/latest/#quickstart) and [download your credentials file](https://cloud.google.com/docs/authentication/production#obtaining_and_providing_service_account_credentials_manually).

## Usage

```
$ tts [inputfile] outputfile [options]
```

Example:

```
# Using a text file as the input, changing the default voice, and specifying the AWS keys.
$ tts test.txt test.mp3 --voice Brian --access-key ABCDEFG --secret-key hwl500CZygitV91n

# Using Google Cloud Text-to-Speech.
$ tts test.txt test.mp3 --service gcp --language en-US

# Passing a string of text as the input.
$ echo "Hello world! How are you?" | tts test.mp3
```

Standard arguments:

* `inputfile` is the text file you want to convert to speech. It should be encoded as UTF-8. If excluded, tts-cli will read in the text from `stdin`.
* `outfile` is the filename to save the audio to.

Service options:

* `--access-key KEY` -- AWS access key ID
* `--email EMAIL` -- GCP client email address (required if `private-key` or `private-key-file` is used)
* `--private-key KEY` -- GCP private key
* `--private-key-file FILE` -- GCP private key file (`.pem` or `.p12` file)
* `--project-file FILE` -- GCP `.json` file with project info
* `--project-id ID` -- GCP project ID (e.g. `grape-spaceship-123`)
* `--secret-key KEY` -- AWS secret access key
* `--service TYPE` -- Cloud service to use (`aws` or `gcp`) (default `aws`)
* `--throttle SIZE` -- Number of simultaneous requests allowed against the API (default `5`)

Audio options:

* `--effects ID` -- Apply an audio effect profile. Can be specified multiple times.
* `--ffmpeg BINARY` -- Path to the ffmpeg binary (defaults to the one in PATH)
* `--format FORMAT` -- Target audio format (`mp3`, `ogg`, or `pcm`) (default `mp3`)
* `--gain GAIN` -- Volume gain, where `0.0` is normal gain
* `--gender GENDER` -- Gender of the voice (`male`, `female`, or `neutral`)
* `--language LANG` -- Code for the desired language (default `en-US` for GCP, no default for AWS)
* `--lexicon NAME` -- Apply a stored pronunciation lexicon. Can be specified multiple times.
* `--pitch PITCH` -- Change in speaking pich, in semitones
* `--speed RATE` -- Speaking rate, where `1.0` is normal speed
* `--region REGION` -- AWS region to send requests to (default `us-east-1`)
* `--sample-rate RATE` -- Audio frequency, in hertz. See the [API docs](http://docs.aws.amazon.com/polly/latest/dg/API_SynthesizeSpeech.html#polly-SynthesizeSpeech-request-SampleRate) for valid values.
* `--type TYPE` -- Type of input text (`text` or `ssml`) (default `text`)
* `--voice VOICE` -- Voice to use for the speech (default `Joanna` for AWS).

Note that not all services support all options. For example, AWS Polly does not understand the `speed` option.

## What It Does

* Splits the text into the maximum size allowed by the API (1500 characters for AWS, 5000 characters for Google Cloud).
* Compresses the white space inside the text to minimize the cost.
* Uses your credentials in `~/.aws/credentials` (AWS) or the `GOOGLE_APPLICATION_CREDENTIALS` (Google Cloud) file.
* Calls the API (in a throttled manner) to get each text part converted to audio.
* Combines the audio together into a single file.

## Troubleshooting

* Make sure Node.js is working. Running `node --version` on the command line should give a version of v6.0.0 or higher.
* Make sure ffmpeg is installed. Running `ffmpeg -version` on the command line should give you the version information.
* Make sure you can connect to AWS or Google Cloud normally.
  * Going to https://polly.us-east-1.amazonaws.com/v1/speech (or whatever AWS region you're using) should give you a "Missing Authentication Token" message. You can use the [AWS CLI tool](https://aws.amazon.com/cli/) to check your configuration -- installing that and running `aws sts get-caller-identity` should return your user info.
* Run `export DEBUG=*` first (Linux or Mac) to turn on debugging output. On Windows you'll need to use `set DEBUG=*` (command prompt) or `$env:DEBUG = "*"` (PowerShell).

## Contributing

Pull requests and suggestions are welcome. [Create a new issue](https://github.com/eheikes/tts-cli/issues/new) to report a bug or suggest a new feature.

Please add tests and maintain the existing styling when adding and updating the code. Run `npm run lint` to lint the code.

## Small Print

Copyright 2017 Eric Heikes.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

This project is not affiliated with Amazon or Google.
