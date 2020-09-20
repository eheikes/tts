
# Web TTS CLI

Command-line tool to convert webpages of any size to speech. Uses [`tts-cli`](../tts-cli) and an automated Chrome browser behind the scenes.

## Requirements / Installation

* [Node.js/npm](https://nodejs.org) v10+
* Please see the [`tts-cli` docs](../tts-cli) for installing and configuring the TTS tool.

You can then install the package globally:

```
$ npm install web-tts -g
```

## Usage

```
$ web-tts commandfile outputfile [options]
```

Examples:

```
# Reads commands from commands.txt and saves the speech in test.mp3
$ web-tts commands.txt test.mp3

# Sets the browser window to 3000 x 2000 pixels (default is 2000 x 1000)
$ web-tts commands.txt test.mp3 --width 3000 --height 2000

# Any additional options are passed to tts-cli as-is
$ web-tts commands.txt test.mp3 --engine neural
```

Standard arguments:

* `commandfile` is a file that describes how to crawl and scrape the webpages. See the [command file docs](docs/commandfile.md) for details.
* `outfile` is the filename to save the audio to.

Options:

* `--debug [true|false]` -- Shows debugging info: the browser console logs are printed, and the devtools are opened when not headless (default `false`)
* `--delay TIME` -- Amount of delay between executing browser commands (in milliseconds) (default `0`)
* `--headless [true|false]` -- Runs the browser hidden in the background (`true`, the default) or opens it up on the desktop (`false`)
* `--height SIZE` -- Height of the browser in pixels (default `2000`)
* `--width SIZE` -- Width of the browser in pixels (default `3000`)

See the [tts-cli docs](../tts-cli/docs/options.md) for text-to-speech options.

## Troubleshooting

* Run the tool with `--debug` to see the browser logs. (Note that there will likely be a lot of irrelevant logs included.)
* Run the tool with `--headless false` and, if needed, a delay (e.g. `--delay 250`) to get a visual of what's happening in the browser.

## Contributing

Although functional, this tool is still unfinished. Pull requests and suggestions are welcome. [Create a new issue](https://github.com/eheikes/tts/issues/new) to report a bug or suggest a new feature.

Please add tests and maintain the existing styling when adding and updating the code. Run `npm run lint` to lint the code.

## Small Print

Copyright 2020 Eric Heikes.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
