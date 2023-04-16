export type Weights = {
	type: "none" | "single" | "multi" | "weighted";
	weights: Map<string, number>;
	canCopyAudio: boolean;
};

export function parseWeightsArray(weightsArray: number[] | undefined): Weights {
	if (!weightsArray) {
		weightsArray = [1];
	}

	const nonzeroWeights = new Map(Object.entries(weightsArray).filter(([, weight]) => weight !== 0));
	if (nonzeroWeights.size === 0) {
		return { type: "none", weights: new Map(), canCopyAudio: false };
	}
	if (nonzeroWeights.size === 1) {
		return {
			type: "single",
			weights: nonzeroWeights,
			canCopyAudio: true,
		};
	}

	const firstWeight = nonzeroWeights.values().next().value;
	const allSame = [...nonzeroWeights.values()].every((weight) => weight === firstWeight);

	if (allSame) {
		return {
			type: "multi",
			weights: nonzeroWeights,
			canCopyAudio: false,
		};
	} else {
		return {
			type: "weighted",
			weights: nonzeroWeights,
			canCopyAudio: false,
		};
	}
}
