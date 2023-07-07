/* eslint-disable import/no-extraneous-dependencies */
import fs from 'fs';
import { resolve } from 'path';

import { visualizer } from 'rollup-plugin-visualizer';
import { Plugin, ResolvedConfig, UserConfig } from 'vite';
import banner from 'vite-plugin-banner';
import Checker from 'vite-plugin-checker';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

import react from '@vitejs/plugin-react';

import pkg from './package.json';

const loaderModuleBanner = `
// ==UserScript==
// @name         ${pkg.displayName}
// @namespace    https://github.com/moth-boi/pixelplanet.fun-CzechOverlay
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       ${pkg.author}
// @include      https://pixelplanet.fun/*
// @include      https://fuckyouarkeros.fun/*
// @grant        none
// @downloadURL  https://moth-boi.github.io/pixelplanet.fun-CzechOverlay/pixelPlanetOverlay-loader.user.js
// ==/UserScript==
/**/
`;

function pathResolve(dir: string) {
    return resolve(__dirname, '.', dir);
}
const doNotClean = !!process.env.APP_DONT_CLEAN;
const mode = process.env.APP_ENV;
const isDev = mode === 'development';

// https://vitejs.dev/config/
const config: () => UserConfig = () => ({
    mode,
    build: {
        emptyOutDir: !doNotClean,
        sourcemap: isDev ? 'inline' : false,
        minify: false, // isDev ? false : undefined, // TODO, mark 'GM' as global/restricted keyword so minifier doesn't generate variables with that name
        target: 'esnext',
        rollupOptions: {
            plugins: [isDev ? visualizer({ filename: 'moduleVisualizerOutput.html' }) : undefined],
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
            },
        },
    },
    resolve: {
        alias: [
            {
                find: /@\//,
                replacement: `${pathResolve('src')}/`,
            },
        ],
    },
    server: {
        https: true,
    },
    plugins: [
        mkcert(),
        // !isInlineScript && vitePluginWrapUserScriptOnWindow(),
        banner(loaderModuleBanner),
        tsconfigPaths(),
        react({
            jsxRuntime: isDev ? 'classic' : undefined,
            babel: {
                plugins: [
                    // ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
                    [
                        '@emotion',
                        {
                            importMap: {
                                '@mui/material': {
                                    styled: {
                                        canonicalImport: ['@emotion/styled', 'default'],
                                        styledBaseImport: ['@mui/material', 'styled'],
                                    },
                                },
                                '@mui/material/styles': {
                                    styled: {
                                        canonicalImport: ['@emotion/styled', 'default'],
                                        styledBaseImport: ['@mui/material/styles', 'styled'],
                                    },
                                },
                            },
                        },
                    ],
                ],
            },
        }),
        Checker({
            typescript: true,
            overlay: false,
        }),
    ],
});

function vitePluginWrapUserScriptOnWindow(): Plugin {
    let viteConfig: ResolvedConfig;
    const includeRegexp = /\.js$/i;
    const excludeRegexp = /vendor/;

    const header = (() => {
        (function iife() {
            // Hack to get around the sandbox restrictions in Tampermonkey. Redux devtools don't work.
            // Inject code directly to window
            // eslint-disable-next-line no-eval
            if (this !== window) {
                window.eval(`(${iife.toString()})();`);
                return;
            }
        })();
    })
        .toString()
        .slice(7, -9);
    const footer = '\n})();';

    return {
        name: 'vitePluginWrapUserScriptOnWindow',
        configResolved(resolvedConfig: ResolvedConfig) {
            viteConfig = resolvedConfig;
        },
        async writeBundle(options, bundle) {
            Object.entries(bundle).forEach(([file, source]) => {
                // Get the full path of file
                const { root } = viteConfig;
                const outDir: string = viteConfig.build.outDir || 'dist';
                const filePath = resolve(root, outDir, file);

                // Only handle matching files
                if (includeRegexp.test(file) && !excludeRegexp.test(file)) {
                    try {
                        // Read the content from target file
                        let data: string = fs.readFileSync(filePath, {
                            encoding: 'utf8',
                        });
                        data = `${header}\n${data}\n${footer}`;

                        // Save
                        fs.writeFileSync(filePath, data);
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
        },
    };
}

export default config;
