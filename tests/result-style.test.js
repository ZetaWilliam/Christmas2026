'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('gameplay/runner.css','utf8');

assert(!css.includes('#fff3d9'),'Obsolete pale-yellow hero result background must not return');
assert(css.includes('background:linear-gradient(145deg,#28576C 0%,#1D465B 52%,#17394C 100%)!important;'),'Mid-tier result uses explicit deep sea-blue background');
assert(css.includes('--rr-text:#F7F5ED'),'Mid-tier result text has high-contrast ivory colour');
assert(css.includes('background:rgba(8,35,51,.48)!important;'),'Mid-tier score box stays darker than the result panel');
assert(css.includes('background:linear-gradient(145deg,#213F5C 0%,#17344E 55%,#112B42 100%)!important;'),'High-tier result uses navy background');
assert(css.includes('background:linear-gradient(145deg,#EEF5F5 0%,#E5EFF1 58%,#F7F6F0 100%)!important;'),'Low-tier result uses sea-glass background');

console.log('Result style tests passed: no pale-yellow override and all score bands have explicit high-contrast palettes.');
