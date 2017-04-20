#!/usr/bin/env bash
set -uo pipefail
IFS=$'\n\t'

youtube-dl -f mp4 --audio-format mp3 -o "%(id)s.%(ext)s" \
  https://www.youtube.com/watch?v=fCjsUxbNmIs \
  https://www.youtube.com/watch?v=f-77xulkB_U
