
import { Flags, parseFlags } from "./parseFlags.ts";
import { trim, getDuration } from "./ffwrapper.ts";
import { FFTrimError } from "./error.ts";

let flags: Flags;
try {
	flags = parseFlags();
} catch (err) {
	if (err instanceof FFTrimError) {
		console.log(`usage: fftrim -i <input> -o <output> [-s <start>] [-e <end>] [-ts <size>] [-d]`);
		Deno.exit(1);
	} else {
		throw err;
	}
}
let {
	start,
	end,
	targetSize,
	inputFile,
	outputFile,
	dampenAudio
} = flags;

// set defaults for start/end
if (start === undefined) {
	start = 0;
}
if (end === undefined) {
	end = await getDuration(inputFile);
}
const duration = end-start;

// trim the video (async)
const progress = trim({
	start,
	end,
	bitrate: targetSize ? targetSize / duration : undefined,
	inputFile,
	outputFile,
	dampenAudio
});

// print out progress on the trimming
const encoder = new TextEncoder();
for await (const secondsDone of progress) {
	const percent = secondsDone / duration;
	Deno.stdout.writeSync(encoder.encode(`\r${progressBar(30, percent)} (${(percent*100).toFixed(1)}%)`));
}

// write a newline
Deno.stdout.writeSync(new Uint8Array([10]));


// ======== UTILITY FUNCTIONS =========

// simple progress bar
function progressBar(width: number, percent: number) {
	percent = Math.max(0, Math.min(percent, 1));

	const equalsSigns = Math.floor((width-2) * percent);
	const spaces = Math.ceil((width-2) * (1-percent));

	return `[${"=".repeat(equalsSigns)}${" ".repeat(spaces)}]`;
}
