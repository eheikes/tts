#!/bin/sh
echo "Running fake ffmpeg with \"$*\""

# Make sure the output file exists.
for last; do true; done # set $last to the last argument
touch "$last"
