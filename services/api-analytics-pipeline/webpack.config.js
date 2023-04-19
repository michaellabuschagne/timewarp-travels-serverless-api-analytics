const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  target: "node",
  devtool: "inline-cheap-module-source-map",
  entry: {
    "handlers/execution-logs-kinesis-transformer":
      "./src/handlers/execution-logs-kinesis-transformer.js",
    "handlers/access-logs-kinesis-transformer":
      "./src/handlers/access-logs-kinesis-transformer.js",
    "handlers/restapi-logs-subscriber":
      "./src/handlers/restapi-logs-subscriber.js"
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].js",
    libraryTarget: "commonjs"
  },
  optimization: {
    minimize: false
  },
  module: {
    rules: [
      {
        //test: /\.m?js$/,
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: { node: "18" },
                  useBuiltIns: "usage",
                  corejs: 3
                }
              ]
            ],
            plugins: ["source-map-support"]
          }
        }
      },
      {
        test: /.node$/,
        use: "node-loader"
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: ["src/cloudformation.json"]
    })
  ],
  node: false,
  externals: {
    "@aws-sdk/client-cloudwatch-logs": "@aws-sdk/client-cloudwatch-logs",
    "@aws-sdk/client-ssm": "@aws-sdk/client-ssm",
    "@aws-sdk/client-firehose": "@aws-sdk/client-firehose",
    "@aws-sdk/client-kinesis": "@aws-sdk/client-kinesis"
  }
};
