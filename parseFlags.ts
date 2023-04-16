import { parse } from "https://deno.land/std/flags/mod.ts";
import { FFTrimError } from "./error.ts";
import { hmsRangeToSeconds } from "./timeFormats.ts";

export type Flags = {
	start: number | undefined;
	end: number | undefined;
	size: number | undefined;
	mergeWeights: number[] | undefined;
	inputFile: string;
	outputFile: string;
};

export function parseFlags(): Flags {
	const {
		trim: trimRaw,
		size: sizeRaw,
		inputFile,
		outputFile,
		merge = "",
	} = parseFlagsRaw();

	const [start, end] = trimRaw === undefined ? [undefined, undefined] : hmsRangeToSeconds(trimRaw);
	const audioWeightsParsed = merge === "" ? undefined : parseAudioWeights(merge);
	const size = sizeRaw ? shortFormToBytes(sizeRaw) : undefined;

	if (inputFile === undefined) {
		throw new FFTrimError("input file is required (-i)");
	}
	if (outputFile === undefined) {
		throw new FFTrimError("output file is required (-o)");
	}

	return {
		start,
		end,
		size,
		inputFile,
		outputFile,
		mergeWeights: audioWeightsParsed,
	};
}

function shortFormToBytes(shortForm: string): number {
	const lastChar = shortForm.charAt(shortForm.length - 1).toLocaleLowerCase();

	// if the last character is a number, it's likely bytes
	if (!isNaN(parseFloat(lastChar))) {
		const num = parseInt(shortForm, 10);
		if (isNaN(num)) {
			throw new FFTrimError("invalid number: " + shortForm);
		}
		return num;
	}

	const shortFormNumPart = shortForm.substring(0, shortForm.length - 1);
	const num = parseInt(shortFormNumPart, 10);
	if (isNaN(num)) {
		throw new FFTrimError("invalid number: " + shortFormNumPart);
	}

	switch (lastChar) {
		case "b":
			return num;
		case "k":
			return num * 1_000;
		case "m":
			return num * 1_000_000;
		case "g":
			return num * 1_000_000_000;
		default:
			throw new FFTrimError(
				`invalid unit: ${lastChar} (must be one of {b,k,m,g})`,
			);
	}
}

function parseAudioWeights(weights: string): number[] {
	try {
		return weights.split(",").map((str) => {
			const i = parseInt(str);
			if (isNaN(i)) {
				throw new FFTrimError("audio weights must be in the form w1,w2,w3...");
			}
			return i;
		});
	} catch (e) {
		throw new FFTrimError("audio weights must be in the form w1,w2,w3...");
	}
}

// returns the raw, unormalized form of all of the flags
function parseFlagsRaw() {
	const flags = parse(Deno.args, {
		string: [
			"trim",
			"t",
			"input",
			"i",
			"output",
			"o",
			"size",
			"s",
			"merge",
			"m",
		],
		boolean: [
			"dampen",
			"d",
		],
	});

	return {
		trim: flags.trim ?? flags.t,
		size: flags.size ?? flags.s,
		inputFile: flags.input ?? flags.i ?? flags._[0],
		outputFile: flags.output ?? flags.o,
		merge: flags.merge ?? flags.m,
		dampenAudio: flags.dampen || flags.d,
	};
}
