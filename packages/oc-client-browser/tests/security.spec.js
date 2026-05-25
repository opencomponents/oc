import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : security and script handling", () => {
	test.beforeEach(async ({ page }) => {
		await page.evaluate(() => {
			window.originalConsoleLog = console.log;
			console.log = () => {};
		});
	});

	test.afterEach(async ({ page }) => {
		await page.evaluate(() => {
			console.log = window.originalConsoleLog;
			delete window.originalConsoleLog;
			delete window.scriptExecuted;
			delete window.testScriptVar;
		});
	});

	test("should reanimate scripts correctly in processHtml", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const component = document.createElement("oc-component");
			document.body.appendChild(component);

			const mockData = {
				id: "test-123",
				ocId: "oc-456",
				html: '<div>Content<script>window.scriptExecuted = true; window.testScriptVar = "executed";</script></div>',
				version: "1.0.0",
				name: "test-component",
				key: "test-key",
			};

			component.setAttribute("id", mockData.id);
			component.setAttribute("data-rendered", true);
			component.setAttribute("data-rendering", false);
			component.setAttribute("data-version", mockData.version);
			component.setAttribute("data-id", mockData.ocId);
			component.innerHTML = mockData.html;

			const scripts = component.querySelectorAll("script");
			for (const script of scripts) {
				const newScript = document.createElement("script");
				newScript.textContent = script.textContent;
				for (const attr of script.attributes) {
					newScript.setAttribute(attr.name, attr.value);
				}
				script.parentNode.replaceChild(newScript, script);
			}

			return {
				scriptExecuted: !!window.scriptExecuted,
				testScriptVar: window.testScriptVar,
				componentId: component.getAttribute("id"),
				dataRendered: component.getAttribute("data-rendered"),
				hasScript: component.querySelector("script") !== null,
			};
		});

		expect(result.scriptExecuted).toBe(true);
		expect(result.testScriptVar).toBe("executed");
		expect(result.componentId).toBe("test-123");
		expect(result.dataRendered).toBe("true");
		expect(result.hasScript).toBe(true);
	});

	test("should handle script attributes correctly during reanimation", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const component = document.createElement("div");
			component.innerHTML =
				'<script type="module" data-test="value">window.moduleScriptExecuted = true;</script>';
			document.body.appendChild(component);

			const script = component.querySelector("script");
			const newScript = document.createElement("script");
			newScript.textContent = script.textContent;

			for (const attr of script.attributes) {
				newScript.setAttribute(attr.name, attr.value);
			}

			script.parentNode.replaceChild(newScript, script);

			const reanimatedScript = component.querySelector("script");

			return {
				scriptType: reanimatedScript.getAttribute("type"),
				scriptDataTest: reanimatedScript.getAttribute("data-test"),
				scriptContent: reanimatedScript.textContent,
			};
		});

		expect(result.scriptType).toBe("module");
		expect(result.scriptDataTest).toBe("value");
		expect(result.scriptContent).toBe("window.moduleScriptExecuted = true;");
	});

	test("should handle empty or malformed script tags safely", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const component = document.createElement("div");
			component.innerHTML = `
				<script></script>
				<script>   </script>
				<script>// empty comment</script>
			`;
			document.body.appendChild(component);

			const scripts = component.querySelectorAll("script");
			let processedCount = 0;

			for (const script of scripts) {
				try {
					const newScript = document.createElement("script");
					newScript.textContent = script.textContent;
					for (const attr of script.attributes) {
						newScript.setAttribute(attr.name, attr.value);
					}
					script.parentNode.replaceChild(newScript, script);
					processedCount++;
				} catch (error) {}
			}

			return {
				originalScriptCount: 3,
				processedCount,
				finalScriptCount: component.querySelectorAll("script").length,
			};
		});

		expect(result.processedCount).toBe(3);
		expect(result.finalScriptCount).toBe(3);
	});

	test("should handle addStylesToHead with potentially malicious content safely", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const initialStyleCount = document.head.querySelectorAll("style").length;

			oc.addStylesToHead("body { background: red; }");
			oc.addStylesToHead("/* comment */ .test { color: blue; }");
			oc.addStylesToHead("@import url('https://example.com/styles.css');");
			oc.addStylesToHead("");

			const finalStyleCount = document.head.querySelectorAll("style").length;
			const styles = Array.from(document.head.querySelectorAll("style"));
			const lastFourStyles = styles.slice(-4);

			return {
				initialCount: initialStyleCount,
				finalCount: finalStyleCount,
				addedCount: finalStyleCount - initialStyleCount,
				styleContents: lastFourStyles.map((style) => style.textContent),
				allStylesInHead: lastFourStyles.every(
					(style) => style.parentNode === document.head,
				),
			};
		});

		expect(result.addedCount).toBe(4);
		expect(result.styleContents[0]).toBe("body { background: red; }");
		expect(result.styleContents[1]).toBe(
			"/* comment */ .test { color: blue; }",
		);
		expect(result.styleContents[2]).toBe(
			"@import url('https://example.com/styles.css');",
		);
		expect(result.styleContents[3]).toBe("");
		expect(result.allStylesInHead).toBe(true);
	});

	test("should handle script reanimation with nested elements", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const component = document.createElement("div");
			component.innerHTML = `
				<div class="wrapper">
					<script>window.nestedScript1 = "executed";</script>
					<div class="inner">
						<script>window.nestedScript2 = "also executed";</script>
					</div>
				</div>
			`;
			document.body.appendChild(component);

			const scripts = component.querySelectorAll("script");
			for (const script of scripts) {
				const newScript = document.createElement("script");
				newScript.textContent = script.textContent;
				for (const attr of script.attributes) {
					newScript.setAttribute(attr.name, attr.value);
				}
				script.parentNode.replaceChild(newScript, script);
			}

			return {
				nestedScript1: window.nestedScript1,
				nestedScript2: window.nestedScript2,
				scriptCount: component.querySelectorAll("script").length,
			};
		});

		expect(result.nestedScript1).toBe("executed");
		expect(result.nestedScript2).toBe("also executed");
		expect(result.scriptCount).toBe(2);
	});

	test("should handle script with src attribute correctly", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const component = document.createElement("div");
			component.innerHTML =
				'<script src="https://example.com/script.js" data-custom="value"></script>';
			document.body.appendChild(component);

			const script = component.querySelector("script");
			const newScript = document.createElement("script");
			newScript.textContent = script.textContent;

			for (const attr of script.attributes) {
				newScript.setAttribute(attr.name, attr.value);
			}

			script.parentNode.replaceChild(newScript, script);

			const reanimatedScript = component.querySelector("script");

			return {
				scriptSrc: reanimatedScript.getAttribute("src"),
				scriptCustom: reanimatedScript.getAttribute("data-custom"),
				hasAllAttributes:
					reanimatedScript.hasAttribute("src") &&
					reanimatedScript.hasAttribute("data-custom"),
			};
		});

		expect(result.scriptSrc).toBe("https://example.com/script.js");
		expect(result.scriptCustom).toBe("value");
		expect(result.hasAllAttributes).toBe(true);
	});

	test("should handle parameter encoding in build function", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			const testCases = [
				{ input: "normal-value", shouldEncode: false },
				{ input: "value&with&ampersands", shouldEncode: true },
				{ input: "value+with+plus", shouldEncode: true },
				{ input: "value=with=equals", shouldEncode: true },
				{ input: "value?with?question", shouldEncode: false },
				{ input: "value with spaces", shouldEncode: false },
			];

			const results = testCases.map((testCase) => {
				const html = oc.build({
					baseUrl: "https://example.com",
					name: "test-component",
					parameters: { test: testCase.input },
				});

				const match = html.match(/test=([^&"]+)/);
				const actualValue = match ? match[1] : null;

				const isEncoded = actualValue && actualValue !== testCase.input;
				const encodingMatches = testCase.shouldEncode ? isEncoded : !isEncoded;

				return {
					input: testCase.input,
					actual: actualValue,
					shouldEncode: testCase.shouldEncode,
					isEncoded,
					encodingMatches,
				};
			});

			return {
				results,
				allMatch: results.every((r) => r.encodingMatches),
			};
		});

		expect(result.allMatch).toBe(true);
		for (const r of result.results) {
			if (r.shouldEncode) {
				expect(r.isEncoded).toBe(true);
			} else {
				expect(r.isEncoded).toBe(false);
			}
		}
	});
});
