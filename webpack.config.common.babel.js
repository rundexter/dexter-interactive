import path from 'path';
import {CleanWebpackPlugin} from 'clean-webpack-plugin';
import LodashModuleReplacementPlugin from 'lodash-webpack-plugin';

export default {
  entry: {
    "dexter-interactive": path.join(__dirname, 'src/index.js')
  }
  , output: {
    path: path.join(__dirname, 'dist')
    , filename: '[name].js'
    , library: 'dexterInteractive'
    , libraryTarget: 'umd'
  }
  , module: {
    rules: [
      {
        test: /\.js/
        , exclude: /(node_modules|bower_components)/
        , use: [
          'babel-loader'
        ]
      }
    ]
  }
  , plugins: [
    new CleanWebpackPlugin({
      verbose: true
    })
    , new LodashModuleReplacementPlugin({paths: true})
  ]
  , stats: {
    colors: true
  }
  , mode: 'production'
  , devtool: 'source-map'
};

