import path from 'path';

jest.mock('webpack');

const mockDefinePlugin = {};
const mockHotModuleReplacementPlugin = {};

let DefinePlugin;
let HotModuleReplacementPlugin;

let getWebpackConfig;

const cosmosConfigRelPath = './dummy-config/cosmos.config';
const cosmosConfigPath = require.resolve(cosmosConfigRelPath);

// So far we use the same user webpack mock between all tests
const userWebpackConfig = {
  module: {
    rules: [],
  },
  plugins: [
    // fake plugins, something to compare identity with
    {}, {},
  ],
};

// This changes between test cases
let mockCosmosConfig;
// This is the output that we test
let webpackConfig;

const resolveUserPath = relPath => path.join(path.dirname(cosmosConfigPath), relPath);

beforeEach(() => {
  // We want to change configs between test cases
  jest.resetModules();
  jest.resetAllMocks();

  // Mock user config
  jest.mock(cosmosConfigRelPath, () => mockCosmosConfig);

  DefinePlugin = jest.fn(() => mockDefinePlugin);
  HotModuleReplacementPlugin = jest.fn(() => mockHotModuleReplacementPlugin);

  require('webpack').__setPluginMock('DefinePlugin', DefinePlugin);
  require('webpack').__setPluginMock('HotModuleReplacementPlugin', HotModuleReplacementPlugin);

  getWebpackConfig = require('../webpack-config').default;
});

describe('without hmr', () => {
  beforeEach(() => {
    mockCosmosConfig = {
      componentPaths: ['src/components'],
      fixturePaths: ['test/fixtures'],
      ignore: [],
      globalImports: ['./global.css'],
    };
    webpackConfig = getWebpackConfig(userWebpackConfig, cosmosConfigPath);
  });

  test('keeps user rules', () => {
    expect(webpackConfig.rules).toBe(userWebpackConfig.rules);
  });

  test('adds resolved global imports to entries', () => {
    mockCosmosConfig.globalImports.forEach(globalImport => {
      expect(webpackConfig.entry).toContain(resolveUserPath(globalImport));
    });
  });

  test('adds cosmos entry', () => {
    const cosmosEntry = webpackConfig.entry[webpackConfig.entry.length - 1];
    expect(cosmosEntry).toBe(require.resolve('../entry'));
  });

  test('does not add hot middleware client to entries', () => {
    expect(webpackConfig.entry).not.toContain(
      `${require.resolve('webpack-hot-middleware/client')}?reload=true`,
    );
  });

  test('creates proper output', () => {
    expect(webpackConfig.output).toEqual({
      path: '/',
      filename: 'bundle.js',
      publicPath: '/loader/',
    });
  });

  test('keeps user plugins', () => {
    userWebpackConfig.plugins.forEach(plugin => {
      expect(webpackConfig.plugins).toContain(plugin);
    });
  });

  test('calls define plugin with user config path', () => {
    expect(DefinePlugin.mock.calls[0][0]).toEqual({
      COSMOS_CONFIG_PATH: JSON.stringify(cosmosConfigPath),
    });
  });

  test('adds DefinePlugin', () => {
    expect(webpackConfig.plugins).toContain(mockDefinePlugin);
  });

  test('adds module loader', () => {
    expect(webpackConfig.module.rules[webpackConfig.module.rules.length - 1]).toEqual({
      loader: require.resolve('../module-loader'),
      include: require.resolve('../user-modules'),
      query: {
        cosmosConfigPath,
      },
    });
  });
});

// Hmr setting affects entries, so only entry-related are duplicated here
describe('with hmr', () => {
  beforeEach(() => {
    mockCosmosConfig = {
      componentPaths: ['src/components'],
      fixturePaths: ['test/fixtures'],
      ignore: [],
      globalImports: ['./global.css'],
      hot: true,
    };
    webpackConfig = getWebpackConfig(userWebpackConfig, cosmosConfigPath);
  });

  test('adds resolved global imports to entries', () => {
    mockCosmosConfig.globalImports.forEach(globalImport => {
      expect(webpackConfig.entry).toContain(resolveUserPath(globalImport));
    });
  });

  test('adds cosmos entry', () => {
    test('adds cosmos entry', () => {
      const cosmosEntry = webpackConfig.entry[webpackConfig.entry.length - 1];
      expect(cosmosEntry).toBe(require.resolve('../entry'));
    });
  });

  test('adds hot middleware client to entries', () => {
    expect(webpackConfig.entry).toContain(
      `${require.resolve('webpack-hot-middleware/client')}?reload=true`,
    );
  });
});

describe('with hmr plugin', () => {
  beforeEach(() => {
    mockCosmosConfig = {
      hmrPlugin: true,
    };
    webpackConfig = getWebpackConfig(userWebpackConfig, cosmosConfigPath);
  });

  test('adds HotModuleReplacementPlugin', () => {
    expect(webpackConfig.plugins).toContain(mockHotModuleReplacementPlugin);
  });
});

describe('with absolute paths', () => {
  beforeEach(() => {
    mockCosmosConfig = {
      componentPaths: [resolveUserPath('src/components')],
      globalImports: [resolveUserPath('./global.css')],
    };
    webpackConfig = getWebpackConfig(userWebpackConfig, cosmosConfigPath);
  });

  test('adds user global imports to entries', () => {
    mockCosmosConfig.globalImports.forEach(globalImport => {
      expect(webpackConfig.entry).toContain(globalImport);
    });
  });
});

describe('webpack config basic', () => {
  test('choose `loaders` or `rules` from user config', () => {
    const userRule = { foo: 'bar' };

    webpackConfig = getWebpackConfig(
      {
        module: {
          rules: [userRule]
        }
      },
      cosmosConfigPath
    );
    expect(webpackConfig.module.rules[0]).toEqual(userRule);

    webpackConfig = getWebpackConfig(
      {
        module: {
          loaders: [userRule]
        }
      },
      cosmosConfigPath
    );
    expect(webpackConfig.module.loaders[0]).toEqual(userRule);
  });

  test('passing user data to module config', () => {
    const additionalOption = {
      something: 'foo',
    };
    const userRule = { foo: 'bar' };
    webpackConfig = getWebpackConfig(
      {
        module: {
          additionalOption,
          rules: [userRule],
        }
      },
      cosmosConfigPath
    );

    expect(webpackConfig.module.additionalOption).toEqual(additionalOption);
    expect(webpackConfig.module.rules[0]).toEqual(userRule);
  });
});
