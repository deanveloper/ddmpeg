# ddmpeg

a personal project to make an ffmpeg wrapper that trims videos, sets target file size

## usage

`ddmpeg -i <input> -o <output> [-r <range>] [-s <size>] [-m <1[,...]>] [-d]`

| flag            | description                                                                                        | usage            |
| --------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| `input` or `i`  | specify input file                                                                                 | `-i infile.mp4`  |
| `output` or `o` | specify output file                                                                                | `-o outfile.mp4` |
| `trim` or `t`   | specify trim range. must contain a dash, remove one argument to specify the start/end of the video | `-r 2m40s:3m`    |
| `size` or `s`   | specify target size of video                                                                       | `-t 4m` (4 MB)   |
| `dampen` or `d` | a bit of a misnomer, specifies if you want loud things to be quieter                               | `-d`             |
| `merge` or `m`  | merge audio tracks into one track, can optionally specify weights for each track                   | `-m` or `-m 2,3` |

## examples

#### trim a video

- Trim video to only include 3min to 3min 30sec
  - `ddmpeg -i in.mp4 -o out.mp4 -r 3m:3m30s`
- Trim video to include everything after 4mins 34.3secs
  - `ddmpeg -i in.mp4 -o out.mp4 -r 4m34.3s:`
- Trim video to only include the first 30 seconds
  - `ddmpeg -i in.mp4 -o out.mp4 -r :30s`

#### audio stuff

- Merge audio tracks with equal weights
  - `ddmpeg -i in.mp4 -o out.mp4 -m 1`
- Merge audio tracks, with the second track being louder than the first
  - `ddmpeg -i in.mp4 -o out.mp4 -m 1,5`
- Suitable for sharing clips but you don't want to break people's headphones with your screaming
  - `ddmpeg -i in.mp4 -o out.mp4 -d` (dampens loud noises)

#### set target size

- Try to shoot for a 30MB video
  - `ddmpeg -i in.mp4 -o out.mp4 -s 30m`

#### putting it all together

- Share your Valorant clip!
  - Your clipping software captures 5 minutes, but you only want the last 30 seconds.
  - The first audio stream has your desktop sounds, and the second audio stream has your microphone sounds.
  - Your microphone was pretty loud, so you want to make sure that has less weight when we mix the streams.
  - You're going to share this on Discord, so you can't let it go over 100MB
    - `ddmpeg -i in.mp4 -o out.mp4 -t 4m30s: -m 3,1 -s 75m`

## installation (from source)

1. install [deno](https://deno.land/#installation)
2. clone this repo
   1. https: `git clone https://github.com/deanveloper/ddmpeg`
   2. ssh: `git@github.com:deanveloper/ddmpeg.git`
3. `deno compile --allow-read --allow-run main.ts`
4. `cp` the newly created binary somewhere in your PATH (ie `/usr/local/bin` on *nix)
