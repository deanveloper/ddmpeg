# fftrim

a personal project to make an ffmpeg wrapper that trims videos

### usage

| flag | description | usage |
| ----- | ----- | ----- |
| `start` or `s` | specify start time in video | `-s 2m40.3s` (2 minutes, 40.3 seconds) |
| `end` or `e` | specify end time in video | `-e 2h45m29s` (2 hours, 45 minutes, 29 seconds) |
| `targetsize` or `ts` | specify target size of video | `-t 4m` (4 MB) |
| `input` or `i` | specify input file | `-i infile.mp4` |
| `output` or `o` | specify output file | `-o outfile.mp4` |
| `dampen` or `d` | specify if you want loud things to be quieter | `-d` (include to dampen audio) |

### installation (from source)

1. install [deno](https://deno.land/#installation)
2. clone this repo
   1. https: `git clone https://github.com/deanveloper/fftrim`
   2. ssh: `git@github.com:deanveloper/fftrim.git`
3. `deno compile --allow-read --allow-run main.ts`
4. `cp` the newly created binary somewhere in your PATH (ie `/usr/local/bin` on *nix)
