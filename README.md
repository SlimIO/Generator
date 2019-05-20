# Generator
![version](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/SlimIO/Generator/master/package.json&query=$.version&label=Version)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/Generator/commit-activity)
[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/SlimIO/Generator/blob/master/LICENSE)
![dep](https://img.shields.io/david/SlimIO/Generator.svg)
![size](https://img.shields.io/github/languages/code-size/SlimIO/Generator.svg)

SlimIO Project Generator. This project has been created to help SlimIO contributors to generate new project boilerplate with all required files and configuration (as required by the Governance).

<p align="center">
    <img src="https://i.imgur.com/XoOwMbo.png" width="500">
</p>

## Requirements
- Node.js v10 or higher

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

## License
MIT
