// ==UserScript==
// @name         ${pkg.displayName}
// @namespace    https://github.com/moth-boi/pixelplanet.fun-CzechOverlay
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       ${pkg.author}
// @include      https://pixelplanet.fun/*
// @grant        none
// @downloadURL  https://moth-boi.github.io/pixelplanet.fun-CzechOverlay/pixelPlanetOverlay-loader.user.js
// ==/UserScript==

import './pixelPlanetOverlay.user';

// {
//     // This module is only wrapper for loading the actual module.
//     // This makes it update more in real time rather than allowing it to update itself via usual auto-updates.
//     const e = document.createElement('script');
//     if (window.location.host.startsWith('localhost')) e.src = new URL('src/userscript-loader-module/pixelPlanetOverlay.user.ts', window.location.href).href;
//     else e.src = 'https://moth-boi.github.io/pixelplanet.fun-CzechOverlay/pixelPlanetOverlay-loader.user.js';
//     e.type = 'module';
//     document.body.appendChild(e);
// }
export {};
