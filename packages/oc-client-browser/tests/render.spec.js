/* globals window */
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : render", () => {
	test.beforeEach(async ({ page }) => {
		// Set up the test environment with compiled views
		await page.evaluate(() => {
			// Store compiled views
			window.handlebars3CompiledView =
				'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccf"]={compiler:[6,">= 2.0.0-beta.1"],main:function(){return"Hello world!"},useData:!0};';
			window.handlebarsCompiledView =
				'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccf"]={compiler:[7,">= 4.0.0"],main:function(){return"Hello world!"},useData:!0};';
			window.emojiCompiledView =
				'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccc"]=function(){return "😎";};';
			window.jadeCompiledView =
				'oc.components=oc.components||{},oc.components["09227309bca0b1ec1866c547ebb76c74921e85d2"]=function(n){var e,o=[],c=n||{};return function(n){o.push("<span>hello "+jade.escape(null==(e=n)?"":e)+"</span>")}.call(this,"name"in c?c.name:"undefined"!=typeof name?name:void 0),o.join("")};';

			// Store original functions to restore later
			window.originalLjsLoad = ljs.load;
			window.originalHandlebars = window.Handlebars;
			window.originalJade = window.jade;
			window.originalConsoleLog = console.log;
		});
	});

	test.afterEach(async ({ page }) => {
		// Clean up after each test
		await page.evaluate(() => {
			// Restore original functions
			ljs.load = window.originalLjsLoad;
			window.Handlebars = window.originalHandlebars;
			window.jade = window.originalJade;
			console.log = window.originalConsoleLog;

			// Clean up oc state
			delete oc.components;

			// Clean up test variables
			delete window.handlebars3CompiledView;
			delete window.handlebarsCompiledView;
			delete window.emojiCompiledView;
			delete window.jadeCompiledView;
			delete window.originalLjsLoad;
			delete window.originalHandlebars;
			delete window.originalJade;
			delete window.originalConsoleLog;
		});
	});

	test("should error when rendering unavailable component", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Mock ljs.load to simulate failure
				ljs.load = (url, cb) => {
					cb();
				};

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.123/template.js",
						type: "handlebars",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccf",
					},
					{},
					(error, html) => {
						resolve({ error, html });
					},
				);
			});
		});

		// Verify the error
		expect(result.error).toBe(
			"Error getting compiled view: https://my-cdn.com/components/a-component/1.2.123/template.js",
		);
	});

	test("should load Handlebars runtime when not available and render component", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Track loaded URLs
				const loadedUrls = [];

				// Store original Handlebars
				const originalHandlebars = window.Handlebars;

				// Remove Handlebars to simulate it not being loaded
				window.Handlebars = undefined;

				// Mock ljs.load to simulate loading Handlebars
				ljs.load = (url, cb) => {
					loadedUrls.push(url);
					// Restore Handlebars
					window.Handlebars = originalHandlebars;
					cb();
				};

				// Register the component
				eval(window.handlebarsCompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.123/template.js",
						type: "handlebars",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccf",
					},
					{},
					(error, html) => {
						resolve({ error, html, loadedUrls });
					},
				);
			});
		});

		// Verify the results
		expect(result.loadedUrls[0]).toBe(
			"https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.runtime.min.js",
		);
		expect(result.error).toBeNull();
		expect(result.html).toBe("Hello world!");
	});

	test("should render handlebars component when runtime already loaded", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Track if ljs.load was called
				let ljsLoadCalled = false;

				// Mock ljs.load
				ljs.load = () => {
					ljsLoadCalled = true;
				};

				// Register the component
				eval(window.handlebarsCompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.123/template.js",
						type: "handlebars",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccf",
					},
					{},
					(error, html) => {
						resolve({ error, html, ljsLoadCalled });
					},
				);
			});
		});

		// Verify the results
		expect(result.ljsLoadCalled).toBe(false);
		expect(result.error).toBeNull();
		expect(result.html).toBe("Hello world!");
	});

	test("should render empty component when __oc_emptyResponse is true", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Register the component
				eval(window.handlebarsCompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.123/template.js",
						type: "handlebars",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccf",
					},
					{ __oc_emptyResponse: true },
					(error, html) => {
						resolve({ error, html });
					},
				);
			});
		});

		// Verify the results
		expect(result.error).toBeNull();
		expect(result.html).toBe("");
	});

	test("should error when rendering handlebars3 component with newer runtime", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Suppress console.log
				console.log = () => {};

				// Register the component
				eval(window.handlebars3CompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.123/template.js",
						type: "handlebars",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccf",
					},
					{},
					(error, html) => {
						resolve({ error, html });
					},
				);
			});
		});

		// Verify the error
		expect(result.error).toContain(
			"Template was precompiled with an older version of Handlebars than the current runtime",
		);
	});

	test("should load jade runtime when not available and render component", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Track loaded URLs
				const loadedUrls = [];

				// Store original jade
				const originalJade = window.jade;

				// Remove jade to simulate it not being loaded
				window.jade = undefined;

				// Mock ljs.load to simulate loading jade
				ljs.load = (url, cb) => {
					loadedUrls.push(url);
					// Restore jade
					window.jade = originalJade;
					cb();
				};

				// Register the component
				eval(window.jadeCompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.456/template.js",
						type: "jade",
						key: "09227309bca0b1ec1866c547ebb76c74921e85d2",
					},
					{ name: "Michael" },
					(error, html) => {
						resolve({ error, html, loadedUrls });
					},
				);
			});
		});

		// Verify the results
		expect(result.loadedUrls[0]).toBe(
			"https://cdnjs.cloudflare.com/ajax/libs/jade/1.11.0/runtime.min.js",
		);
		expect(result.error).toBeNull();
		expect(result.html).toBe("<span>hello Michael</span>");
	});

	test("should render jade component when runtime already loaded", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Track if ljs.load was called
				let ljsLoadCalled = false;

				// Mock ljs.load
				ljs.load = () => {
					ljsLoadCalled = true;
				};

				// Register the component
				eval(window.jadeCompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.456/template.js",
						type: "jade",
						key: "09227309bca0b1ec1866c547ebb76c74921e85d2",
					},
					{ name: "James" },
					(error, html) => {
						resolve({ error, html, ljsLoadCalled });
					},
				);
			});
		});

		// Verify the results
		expect(result.ljsLoadCalled).toBe(false);
		expect(result.error).toBeNull();
		expect(result.html).toBe("<span>hello James</span>");
	});

	test("should error when rendering unsupported component", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Register the component
				eval(window.jadeCompiledView);

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.789/template.js",
						type: "hello!",
						key: "123456789123456789123456789126456789",
					},
					{ param: "blabla" },
					(error, html) => {
						resolve({ error, html });
					},
				);
			});
		});

		// Verify the error
		expect(result.error).toBe(
			'Error loading component: view engine "hello!" not supported',
		);
	});

	test("should support registering new templates and render them", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				// Track loaded URLs and order
				const loadedUrls = [];
				const loadOrder = [];

				// Mock ljs.load to track loading
				ljs.load = (url, cb) => {
					loadedUrls.push(url);
					loadOrder.push(loadedUrls.length - 1);
					cb();
				};

				// Register the component
				eval(window.emojiCompiledView);

				// Register new template type
				oc.registerTemplates({
					type: "emoji",
					externals: [
						{
							global: "jEmoji",
							url: "http://cdn.staticfile.org/emoji/0.2.2/emoji.js",
						},
						{
							global: "jEmojiDOM",
							url: "http://cdn.staticfile.org/emoji/0.2.2/emojiDOM.js",
						},
					],
				});

				// Call the function being tested
				oc.render(
					{
						src: "https://my-cdn.com/components/a-component/1.2.456/template.js",
						type: "emoji",
						key: "46ee85c314b371cac60471cef5b2e2e6c443dccc",
					},
					{},
					(error, html) => {
						resolve({ error, html, loadedUrls, loadOrder });
					},
				);
			});
		});

		// Verify the results
		expect(result.loadedUrls[0]).toBe(
			"http://cdn.staticfile.org/emoji/0.2.2/emoji.js",
		);
		expect(result.loadedUrls[1]).toBe(
			"http://cdn.staticfile.org/emoji/0.2.2/emojiDOM.js",
		);
		expect(result.loadOrder[0]).toBeLessThan(result.loadOrder[1]); // First URL loaded before second
		expect(result.error).toBeNull();
		expect(result.html).toBe("😎");
	});
});
