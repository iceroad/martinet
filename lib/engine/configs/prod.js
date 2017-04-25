/* eslint-disable global-require,import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  path = require('path'),
  webpack = require('webpack'),
  ExtractTextPlugin = require('extract-text-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin')
  ;

const VERSIONED_DIR = '__ver__';

module.exports = function genProdConfig(pageDef, projectRoot, outputRoot,
  configSpec, entryPoints, pageDataLocals) {
  assert(_.isObject(pageDef));
  assert(_.isString(projectRoot));
  assert(_.isString(outputRoot));
  assert(_.isString(configSpec));
  assert(_.isArray(entryPoints));
  assert(_.isObject(pageDataLocals));

  // Relative path from page output directory to site root.
  const pageOutputRelPath = path.dirname(pageDef.dist);
  let publicPath = `${path.relative(`/${pageOutputRelPath}`, '/')}/`;
  if (publicPath === '/') publicPath = '';

  //
  // Create Webpack loaders.
  //

  //
  // Markup loader: Pug (formerly Jade)
  //
  const PugLoader = {
    loader: 'pug-html-loader',
    options: {
      data: pageDataLocals,
      doctype: 'html',
      pretty: false,
      root: projectRoot,
    },
  };

  //
  // HTML loader.
  //
  const HtmlLoader = {
    loader: 'html-loader',
    options: {
      minimize: true,
      root: projectRoot,
      attrs: ['img:src'],
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
        path.resolve(__dirname, '..', '..', '..', 'node_modules'),
      ],
    },

    // Where to resolve import/include/requires
    resolve: {
      extensions: ['.js', '.json', '.vue'],
    },

    plugins: [
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
        template: path.join(projectRoot, pageDef.src),
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
              pug: [HtmlLoader, PugLoader],
              less: LessExtractor,
              json: 'json-loader',
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
