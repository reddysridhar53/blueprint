/**
 * Copyright 2017 Palantir Technologies, Inc. All rights reserved.
 */

const path = require("path");
const webpack = require("webpack");

// webpack plugins
const { CheckerPlugin } = require("awesome-typescript-loader");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const WebpackNotifierPlugin = require("webpack-notifier");

const { getPackageName } = require("./utils");

// globals
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PACKAGE_NAME = getPackageName();

/**
 * Configure plugins loaded based on environment.
 */
const plugins = [
    // Used for async error reporting
    // Can remove after https://github.com/webpack/webpack/issues/3460 resolved
    new CheckerPlugin(),

    // Zero tolereance for circular depenendencies
    new CircularDependencyPlugin({
        exclude: /.js|node_modules/,
        failOnError: true,
    }),
];
if (IS_PRODUCTION) {
    plugins.push(
        // Define JS globals when running the build
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify("production"),
            },
        }),

        // Some loaders accept configuration through webpack internals
        new webpack.LoaderOptionsPlugin({
            debug: false,
            minimize: true,
        }),

        // Only extract CSS to a file for production because it is slow
        new ExtractTextPlugin("[name].css"),

        // Minify JS
        new UglifyJsPlugin(),

        // Use scope hoisting to reduce the number of closures in the bundle script
        new webpack.optimize.ModuleConcatenationPlugin(),

        // add production plugins here
    );
} else {
    plugins.push(
        // Trigger an OS notification when the build succeeds
        new WebpackNotifierPlugin({
            title: PACKAGE_NAME,
        })

        // add dev plugins here
    );
}

// Module loaders for .scss files, used in reverse order (compile Sass, apply PostCSS, interpret CSS as modules)
const scssLoaders = [
    {
        loader: require.resolve("css-loader"),
        options: { minimize: IS_PRODUCTION },
    },
    {
        loader: require.resolve("postcss-loader"),
        options: {
            config: { path: path.resolve(__dirname, "postcss.config.js") },
        },
    },
    require.resolve("sass-loader"),
];

module.exports = {
    resolve: {
        extensions: [ ".js", ".jsx", ".ts", ".tsx", ".scss" ],
    },

    devtool: IS_PRODUCTION ? false : "inline-source-map",

    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loader: require.resolve("awesome-typescript-loader"),
                options: {
                    configFileName: "./src/tsconfig.json",
                },
            },
            {
                test: /\.scss$/,
                use: IS_PRODUCTION
                    ? ExtractTextPlugin.extract({
                            fallback: require.resolve("style-loader"),
                            use: scssLoaders
                        })
                    : [ require.resolve("style-loader"), ...scssLoaders ],
            },
            {
                test: /\.(eot|ttf|woff|woff2|svg)$/,
                loader: require.resolve("file-loader"),
            },
        ],
    },

    plugins,
};