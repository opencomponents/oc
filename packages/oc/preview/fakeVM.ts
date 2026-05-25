import type { ComponentHistory } from '../src/registry/routes/helpers/get-components-history';
import type { Vm as InfoVm } from '../src/registry/views/info';
import type { VM as IndexVm } from '../src/types';

export const mockComponentHistory: ComponentHistory[] = [
  {
    name: 'my-component',
    version: '1.0.0',
    publishDate: new Date().toISOString(),
    templateSize: 1000
  },
  {
    name: 'my-component',
    version: '1.0.1',
    publishDate: new Date().toISOString(),
    templateSize: 1000
  },
  {
    name: 'my-component',
    version: '1.0.2',
    publishDate: new Date().toISOString(),
    templateSize: 1200
  },
  {
    name: 'my-component',
    version: '1.1.0',
    publishDate: new Date().toISOString(),
    templateSize: 1150
  },
  {
    name: 'my-component',
    version: '1.1.1',
    publishDate: new Date().toISOString(),
    templateSize: 1300
  },
  {
    name: 'my-component',
    version: '1.2.0',
    publishDate: new Date().toISOString(),
    templateSize: 1250
  },
  {
    name: 'my-component',
    version: '1.2.1',
    publishDate: new Date().toISOString(),
    templateSize: 1400
  },
  {
    name: 'my-component',
    version: '1.3.0',
    publishDate: new Date().toISOString(),
    templateSize: 1350
  },
  {
    name: 'my-component',
    version: '2.0.0',
    publishDate: new Date().toISOString(),
    templateSize: 1500
  },
  {
    name: 'my-component',
    version: '2.0.1',
    publishDate: new Date().toISOString(),
    templateSize: 1450
  },
  {
    name: 'my-component',
    version: '2.1.0',
    publishDate: new Date().toISOString(),
    templateSize: 1600
  },
  {
    name: 'my-component',
    version: '2.1.1',
    publishDate: new Date().toISOString(),
    templateSize: 1550
  }
];

