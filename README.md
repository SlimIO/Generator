# Generator
![version](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/SlimIO/Generator/master/package.json&query=$.version&label=Version)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/Generator/commit-activity)
[![MIT](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/SlimIO/Generator/blob/master/LICENSE)
![dep](https://img.shields.io/david/SlimIO/Generator.svg)
![size](https://img.shields.io/github/languages/code-size/SlimIO/Generator.svg)
[![Known Vulnerabilities](https://snyk.io//test/github/SlimIO/Generator/badge.svg?targetFile=package.json)](https://snyk.io//test/github/SlimIO/Generator?targetFile=package.json)
[![Build Status](https://travis-ci.com/SlimIO/Generator.svg?branch=master)](https://travis-ci.com/SlimIO/Generator)
[![Greenkeeper badge](https://badges.greenkeeper.io/SlimIO/Generator.svg)](https://greenkeeper.io/)

SlimIO Project Generator. This project has been created to help SlimIO contributors **to generate new project without to have to worry** about required files and configuration (as required by the Governance and psp policies).

<p align="center">
    <img src="https://i.imgur.com/kGzMr74.png">
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v12 or higher

## Getting Started
This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @slimio/generator
# or
$ yarn add @slimio/generator
```

## Usage example
The package will install globally the command `generator`. Just run this command with no arguments and it will generate a new SlimIO project on the current working dir.

```bash
$ mkdir project
$ cd project
$ generator
```

## Dependencies

|Name|Refactoring|Security Risk|Usage|
|---|---|---|---|
|[@slimio/async-cli-spinner](https://github.com/SlimIO/Async-cli-spinner)|Minor|Low|Multi async cli spinner|
|[@slimio/manifest](https://github.com/SlimIO/Manifester#readme)|Minor|Low|Manifest config file|
|[@slimio/nodejs-downloader](https://github.com/SlimIO/nodejs-downloader#readme)|Minor|High|Download Node.js|
|[@slimio/npm-registry](https://github.com/SlimIO/npm-registry#readme)|Minor|Low|NPM registry API|
|[@slimio/utils](https://github.com/SlimIO/Utils#readme)|Minor|High|Bunch of useful functions|
|[cross-spawn](https://github.com/moxystudio/node-cross-spawn)|Minor|High|TBC|
|[kleur](https://github.com/lukeed/kleur)|Minor|Low|TTY color|
|[qoa](https://github.com/klaussinani/qoa#readme)|Minor|Low|Minimal interactive command-line prompts|

## License
MIT
