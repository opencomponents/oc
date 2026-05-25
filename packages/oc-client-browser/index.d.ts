type Callback<T> = (err: NodeJS.ErrnoException | null, data: T) => void;

interface External {
	global?: string | string[];
	url: string;
}
interface ExtendedExternal extends External {
	name: string;
	devUrl?: string;
}

interface TemplateRenderer {
	getInfo: () => {
		externals: ExtendedExternal[];
		type: string;
		version: string;
	};
}

type Template = {
	externals: External[];
};
interface CompileOptions {
	templates?: Record<string, Template> | TemplateRenderer[];
	imports?: Record<string, string>;
	retryInterval?: number;
	retryLimit?: number;
	disableLoader?: boolean;
	disableLegacyTemplates?: boolean;
	externals?: External[];
}
type Compiled = { code: string; map: string; dev: string };

declare const ocClient: {
	compile: (options?: CompileOptions) => Promise<Compiled>;
	compileSync: (options?: CompileOptions) => Compiled;
	getLib: {
		(cb: Callback<string>): void;
		(): Promise<string>;
	};
	getLibs: {
		(cb: Callback<{ dev: string; prod: string }>): void;
		(): Promise<{ dev: string; prod: string }>;
	};
	getMap: {
		(cb: Callback<string>): void;
		(): Promise<string>;
	};
	version: string;
};

export = ocClient;
