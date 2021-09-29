interface External {
  global: string;
  name: string;
  url: string;
}

interface Template {
  type: string;
  version: string;
  externals: External[];
}

interface Author {
  name?: string;
  email?: string;
  url?: string;
}

interface ComponentList {
  author: Author;
  name: string;
  state: string;
}

interface ComponentHistory {
  name: string;
  publishDate: string;
  version: string;
}

interface OcParameter {
  description: string;
  example: string;
  mandatory: boolean;
  type: string;
}

interface OcConfiguration {
  date: number;
  files: {
    dataProvider: {
      hashKey: string;
      src: string;
      type: string;
    };
    static: string[];
    template: {
      hashKey: string;
      src: string;
      type: string;
      version: string;
    };
  };
  packaged: boolean;
  parameters: Record<string, OcParameter>;
  stringifiedDate: string;
  version: string;
}

interface Component {
  allVersions: string[];
  author: Author;
  dependencies: Record<string, string>;
  description: string;
  devDependencies: Record<string, string>;
  name: string;
  oc: OcConfiguration;
  scripts: Record<string, string>;
  version: string;
}

export interface VM {
  availablePlugins: Record<string, Function>;
  availableDependencies: Array<{
    core: boolean;
    name: string;
    version: string;
    link: string;
  }>;
  components: Component[];
  componentsHistory: ComponentHistory[];
  componentsList: ComponentList[];
  componentsReleases: number;
  href: string;
  ocVersion: string;
  q: string;
  stateCounts: {
    deprecated?: number;
    experimental?: number;
  };
  templates: Template[];
  title: string;
  type: 'oc-registry' | 'oc-registry-local';
}
