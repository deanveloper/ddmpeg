import { readLines, readStringDelim, readableStreamFromReader } from "https://deno.land/std/io/mod.ts";
import { clockToSeconds } from './timeFormats.ts';

export type TrimArgs = {
	start: number|undefined,
	end: number|undefined,
	bitrate: number|undefined,
	inputFile: string,
	outputFile: string,
	dampenAudio: boolean
}

export async function getDuration(file: string): Promise<number> {
	const p = Deno.run({
		cmd: [
			"ffmpeg",
	
			"-i", file,
			"-loglevel", "level+info"
		],
		stdout: "null",
		stderr: "piped",
	});
	return await readDurations(p.stderr);
}

export async function* trim(options: TrimArgs): AsyncGenerator<number> {
	const { start, end, bitrate, inputFile, outputFile, dampenAudio } = options;

	const startArgs = start ? ["-ss", start.toString(10)] : [];
	const endArgs = end ? ["-to", end.toString(10)] : [];
	const bitrateArgs = bitrate ? ["-b:v", bitrate.toString(10)]: [];
	const dampenArgs = dampenAudio ? ["-af", "loudnorm"] : [];

	const p = Deno.run({
		cmd: [
			"ffmpeg",
	
			"-i", inputFile,
			...startArgs,
			...endArgs,
			...dampenArgs,
			...bitrateArgs,
			"-loglevel", "level+info",
			"-y",
			outputFile
		],
		stdout: "null",
		stderr: "piped",
	});

	yield* readProgressUpdates(p.stderr);
}


// reads all durations of input files and returns the combined duration.
async function readDurations(stderr: Deno.Reader): Promise<number> {

	const stopReadingLine = "[info] Stream mapping:";
	const durationRegex = /Duration: ([0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{2,}))/
	let duration = 0;
	for await (const line of readLines(stderr)) {
		if (line === stopReadingLine) {
			break;
		}
		const groups = durationRegex.exec(line);
		const result = groups?.pop() ?? [];
		if (result.length > 0) {
			duration += clockToSeconds(result[0]);
		}
	}

	return duration;
}
// returns an async generator that yields the number of seconds that the encoder has currently encoded.
async function* readProgressUpdates(stderr: Deno.Reader): AsyncGenerator<number> {
	const progressRegex = /time=([0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{2,}))/;

	let startedReading = false;
	for await (const progressUpdateLine of readStringDelim(stderr, "\r")) {
		const groups = progressRegex.exec(progressUpdateLine);
		const result = groups?.[1];

		if (startedReading && !result) {
			break;
		}
		if (result) {
			startedReading = true;
			yield clockToSeconds(result);
		}
	}
}