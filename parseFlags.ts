
import { parse } from "https://deno.land/std/flags/mod.ts";
import { FFTrimError } from "./error.ts";
import { hmsToSeconds } from "./timeFormats.ts";

export type Flags = {
	start: number|undefined,
	end: number|undefined,
	targetSize: number|undefined,
	inputFile: string,
	outputFile: string,
	dampenAudio: boolean
}

export function parseFlags(): Flags {
	const {
		start: startRaw,
		end: endRaw,
		targetSize: targetSizeRaw,
		inputFile,
		outputFile,
		dampenAudio,
	} = parseFlagsRaw();

	const start = startRaw ? hmsToSeconds(startRaw) : undefined;
	const end = endRaw ? hmsToSeconds(endRaw) : undefined;
	const targetSize = targetSizeRaw ? shortFormToBytes(targetSizeRaw) : undefined;
	if (inputFile === undefined) {
		throw new FFTrimError("input file is required (-i)");
	}
	if (outputFile === undefined) {
		throw new FFTrimError("output file is required (-o)");
	}
	
	return {
		start,
		end,
		targetSize,
		inputFile,
		outputFile,
		dampenAudio,
	}
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
		case 'b':
			return num;
		case 'k':
			return num * 1_000;
		case 'm':
			return num * 1_000_000;
		case 'g':
			return num * 1_000_000_000;
		default:
			throw new FFTrimError(`invalid unit: ${lastChar} (must be one of {b,k,m,g})`);
	}
}

// returns the raw, unormalized form of all of the flags
function parseFlagsRaw() {
	const flags = parse(Deno.args, {
		string: [
			"start", "s",
			"end", "e",
			"input", "i",
			"output", "o",
			"targetsize", "ts"
		],
		boolean: [
			"dampen", "d"
		]
	});
	
	return {
		start: flags.start ?? flags.s,
		end: flags.end ?? flags.e,
		targetSize: flags.targetsize ?? flags.ts,
		inputFile: flags.input ?? flags.i ?? flags._[0],
		outputFile: flags.output ?? flags.o,
		dampenAudio: flags.dampen || flags.d,
	}

}