// Mock data for Index VM (main registry page)
export const mockIndexVM: IndexVm = {
  robots: true,
  availableDependencies: [
    {
      core: true,
      name: 'react',
      version: '18.2.0',
      link: 'https://www.npmjs.com/package/react'
    },
    {
      core: true,
      name: 'lodash',
      version: '4.17.21',
      link: 'https://www.npmjs.com/package/lodash'
    },
    {
      core: false,
      name: 'moment',
      version: '2.29.4',
      link: 'https://www.npmjs.com/package/moment'
    },
    {
      core: false,
      name: 'axios',
      version: '1.6.0',
      link: 'https://www.npmjs.com/package/axios'
    }
  ],
  availablePlugins: {
    'oc-plugin-sass': {
      handler: () => {},
      description: 'Sass/SCSS compilation plugin for OpenComponents',
      context: false
    },
    'oc-plugin-typescript': {
      handler: () => {},
      description: 'TypeScript compilation plugin for OpenComponents',
      context: true
    },
    'oc-plugin-babel': {
      handler: () => {},
      description: 'Babel transpilation plugin for modern JavaScript',
      context: false
    }
  },
  components: [
    {
      name: 'header-component',
      version: '2.1.0',
      allVersions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'],
      description: 'A responsive header component with navigation and branding',
      keywords: ['header', 'navigation', 'responsive', 'branding'],
      author: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        url: 'https://github.com/johndoe'
      },
      license: 'MIT',
      homepage: 'https://github.com/johndoe/header-component',
      repository: {
        type: 'git',
        url: 'git+https://github.com/johndoe/header-component.git'
      },
      bugs: {
        url: 'https://github.com/johndoe/header-component/issues'
      },
      oc: {
        date: 1704067200000, // 2024-01-01
        files: {
          dataProvider: {
            hashKey: 'abc123def456',
            src: 'server.js',
            type: 'node.js',
            size: 2048
          },
          static: ['styles.css', 'logo.png'],
          template: {
            hashKey: 'def456ghi789',
            src: 'template.js',
            type: 'jade',
            version: '1.11.0',
            minOcVersion: '0.44.0',
            size: 1536
          }
        },
        packaged: true,
        parameters: {
          title: {
            type: 'string',
            description: 'The main title displayed in the header',
            example: 'My Awesome App',
            mandatory: true
          },
          showLogo: {
            type: 'boolean',
            description: 'Whether to display the logo',
            default: true,
            example: true
          },
          navigationItems: {
            type: 'string',
            description: 'JSON string of navigation items',
            example:
              '[{"label":"Home","url":"/"},{"label":"About","url":"/about"}]'
          },
          theme: {
            type: 'string',
            description: 'Color theme for the header',
            enum: ['light', 'dark', 'auto'],
            default: 'light'
          }
        },
        plugins: ['oc-plugin-sass'],
        renderInfo: true,
        state: 'experimental',
        stringifiedDate: '2024-01-01T00:00:00.000Z',
        publisher: 'johndoe',
        version: '2.1.0'
      }
    },
    {
      name: 'product-card',
      version: '1.5.2',
      allVersions: [
        '1.0.0',
        '1.1.0',
        '1.2.0',
        '1.3.0',
        '1.4.0',
        '1.5.0',
        '1.5.1',
        '1.5.2'
      ],
      description:
        'A flexible product card component for e-commerce applications',
      keywords: ['product', 'card', 'ecommerce', 'shopping'],
      author: {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        url: 'https://github.com/janesmith'
      },
      license: 'Apache-2.0',
      homepage: 'https://company.com/components/product-card',
      repository: {
        type: 'git',
        url: 'git+https://github.com/company/product-card.git'
      },
      oc: {
        date: 1706745600000, // 2024-02-01
        files: {
          dataProvider: {
            hashKey: 'ghi789jkl012',
            src: 'server.js',
            type: 'node.js',
            size: 3072
          },
          static: ['product-card.css', 'placeholder.svg'],
          template: {
            hashKey: 'jkl012mno345',
            src: 'template.js',
            type: 'handlebars',
            version: '4.7.8',
            minOcVersion: '0.45.0',
            size: 2560
          }
        },
        packaged: true,
        parameters: {
          productId: {
            type: 'string',
            description: 'Unique identifier for the product',
            example: 'PROD-12345',
            mandatory: true
          },
          showPrice: {
            type: 'boolean',
            description: 'Whether to display the product price',
            default: true
          },
          showRating: {
            type: 'boolean',
            description: 'Whether to display the product rating',
            default: true
          },
          layout: {
            type: 'string',
            description: 'Card layout style',
            enum: ['vertical', 'horizontal', 'compact'],
            default: 'vertical'
          },
          maxWidth: {
            type: 'number',
            description: 'Maximum width of the card in pixels',
            default: 300,
            example: 350
          }
        },
        plugins: ['oc-plugin-typescript', 'oc-plugin-sass'],
        renderInfo: true,
        stringifiedDate: '2024-02-01T00:00:00.000Z',
        publisher: 'janesmith',
        version: '1.5.2'
      }
    },
    {
      name: 'footer-component',
      version: '1.0.0',
      allVersions: ['1.0.0'],
      description:
        'A simple footer component with links and copyright information',
      keywords: ['footer', 'links', 'copyright'],
      author: {
        name: 'Bob Wilson',
        email: 'bob.wilson@example.org'
      },
      license: 'MIT',
      oc: {
        date: 1709424000000, // 2024-03-01
        files: {
          dataProvider: {
            hashKey: 'mno345pqr678',
            src: 'server.js',
            type: 'node.js',
            size: 1024
          },
          static: ['footer.css'],
          template: {
            hashKey: 'pqr678stu901',
            src: 'template.js',
            type: 'jade',
            version: '1.11.0',
            size: 768
          }
        },
        packaged: true,
        parameters: {
          companyName: {
            type: 'string',
            description: 'Name of the company',
            example: 'Acme Corp',
            mandatory: true
          },
          year: {
            type: 'number',
            description: 'Copyright year',
            default: 2024
          },
          links: {
            type: 'string',
            description: 'JSON string of footer links',
            example:
              '[{"text":"Privacy Policy","url":"/privacy"},{"text":"Terms","url":"/terms"}]'
          }
        },
        renderInfo: false,
        state: 'deprecated',
        stringifiedDate: '2024-03-01T00:00:00.000Z',
        publisher: 'bobwilson',
        version: '1.0.0'
      }
    }
  ],
  componentsList: [
    {
      author: { name: 'John Doe', email: 'john.doe@example.com' },
      name: 'header-component',
      state: 'experimental'
    },
    {
      author: { name: 'Jane Smith', email: 'jane.smith@company.com' },
      name: 'product-card',
      state: 'stable'
    },
    {
      author: { name: 'Bob Wilson', email: 'bob.wilson@example.org' },
      name: 'footer-component',
      state: 'deprecated'
    }
  ],
  componentsReleases: 12,
  href: '/',
  ocVersion: '0.45.2',
  q: '',
  stateCounts: {
    deprecated: 1,
    experimental: 1
  },
  templates: [
    {
      externals: [
        {
          name: 'react',
          global: 'React',
          url: 'https://unpkg.com/react@18/umd/react.production.min.js',
          devUrl: 'https://unpkg.com/react@18/umd/react.development.js'
        },
        {
          name: 'react-dom',
          global: 'ReactDOM',
          url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
          devUrl: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js'
        }
      ],
      type: 'react',
      version: '18.2.0'
    },
    {
      externals: [
        {
          name: 'handlebars',
          global: 'Handlebars',
          url: 'https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js'
        }
      ],
      type: 'handlebars',
      version: '4.7.8'
    },
    {
      externals: [],
      type: 'jade',
      version: '1.11.0'
    }
  ],
  title: 'OpenComponents Registry',
  theme: 'dark',
  type: 'oc-registry'
};

