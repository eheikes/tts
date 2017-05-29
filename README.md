# AWS Text-To-Speech

Command-line tool to convert a text file of any size to speech using the AWS Polly API.

![Animation of the tool in action](docs/aws-tts.gif)

## Requirements / Installation

* [Node.js/npm](https://nodejs.org) v6+
* [ffmpeg](https://ffmpeg.org/)
* An Amazon/AWS account

You can then install the package globally:

```
$ npm install aws-tts -g
```

You'll also need to [get your AWS access keys](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-your-credentials.html) and [configure your machine with your credentials](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html).

## Usage

```
$ aws-tts inputfile outputfile [options]
```

Required arguments:

* `inputfile` should be the text file you want to convert to speech.
* `outfile` is the filename to save the audio to.

Options:

* `--access-key KEY` -- AWS access key ID
* `--ffmpeg BINARY` -- Path to the ffmpeg binary (defaults to the one in PATH)
* `--format FORMAT` -- Target audio format (`mp3`, `ogg_vorbis`, or `pcm`) (default `mp3`)
* `--region REGION` -- AWS region to send requests to (default `us-east-1`)
* `--sample-rate RATE` -- Audio frequency, in hertz. See the [API docs](http://docs.aws.amazon.com/polly/latest/dg/API_SynthesizeSpeech.html#polly-SynthesizeSpeech-request-SampleRate) for valid values.
* `--secret-key KEY` -- AWS secret access key
* `--throttle SIZE` -- Number of simultaneous requests allowed against the AWS API (default `5`)
* `--voice VOICE` -- Voice to use for the speech (default `Joanna`). See the [API docs](http://docs.aws.amazon.com/polly/latest/dg/API_SynthesizeSpeech.html#polly-SynthesizeSpeech-request-VoiceId) for the full list of voices. You can also [test out the voices](https://console.aws.amazon.com/polly/home/SynthesizeSpeech) in the AWS console.

## What It Does

* Splits the text into the maximum size allowed by the AWS API (1500 characters).
* Compresses the white space inside the text to minimize the AWS cost.
* Uses your AWS credentials in `~/.aws/credentials`.
* Calls the AWS API (in a throttled manner) to get each text part converted to audio.
* Combines the audio together into a single file.

## Contributing

Pull requests and suggestions are welcome. [Create a new issue](https://github.com/eheikes/aws-tts/issues/new) to report a bug or suggest a new feature.

Please add tests and maintain the existing styling when adding and updating the code. Run `npm run lint` to lint the code.

## Small Print

Copyright 2017 Eric Heikes.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

This project is not affiliated with Amazon.
