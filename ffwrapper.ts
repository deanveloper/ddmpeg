import { readLines, readStringDelim } from "https://deno.land/std/io/mod.ts";
import { readAll } from "https://deno.land/std/streams/mod.ts";
import { clockToSeconds } from "./timeFormats.ts";

export type VideoData = {
	durationSeconds: number;
	streams: Stream[];
};
export type Stream = {
	type: "video" | "audio";
	codec: string;
};

export type TrimArgs = {
	start: number | undefined;
	end: number | undefined;
	bitrate: number | undefined;
	inputFile: string;
	outputFile: string;
	audioWeights: number[];
	dampenAudio: boolean;
};

export async function getVideoData(file: string): Promise<VideoData> {
	// deno-fmt-ignore
	const p = Deno.run({
		cmd: [
			"ffprobe",
			file,
			"-v", "error",
			"-print_format", "json",
			"-show_streams"
		],
		stdout: "piped",
		stderr: "null",
	});

	const output = JSON.parse(new TextDecoder().decode(await readAll(p.stdout)));
	const videoData = {
		durationSeconds: Number(output.format.duration),
		streams: output.streams.map((stream: any) => ({
			type: stream.codec_type,
			codec: stream.codec_name,
		})),
	};
	if (!validateVideoData(videoData)) {
		throw new Error(`invalid video data: ${videoData}`);
	}
	return videoData;
}

export async function* trim(options: TrimArgs): AsyncGenerator<number> {
	const {
		start,
		end,
		bitrate,
		inputFile,
		audioWeights,
		outputFile,
		dampenAudio,
	} = options;

	const startArgs = start ? ["-ss", start.toString(10)] : [];
	const endArgs = end ? ["-to", end.toString(10)] : [];
	const bitrateArgs = bitrate ? ["-b:v", bitrate.toString(10)] : [];
	const dampenArgs = dampenAudio ? ["-af", "loudnorm"] : [];
	const audioWeightsArgs = parseAudioWeightsArgs(audioWeights);

	const p = Deno.run({
		cmd: [
			"ffmpeg",

			"-i",
			inputFile,
			...startArgs,
			...endArgs,
			...dampenArgs,
			...bitrateArgs,
			...audioWeightsArgs,
			"-loglevel",
			"level+info",
			"-y",
			outputFile,
		],
		stdout: "null",
		stderr: "piped",
	});

	yield* readProgressUpdates(p.stderr);
}

// returns an async generator that yields the number of seconds that the encoder has currently encoded.
async function* readProgressUpdates(
	stderr: Deno.Reader,
): AsyncGenerator<number> {
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

function parseAudioWeightsArgs(audioWeights: number[]): string[] {
	// if all weights are equal
	if (audioWeights.every((item) => audioWeights.indexOf(item) === 0)) {
		let str = "";
		let weights = "";
		for (const i in audioWeights) {
			str += `[0:a:${i}]`;
		}
	}

	const firstWeight = audioWeights.length ? audioWeights[0] : 0;
	let hasDifferentWeights = false;
	let str = "";
	for (const i in audioWeights) {
		str += `[0:a:${i}]`;
		if (audioWeights[i] !== firstWeight) {
			hasDifferentWeights = true;
		}
	}
	str += `amix=${audioWeights.length}:longest`;
	if (hasDifferentWeights) {
		str += `:weights=${audioWeights.join(" ")}`;
	}
	str += "[aout]";

	// deno-fmt-ignore
	return [
		"-filter_complex", str,
		"-map", "0:V:0",
		"-map", "[aout]",
	];
}

function validateVideoData(data: any): data is VideoData {
	if (!data || typeof data !== "object") {
		return false;
	}
	if (typeof data.durationSeconds !== "number") {
		return false;
	}
	if (isNaN(data.durationSeconds)) {
		return false;
	}

	for (const stream of data?.streams) {
		if (!stream || typeof stream !== "object") {
			return false;
		}
		if (stream.type !== "video" || stream.type !== "audio") {
			return false;
		}
		if (typeof stream.codec !== "string") {
			return false;
		}
	}

	return true;
}
