const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // how does it know where to look?

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  devServer: {
    static: './dist',
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
	clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
	  title: '10.22.23',
	}),
  ],
  // optimization: {
	// runtimeChunk: 'single',
  // },
  module: {
    rules: [
      {
        test: /\.wgsl/,
        type: 'asset/source'
      },
      {
        test: /\.png/,
        type: 'asset/resource'
      }
    ]
  },
};
