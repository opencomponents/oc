const fs = require("fs-extra");
const path = require("node:path");
const { compile } = require("./compile");

async function build() {
	const distPath = "../dist/";
	const compiled = await compile();

	await fs.ensureDir(path.join(__dirname, distPath));
	await fs.writeFile(
		path.join(__dirname, distPath, "oc-client.min.map"),
		compiled.map,
		"utf-8",
	);
	await fs.writeFile(
		path.join(__dirname, distPath, "oc-client.min.js"),
		compiled.code,
		"utf-8",
	);
	await fs.writeFile(
		path.join(__dirname, distPath, "oc-client.js"),
		compiled.dev,
		"utf-8",
	);
}

build().catch((err) => {
	console.error("Something went wrong:", err.message);
	process.exit(1);
});
