import { readFileSync } from "node:fs";
import { watch } from "node:fs/promises";
import path from "node:path";
import { parseArgs, styleText } from "node:util";
import { compileSync } from "./tasks/compile.js";

const ac = new AbortController();
const { signal } = ac;

// const initialSize = 10403;

function getSize() {
	const { code } = compileSync();
	return code.length;
}

function humanReadableSize(size) {
	const absSize = Math.abs(size);
	if (absSize > 1024) {
		return `${(size / 1024).toFixed(2)} KB`;
	}
	if (absSize >= 1) {
		return `${size} B`;
	}
	return "";
}

const originalSize = readFileSync("./dist/oc-client.min.js").length;
function getDiff(compareTo) {
	const newSize = getSize();
	const diff = newSize - compareTo;
	const result = diff > 0 ? "bigger" : diff < 0 ? "smaller" : "same";
	const humanReadable = humanReadableSize(diff);

	return { result, diff, humanReadable };
}

function getText(initial) {
	const { result, humanReadable } = getDiff(originalSize);
	let text = "";
	if (result === "same") {
		text = "No changes";
	} else if (result === "bigger") {
		text = styleText("red", `Current size increased by ${humanReadable}`);
	} else {
		text = styleText("green", `Current size decreased by ${humanReadable}`);
	}

	if (initial) {
		text += `\nTotal reduction: ${getDiff(initial).humanReadable}`;
	}

	return text;
}

async function program(options) {
	if (options.watch) {
		try {
			const watcher = watch(path.join(process.cwd(), "src/oc-client.js"), {
				signal,
			});
			for await (const event of watcher) {
				if (event.eventType === "change") {
					const text = getText(options.initial);
					console.clear();
					console.log(text);
				}
			}
		} catch (err) {
			if (err.name === "AbortError") return;
			throw err;
		}
	} else {
		console.log(getText());
	}
}

const options = parseArgs({
	args: process.argv.slice(2),
	options: {
		watch: {
			type: "boolean",
			default: false,
			short: "w",
		},
		initial: {
			type: "string",
			short: "i",
		},
	},
});

program(options.values);
