/* eslint-disable global-require,import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  json = JSON.stringify,
  path = require('path'),
  webpack = require('webpack'),
  ExtractTextPlugin = require('extract-text-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin')
  ;

const VERSIONED_DIR = '__ver__';

module.exports = function genProdConfig(pageDef, srcRoot, outputRoot,
  configSpec, entryPoints, pageDataLocals, projectRoot) {
  assert(_.isObject(pageDef));
  assert(_.isString(srcRoot));
  assert(_.isString(outputRoot));
  assert(_.isString(configSpec));
  assert(_.isArray(entryPoints));
  assert(_.isObject(pageDataLocals));
  assert(_.isString(projectRoot));

  // Relative path from page output directory to site root.
  const pageOutputRelPath = path.dirname(pageDef.dist);
  let publicPath = `${path.relative(`/${pageOutputRelPath}`, '/')}/`;
  if (publicPath === '/') publicPath = '';

  //
  // Global compile-time constants, passed via EnvironmentPlugin.
  //
  const compileConstants = {
    PROD: true,
    PRODUCTION: true,
    CONFIG: configSpec,
    PAGE_DEF: pageDef,
    PUBLIC_PATH: publicPath,
    NODE_ENV: 'production',
  };

  const envConstants = _.fromPairs(_.map(_.toPairs(compileConstants), (pair) => {
    return [`process.env.${pair[0]}`, json(pair[1])];
  }));

  //
  // Create Webpack loaders.
  //

  //
  // Markup loader: Pug (formerly Jade)
  //
  const PugLoader = {
    loader: 'pug-html-loader',
    options: {
      data: _.merge({}, pageDataLocals, { $martinet: compileConstants }),
      doctype: 'html',
      pretty: false,
      root: srcRoot,
    },
  };

  //
  // HTML loader.
  //
  const HtmlLoader = {
    loader: 'html-loader',
    options: {
      minimize: true,
      root: srcRoot,
      attrs: ['img:src', 'link:href'],
    },
  };

  //
  // Style loader and extractor: CSS
  //
  const CssLoader = {
    loader: 'css-loader',
    options: {
      minimize: true,
      sourceMap: true,
    },
  };
  const CssExtractor = ExtractTextPlugin.extract({
    use: [CssLoader],
    publicPath: '../',
  });

  //
  // Style loader and extractor: Less
  //
  const LessLoader = {
    loader: 'less-loader',
    options: {
      sourceMap: true,
    },
  };
  const LessExtractor = ExtractTextPlugin.extract({
    use: [CssLoader, LessLoader],
    publicPath: '../',
  });

  //
  // ES-next loader via Babel
  //
  const BabelLoader = {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'babel-loader',
    options: {
      presets: [
        [require.resolve('babel-preset-react')],
        [require.resolve('babel-preset-env'), { modules: false }],
      ],
    },
  };

  //
  // Angular2/TypeScript loader
  //
  const TypeScriptLoader = {
    test: /\.ts$/,
    loaders: [
      {
        loader: 'awesome-typescript-loader',
        options: {
          silent: true,
          useCache: true,
          useBabel: true,
        },
      },
      'angular2-template-loader',
    ],
  };

  return {
    entry: entryPoints,
    output: {
      path: outputRoot,
      publicPath,
      filename: `${VERSIONED_DIR}/js.[chunkhash].bundle.js`,
      sourceMapFilename: `${VERSIONED_DIR}/[chunkhash].map`,
    },
    devtool: 'nosources-source-map',

    // Loaders come from our local installation.
    resolveLoader: {
      modules: [
        projectRoot,
        path.resolve(__dirname, '..', '..', '..', 'node_modules'),
      ],
    },

    // How to resolve import/include/requires
    resolve: {
      // The complete array of extensions that will be resolved.
      extensions: ['.js', '.json', '.vue', '.ts', '.pug', '.less', '.json', '*'],
      alias: {
        vue: 'vue/dist/vue.min.js',
      },
    },

    plugins: [
      new webpack.DefinePlugin(envConstants),
      new webpack.LoaderOptionsPlugin({
        minimize: true,
        debug: false,
      }),
      new webpack.optimize.UglifyJsPlugin({
        beautify: false,
        mangle: {
          screw_ie8: true,
          keep_fnames: true,
        },
        compress: {
          screw_ie8: true,
        },
        comments: false,
      }),
      new ExtractTextPlugin({
        filename: `${VERSIONED_DIR}/style.[contenthash:7].css`,
      }),
      new HtmlWebpackPlugin({
        template: path.join(srcRoot, pageDef.src),
        filename: pageDef.dist,
      }),
    ],

    module: {
      rules: [
        BabelLoader,
        TypeScriptLoader,
        {
          test: /\.pug$/,
          use: [HtmlLoader, PugLoader],
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            loaders: {
              js: BabelLoader,
              less: LessExtractor,
              json: 'json-loader',
              pug: PugLoader,
            },
          },
        },
        {
          test: /\.css$/,
          loader: CssExtractor,
        },
        {
          test: /\.json$/,
          loader: 'json-loader',
        },
        {
          test: /\.less$/,
          loader: LessExtractor,
        },
        {
          test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: `${VERSIONED_DIR}/[name].[hash:7].[ext]`,
              },
            },
          ],
        },
      ],
    },
  };
};
