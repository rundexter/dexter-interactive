import commonConfig from "./webpack.config.prod.babel";
import path from 'path';

const devConfig = Object.assign({}, commonConfig);

devConfig.mode = 'development';
devConfig.watch = true;

devConfig.devServer = {
  contentBase: path.join(__dirname, 'dist')
  , compress: true
  , port: 9000
};

export default devConfig;
