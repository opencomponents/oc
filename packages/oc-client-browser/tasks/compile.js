const path = require("node:path");
const esbuild = require("esbuild");
const uglifyJs = require("uglify-js");

const packageJson = require("../package");

const baseTemplates = {
	"oc-template-handlebars": {
		externals: [
			{
				global: "Handlebars",
				url: "https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.runtime.min.js",
			},
		],
	},
	"oc-template-jade": {
		externals: [
			{
				global: "jade",
				url: "https://cdnjs.cloudflare.com/ajax/libs/jade/1.11.0/runtime.min.js",
			},
		],
	},
	"oc-template-es6": { externals: [] },
};

function transformTemplates(templates = {}) {
	if (Array.isArray(templates)) {
		const templatesObj = {};
		for (const template of templates) {
			if (typeof template.getInfo !== "function") {
				throw new Error(
					`Template ${
						template.type || "unknown"
					} does not have a getInfo function`,
				);
			}
			const { externals, type } = template.getInfo();
			templatesObj[type] = { externals };
		}
		return templatesObj;
	}

	return templates;
}

function parseConf(conf) {
	const disableLegacyTemplates = Boolean(conf.disableLegacyTemplates ?? false);
	const transformedTemplates = transformTemplates(conf.templates);
	const templates = disableLegacyTemplates
		? {
				"oc-template-es6": baseTemplates["oc-template-es6"],
				...transformedTemplates,
			}
		: { ...baseTemplates, ...transformedTemplates };

	return {
		externals: conf.externals || [],
		imports: conf.imports || {},
		retryLimit: conf.retryLimit || 30,
		retryInterval: conf.retryInterval || 5000,
		disableLegacyTemplates: disableLegacyTemplates,
		disableLoader: Boolean(conf.disableLoader ?? false),
		templates,
	};
}

function getBuildOptions(conf = {}) {
	const version = packageJson.version;
	const licenseLink =
		"https://github.com/opencomponents/oc-client-browser/tree/master/LICENSES";
	const license = `/*! OpenComponents client v${version} | (c) 2015-${new Date().getFullYear()} OpenComponents community | ${licenseLink} */`;
	const parsedConf = parseConf(conf);

	return {
		entryPoints: [path.join(__dirname, "../src/index.js")],
		banner: {
			js: license,
		},
		outfile: path.join(__dirname, "../dist/oc-client.min.js"),
		define: {
			__REGISTERED_TEMPLATES_PLACEHOLDER__: JSON.stringify(
				parsedConf.templates,
			),
			__EXTERNALS__: JSON.stringify(parsedConf.externals),
			__IMPORTS__: JSON.stringify(parsedConf.imports),
			__DEFAULT_RETRY_LIMIT__: JSON.stringify(parsedConf.retryLimit),
			__DEFAULT_RETRY_INTERVAL__: JSON.stringify(parsedConf.retryInterval),
			__DEFAULT_DISABLE_LOADER__: JSON.stringify(parsedConf.disableLoader),
			__DISABLE_LEGACY_TEMPLATES__: JSON.stringify(
				parsedConf.disableLegacyTemplates,
			),
			__CLIENT_VERSION__: JSON.stringify(packageJson.version),
		},
		bundle: true,
		minify: false,
		write: false,
	};
}

function prepareCompiled(text) {
	const minified = uglifyJs.minify(text, {
		sourceMap: {
			filename: "oc-client.min.js",
			url: "oc-client.min.map",
		},
	});

	return {
		code: minified.code,
		map: minified.map,
		dev: text,
	};
}
function compileSync(conf = {}) {
	const result = esbuild.buildSync(getBuildOptions(conf));
	return prepareCompiled(result.outputFiles[0].text);
}

async function compile(conf = {}) {
	const result = await esbuild.build(getBuildOptions(conf));
	return prepareCompiled(result.outputFiles[0].text);
}

module.exports = {
	compile: compile,
	compileSync: compileSync,
};
