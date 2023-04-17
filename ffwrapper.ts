import { readStringDelim } from "https://deno.land/std/io/mod.ts";
import { readAll } from "https://deno.land/std/streams/mod.ts";
import { clockToSeconds } from "./timeFormats.ts";
import { Weights } from "./weights.ts";

export type VideoData = {
	durationSeconds: number;
	streams: Stream[];
};
export type Stream = {
	index: number;
	type: "video" | "audio";
	codec: string;
};

export type TrimArgs = {
	start: number | undefined;
	end: number | undefined;
	bitrate: number | undefined;
	inputFile: string;
	outputFile: string;
	audioWeights?: Weights;
	copyAudio: boolean;
};

export async function getVideoData(file: string): Promise<VideoData> {
	// deno-fmt-ignore
	const p = Deno.run({
		cmd: [
			"ffprobe",
			file,
			"-v", "error",
			"-print_format", "json",
			"-show_streams", "-show_format"
		],
		stdout: "piped",
		stderr: "null",
	});

	const output = JSON.parse(new TextDecoder().decode(await readAll(p.stdout)));
	const videoData = {
		durationSeconds: Number(output.format.duration),
		streams: output.streams.map((stream: any) => ({
			index: stream.index,
			type: stream.codec_type,
			codec: stream.codec_name,
		})),
	};
	if (!validateVideoData(videoData)) {
		throw new Error(`invalid video data: ${JSON.stringify(videoData)}`);
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
		copyAudio,
	} = options;

	const startArgs = start ? ["-ss", start.toString(10)] : [];
	const endArgs = end ? ["-to", end.toString(10)] : [];
	const bitrateArgs = bitrate ? ["-b:v", bitrate.toString(10)] : [];
	const audioWeightsArgs = audioWeights ? parseAudioWeightsArgs(audioWeights) : [];
	const copyAudioArgs = copyAudio ? ["-c:a", "copy"] : [];

	const cmd = [
		"ffmpeg",

		"-i",
		inputFile,
		...startArgs,
		...endArgs,
		...bitrateArgs,
		...audioWeightsArgs,
		...copyAudioArgs,
		"-loglevel",
		"level+info",
		"-y",
		outputFile,
	];

	console.log(cmd.map((s) => `"${s}"`).join(" "));

	const p = Deno.run({
		cmd,
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

// audioTracks:
// represents which weights go to which tracks
function parseAudioWeightsArgs(audioWeights: Weights): string[] {
	// if empty, we remove all audio tracks
	if (audioWeights.type === "none") {
		return [
			"-map",
			"0",
			"-map",
			"0:a",
		];
	}

	if (audioWeights.type === "single") {
		return [
			"-map",
			"0:v:0",
			"-map",
			`0:a:${audioWeights.weights.keys().next().value}`,
		];
	}

	if (audioWeights.type === "multi") {
		// deno-fmt-ignore
		return [
			"-filter_complex", amix(audioWeights.weights, false),
			"-map", "0:V:0",
			"-map", "[aout]",
		];
	}

	// if (audioWeights.type === 'weighted') ...
	// deno-fmt-ignore
	return [
		"-filter_complex", amix(audioWeights.weights, true),
		"-map", "0:V:0",
		"-map", "[aout]",
	];
}

// takes weights, returns amix filter
function amix(weights: Map<string, number>, useWeights: boolean): string {
	let amix = "";
	for (const track of weights.keys()) {
		amix += `[0:a:${track}]`;
	}

	amix += `amix=inputs=${weights.size}:duration=longest`;

	if (useWeights) {
		amix += `:weights=${[...weights.values()].join(" ")}`;
	}
	amix += "[aout]";

	return amix;
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
		if (typeof stream.index !== "number") {
			return false;
		}
		if (stream.type !== "video" && stream.type !== "audio") {
			return false;
		}
		if (typeof stream.codec !== "string") {
			return false;
		}
	}

	return true;
}
