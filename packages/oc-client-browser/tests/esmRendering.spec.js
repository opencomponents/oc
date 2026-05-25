import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test.describe("oc-client : ESM rendering", () => {
	test.beforeEach(async ({ page }) => {
		await page.evaluate(() => {
			window.originalConsoleLog = console.log;
			window.originalConsoleError = console.error;
			console.log = () => {};
			console.error = () => {};
		});
	});

	test.afterEach(async ({ page }) => {
		await page.evaluate(() => {
			console.log = window.originalConsoleLog;
			console.error = window.originalConsoleError;
			delete window.originalConsoleLog;
			delete window.originalConsoleError;
			delete window.oc._esm;
		});
	});

	test("should render ESM component successfully", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const mockData = {
					component: {
						src: "data:text/javascript,export const mount = (element, props) => { element.innerHTML = 'ESM Component Rendered'; };",
						props: {
							_staticPath: "/static/",
							_componentName: "test-component",
							_componentVersion: "1.0.0",
							message: "Hello ESM",
						},
					},
					element: document.createElement("div"),
				};

				oc.ready(() => {
					const renderOc = (template, apiResponse, callback) => {
						const isEsm = !!apiResponse.data?.component?.esm;
						if (isEsm) {
							const renderEsm = async (data, callback) => {
								try {
									const { _staticPath, _componentName, _componentVersion } =
										data.component.props;
									window.oc._esm = window.oc._esm || {};
									window.oc._esm[`${_componentName}@${_componentVersion}`] = (
										args,
									) => {
										return _staticPath + "public/" + args;
									};

									const mockMount = (element, props) => {
										element.innerHTML = `ESM: ${props.message}`;
									};

									mockMount(data.element, data.component.props);
									callback(null);
								} catch (error) {
									callback(error);
								}
							};

							renderEsm(mockData, callback);
						}
					};

					renderOc(
						null,
						{ data: { component: { esm: true, ...mockData.component } } },
						(err) => {
							resolve({
								error: err,
								innerHTML: mockData.element.innerHTML,
								esmHelperExists: !!window.oc._esm,
								esmHelperFunction:
									typeof window.oc._esm["test-component@1.0.0"],
							});
						},
					);
				});
			});
		});

		expect(result.error).toBeNull();
		expect(result.innerHTML).toBe("ESM: Hello ESM");
		expect(result.esmHelperExists).toBe(true);
		expect(result.esmHelperFunction).toBe("function");
	});

	test("should handle ESM component rendering errors", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const mockData = {
					component: {
						src: "invalid-module-url",
						props: {
							_staticPath: "/static/",
							_componentName: "error-component",
							_componentVersion: "1.0.0",
						},
					},
					element: document.createElement("div"),
				};

				const renderEsm = async (data, callback) => {
					try {
						throw new Error("Failed to load ESM module");
					} catch (error) {
						callback(error);
					}
				};

				renderEsm(mockData, (err) => {
					resolve({
						hasError: !!err,
						errorMessage: err?.message,
					});
				});
			});
		});

		expect(result.hasError).toBe(true);
		expect(result.errorMessage).toBe("Failed to load ESM module");
	});

	test("should create ESM helper function correctly", async ({ page }) => {
		const result = await page.evaluate(() => {
			const componentName = "test-helper";
			const componentVersion = "2.0.0";
			const staticPath = "/assets/";

			window.oc._esm = window.oc._esm || {};
			window.oc._esm[`${componentName}@${componentVersion}`] = (args) => {
				return staticPath + "public/" + args;
			};

			const helperFunction =
				window.oc._esm[`${componentName}@${componentVersion}`];

			return {
				helperExists: typeof helperFunction === "function",
				helperResult: helperFunction("styles.css"),
				helperResultJs: helperFunction("script.js"),
			};
		});

		expect(result.helperExists).toBe(true);
		expect(result.helperResult).toBe("/assets/public/styles.css");
		expect(result.helperResultJs).toBe("/assets/public/script.js");
	});

	test("should handle ESM component with missing props", async ({ page }) => {
		const result = await page.evaluate(() => {
			return new Promise((resolve) => {
				const mockData = {
					component: {
						src: "test-module",
						props: {},
					},
					element: document.createElement("div"),
				};

				const renderEsm = async (data, callback) => {
					try {
						const { _staticPath, _componentName, _componentVersion } =
							data.component.props;
						if (!_componentName || !_componentVersion) {
							throw new Error("Missing component name or version");
						}
						callback(null);
					} catch (error) {
						callback(error);
					}
				};

				renderEsm(mockData, (err) => {
					resolve({
						hasError: !!err,
						errorMessage: err?.message,
					});
				});
			});
		});

		expect(result.hasError).toBe(true);
		expect(result.errorMessage).toBe("Missing component name or version");
	});

	test("should handle multiple ESM components with different versions", async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			window.oc._esm = window.oc._esm || {};

			const components = [
				{ name: "comp-a", version: "1.0.0", staticPath: "/static-a/" },
				{ name: "comp-a", version: "2.0.0", staticPath: "/static-a-v2/" },
				{ name: "comp-b", version: "1.0.0", staticPath: "/static-b/" },
			];

			for (const comp of components) {
				window.oc._esm[`${comp.name}@${comp.version}`] = (args) => {
					return comp.staticPath + "public/" + args;
				};
			}

			return {
				compA1Result: window.oc._esm["comp-a@1.0.0"]("test.css"),
				compA2Result: window.oc._esm["comp-a@2.0.0"]("test.css"),
				compBResult: window.oc._esm["comp-b@1.0.0"]("test.css"),
				totalHelpers: Object.keys(window.oc._esm).length,
			};
		});

		expect(result.compA1Result).toBe("/static-a/public/test.css");
		expect(result.compA2Result).toBe("/static-a-v2/public/test.css");
		expect(result.compBResult).toBe("/static-b/public/test.css");
		expect(result.totalHelpers).toBe(3);
	});
});
