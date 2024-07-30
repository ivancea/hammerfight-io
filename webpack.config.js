import childProcess from "child_process";
import DotenvWebpackPlugin from "dotenv-webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env) => {
  let appVersion;

  if (env?.APP_VERSION) {
    appVersion = env.APP_VERSION;
  } else {
    const gitCommit = childProcess.execSync("git rev-parse HEAD").toString();
    const commitDate = new Date(
      Number(
        childProcess
          .execSync("git show -s --format=%ct HEAD")
          .toString()
          .trim(),
      ) * 1000,
    );

    appVersion = `dev-${gitCommit.slice(0, 7)} - ${commitDate.toISOString()}`;
  }

  return {
    entry: "./client/index.ts",
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          include: [
            path.resolve(__dirname, "client"),
            path.resolve(__dirname, "common"),
          ],
        },
        {
          test: /\.s?css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
          include: path.resolve(__dirname, "client/styles"),
        },
        {
          test: /\.(jpg|png)$/,
          include: path.resolve(__dirname, "client/assets"),
          type: "asset/resource",
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    output: {
      filename: "bundle.js",
      assetModuleFilename: "assets/[hash].[name][ext][query]",
      path: path.resolve(__dirname, "build"),
      clean: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./client/index.html",
        appVersion,
      }),
      new MiniCssExtractPlugin(),
      new DotenvWebpackPlugin({
        safe: ".env.defaults",
        defaults: ".env.defaults",
        systemvars: true,
      }),
    ],
  };
};
