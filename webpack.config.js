const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    background: "./src/background.js",
    popup: "./src/popup.js",
    content: "./src/content.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "popup.html", to: "popup.html" },
        { from: "styles.css", to: "styles.css" },
        { from: "icons", to: "icons", noErrorOnMissing: true },
        { from: "assets", to: "assets", noErrorOnMissing: true },
        // Copy Phosphor Icons CSS
        {
          from: "node_modules/@phosphor-icons/web/src/regular/style.css",
          to: "phosphor-regular.css",
        },
        {
          from: "node_modules/@phosphor-icons/web/src/bold/style.css",
          to: "phosphor-bold.css",
        },
        {
          from: "node_modules/@phosphor-icons/web/src/fill/style.css",
          to: "phosphor-fill.css",
        },
        // Copy Phosphor Icons Font Files
        {
          from: "node_modules/@phosphor-icons/web/src/regular/Phosphor.woff2",
          to: "Phosphor.woff2",
        },
        {
          from: "node_modules/@phosphor-icons/web/src/regular/Phosphor.woff",
          to: "Phosphor.woff",
        },
        {
          from: "node_modules/@phosphor-icons/web/src/regular/Phosphor.ttf",
          to: "Phosphor.ttf",
        },
        {
          from: "node_modules/@phosphor-icons/web/src/regular/Phosphor.svg",
          to: "Phosphor.svg",
        },
      ],
    }),
  ],
  optimization: {
    minimize: false, // Keep readable for debugging
  },
  devtool: "source-map",
  target: "web",
};
