# AWS Text-To-Speech

Converts a text file of any size to speech using the AWS Polly API.

## Requirements / Installation

* [Node.js/npm](https://nodejs.org) v4+
* [ffmpeg](https://ffmpeg.org/)

You can then install the package globally:

```
$ npm install aws-tts -g
```

## Usage

```
$ tts.js inputfile outputfile [options]
```

Required arguments:

* `inputfile` should be the text file you want to convert to speech.
* `outfile` is the filename to save the audio to.

Options:

* `--format FORMAT` -- Target audio format (`mp3`, `ogg_vorbis`, or `pcm`) (default `mp3`)
* `--region REGION` -- AWS region to send requests to (default `us-east-1`)
* `--throttle SIZE` -- Number of simultaneous requests allowed against the AWS API (default `5`)
* `--voice VOICE` -- Voice to use for the speech (default `Joanna`)

## What It Does

* Splits the text into the maximum size allowed by the AWS API (1500 characters).
* Compresses the white space inside the text to minimize the AWS cost.
* Uses your AWS credentials in `.aws/credentials`.
* Calls the AWS API (in a throttled manner) to get each text part converted to audio.
* Combines the audio together into a single file.
