// parses a hms range (ie 5h2m20.5s-5m2m30s) to a pair of seconds (ie [18140.5, 18150])
export function hmsRangeToSeconds(range: string): [number?, number?] {
	const split = range.split(":");
	if (split.length !== 2) {
		throw new Error(`invalid time range format ${range}, should be "XhYmZs:XhYmZs"`);
	}
	const [start, end] = (
		split.map((time) => time.trim())
			.map((time) => time === "" ? undefined : hmsToSeconds(time))
	);
	return [start, end];
}

// parses a clock time (ie "05:20:20.5") to a number of seconds (ie 18140.5)
export function clockToSeconds(time: string): number {
	let [hours, minutes, seconds] = time.split(":").map((str) => parseFloat(str));

	return hours * 60 * 60 + minutes * 60 + seconds;
}

// parses an hms time (ie "5h2m20.5s") to a number of seconds (ie 18140.5)
export function hmsToSeconds(time: string): number {
	let hourStr = "";
	let minuteStr = "";
	let secondStr = "";

	let currentNumber = "";

	for (const c of time) {
		const cCode = c.charCodeAt(0);
		const isNumber = cCode >= "0".charCodeAt(0) && cCode <= "9".charCodeAt(0);
		if (isNumber || c === ".") {
			currentNumber += c;
		} else {
			switch (c) {
				case "h":
					hourStr = currentNumber;
					break;
				case "m":
					minuteStr = currentNumber;
					break;
				case "s":
					secondStr = currentNumber;
					break;
				default:
					throw new Error("unexpected timestamp unit: " + c);
			}
			currentNumber = "";
		}
	}

	let [hours, minutes, seconds] = [hourStr, minuteStr, secondStr]
		.map((str) => str || "0")
		.map((str) => parseFloat(str));

	return hours * 60 * 60 + minutes * 60 + seconds;
}
