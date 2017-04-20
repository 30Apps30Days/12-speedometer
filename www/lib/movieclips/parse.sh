#!/usr/bin/env bash
set -uo pipefail
IFS=$'\n\t'


parse() {
  avconv -i $1.mp4 -ss "$2" -t "$3" -y -strict -2 "DONE-$1.mp4"
}

# parse f-77xulkB_U "00:00:53.5" "00:00:03.5" # 1.21 Jigowatts!
# parse f-77xulkB_U "00:00:57.4" "00:00:02.5" # (whisper)
# parse f-77xulkB_U "00:01:10.5" "00:00:02.4" # (question)
# parse f-77xulkB_U "00:01:56.4" "00:00:03" # (bolt)

# parse fCjsUxbNmIs "00:01:50.2" "00:00:05.5" # Roads?