// Mock data for Info VM (component detail page)
export const mockInfoVM: InfoVm = {
  robots: true,
  parsedAuthor: {
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    url: 'https://github.com/janesmith'
  },
  component: {
    name: 'product-card',
    version: '1.5.2',
    allVersions: [
      '1.0.0',
      '1.1.0',
      '1.2.0',
      '1.3.0',
      '1.4.0',
      '1.5.0',
      '1.5.1',
      '1.5.2'
    ],
    description:
      'A flexible product card component for e-commerce applications with support for multiple layouts, ratings, and customizable styling. Perfect for product listings, search results, and recommendation sections.',
    keywords: [
      'product',
      'card',
      'ecommerce',
      'shopping',
      'responsive',
      'rating'
    ],
    author: {
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      url: 'https://github.com/janesmith'
    },
    license: 'Apache-2.0',
    homepage: 'https://company.com/components/product-card',
    repository: {
      type: 'git',
      url: 'git+https://github.com/company/product-card.git'
    },
    bugs: {
      url: 'https://github.com/company/product-card/issues'
    },
    engines: {
      node: '>=14.0.0'
    },
    oc: {
      date: 1706745600000, // 2024-02-01
      files: {
        dataProvider: {
          hashKey: 'ghi789jkl012',
          src: 'server.js',
          type: 'node.js',
          size: 3072
        },
        static: ['product-card.css', 'placeholder.svg', 'star-rating.svg'],
        template: {
          hashKey: 'jkl012mno345',
          src: 'template.js',
          type: 'handlebars',
          version: '4.7.8',
          minOcVersion: '0.45.0',
          size: 2560
        },
        imports: {
          'product-service': './services/product-service.js',
          'image-utils': './utils/image-utils.js'
        }
      },
      packaged: true,
      parameters: {
        productId: {
          type: 'string',
          description:
            'Unique identifier for the product. This is used to fetch product data from the API.',
          example: 'PROD-12345',
          mandatory: true
        },
        showPrice: {
          type: 'boolean',
          description:
            'Whether to display the product price. When false, the price section is hidden.',
          default: true,
          example: true
        },
        showRating: {
          type: 'boolean',
          description:
            'Whether to display the product rating stars and review count.',
          default: true,
          example: true
        },
        layout: {
          type: 'string',
          description:
            'Card layout style. Vertical shows image on top, horizontal shows image on the left, compact is a smaller version.',
          enum: ['vertical', 'horizontal', 'compact'],
          default: 'vertical',
          example: 'vertical'
        },
        maxWidth: {
          type: 'number',
          description:
            'Maximum width of the card in pixels. Useful for responsive layouts.',
          default: 300,
          example: 350
        },
        showAddToCart: {
          type: 'boolean',
          description: 'Whether to show the "Add to Cart" button',
          default: true,
          example: false
        },
        currency: {
          type: 'string',
          description: 'Currency code for price display',
          default: 'USD',
          example: 'EUR'
        },
        imageSize: {
          type: 'string',
          description: 'Size of the product image',
          enum: ['small', 'medium', 'large'],
          default: 'medium'
        }
      },
      plugins: ['oc-plugin-typescript', 'oc-plugin-sass'],
      renderInfo: true,
      stringifiedDate: '2024-02-01T00:00:00.000Z',
      publisher: 'janesmith',
      version: '1.5.2'
    }
  },
  componentDetail: {
    '1.0.0': {
      publishDate: 1704067200000, // 2024-01-01
      templateSize: 2048
    },
    '1.1.0': {
      publishDate: 1704153600000, // 2024-01-02
      templateSize: 2176
    },
    '1.2.0': {
      publishDate: 1704326400000, // 2024-01-04
      templateSize: 2304
    },
    '1.3.0': {
      publishDate: 1704499200000, // 2024-01-06
      templateSize: 2432
    },
    '1.4.0': {
      publishDate: 1704672000000, // 2024-01-08
      templateSize: 2560
    },
    '1.5.0': {
      publishDate: 1704844800000, // 2024-01-10
      templateSize: 2560
    },
    '1.5.1': {
      publishDate: 1704931200000, // 2024-01-11
      templateSize: 2560
    },
    '1.5.2': {
      publishDate: 1706745600000, // 2024-02-01
      templateSize: 2560
    }
  },
  dependencies: ['react', 'lodash', 'moment'],
  href: '/',
  sandBoxDefaultQs:
    '?productId=PROD-12345&showPrice=true&showRating=true&layout=vertical&maxWidth=300&showAddToCart=true&currency=USD&imageSize=medium',
  title: 'product-card - OpenComponents Registry',
  theme: 'dark',
  repositoryUrl: 'https://github.com/company/product-card'
};
