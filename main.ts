import { Flags, parseFlags } from "./parseFlags.ts";
import { getVideoData, trim } from "./ffwrapper.ts";
import { FFTrimError } from "./error.ts";
import { parseWeightsArray } from "./weights.ts";

let flags: Flags;
try {
	flags = parseFlags();
} catch (err) {
	if (err instanceof FFTrimError) {
		console.log(
			`usage: ddmpeg -i <input> -o <output> [-t <[start]:[end]>] [-ts <size>] [-d] [-as <weights>]`,
		);
		console.error("caused by: " + err);
		Deno.exit(1);
	} else {
		throw err;
	}
}
let {
	start,
	end,
	size,
	inputFile,
	outputFile,
	mergeWeights,
} = flags;

const videoData = await getVideoData(inputFile);
const audioStreams = videoData.streams.filter((stream) => stream.type === "audio");

// set defaults for start/end
if (start === undefined) {
	start = 0;
}
if (end === undefined) {
	end = videoData.durationSeconds;
}

// parse audio weights
if (mergeWeights) {
	for (let i = mergeWeights.length; i < audioStreams.length; i++) {
		mergeWeights[i] = 1;
	}
}
const audioWeights = parseWeightsArray(mergeWeights);

const duration = end - start;

const copyAudio = audioWeights.canCopyAudio;

// trim the video (async)
const progress = trim({
	start,
	end,
	bitrate: size ? size / duration : undefined,
	inputFile,
	outputFile,
	audioWeights,
	copyAudio,
});

// print out progress on the trimming
const encoder = new TextEncoder();
for await (const secondsDone of progress) {
	const percent = secondsDone / duration;
	Deno.stdout.writeSync(
		encoder.encode(
			`\r${progressBar(30, percent)} (${(percent * 100).toFixed(1)}%)`,
		),
	);
}

// write a newline
Deno.stdout.writeSync(new Uint8Array([10]));

// ======== UTILITY FUNCTIONS =========

// simple progress bar
function progressBar(width: number, percent: number) {
	percent = Math.max(0, Math.min(percent, 1));

	const equalsSigns = Math.floor((width - 2) * percent);
	const spaces = Math.ceil((width - 2) * (1 - percent));

	return `[${"=".repeat(equalsSigns)}${" ".repeat(spaces)}]`;
}
