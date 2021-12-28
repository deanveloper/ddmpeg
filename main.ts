
import { parseFlags } from "./parseFlags.ts";
import { trim, getDuration } from "./ffwrapper.ts";

// === MAIN PART ===

let flags = parseFlags();
let {
	start,
	end,
	targetSize,
	inputFile,
	outputFile,
	dampenAudio
} = flags;

if (start === undefined) {
	start = 0;
}
if (end === undefined) {
	end = await getDuration(outputFile);
}
const duration = end-start;

const progress = trim({
	start,
	end,
	bitrate: targetSize ? targetSize / duration : undefined,
	inputFile,
	outputFile,
	dampenAudio
});

const encoder = new TextEncoder();
for await (const secondsDone of progress) {
	const percent = secondsDone / duration;
	Deno.stdout.writeSync(encoder.encode(`\r${progressBar(30, percent)} (${(percent*100).toFixed(1)}%)`));
}

// simple progress bar
function progressBar(width: number, percent: number) {
	percent = Math.max(0, Math.min(percent, 1));

	const equalsSigns = Math.floor((width-2) * percent);
	const spaces = Math.ceil((width-2) * (1-percent));

	return `[${"=".repeat(equalsSigns)}${" ".repeat(spaces)}]`;
}
