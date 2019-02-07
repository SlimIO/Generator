# Generator
![V0.5.0](https://img.shields.io/badge/version-0.5.0-blue.svg)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/Generator/commit-activity)
[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/SlimIO/Generator/blob/master/LICENSE)

SlimIO Project Generator. This project has been created to help SlimIO contributors to generate new project boilerplate with all required files and configuration (as required by the Governance).

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

> Note: if you'r working on the project itself, run `npm link` at the root of the project to get the global command.

## Template files
| name | optional | description |
| --- | --- | --- |
| .eslintrc | ❌ | Linting configuration for JavaScript |
| .editorconfig | ❌ | EditorConfig helps maintain consistent coding styles for multiple developers working on the same project across various editors and IDEs |
| .gitignore | ❌ | Specifies intentionally untracked files to ignore for git |
| .npmignore | ❌ | Keep stuff out of your package |
| LICENSE | ❌ | Project LICENSE (default MIT) |
| CONTRIBUTING.md | ✔️ | Contribution guidelines and COC |
| commitlint.config.json | ❌ | GIT Commit convention configuration |
| .travis.yml | ✔️ | Travis CI configuration |
| jsdoc.json | ✔️ | JSDoc configuration |
| package.json | ❌ | Project manifest |
| README.md | ❌ | Project README, main documentation entry |
| binding.gyp | ✔️ | N-API (C/C++) configuration for native addons |

## Project type

### CLI
When the project is a CLI (Command Line Interface). A `./bin` directory must be created with a root `index.js`. The root file must contains the following hashbang: `#!/usr/bin/env node`.

package.json must be updated with the following fields:
```json
{
    "preferGlobal": true,
    "bin": {
        "generator": "./bin/index.js"
    },
}
```

### N-API
When the project is a native addon (Node.js N-API). An `./include` directory must be created and filled with the Node-addon-api headers.

These files must be created at the current working dir location:
- projectname.cpp
- binding.gyp

package.json must be updated with the following fields:
```json
{
    "gypfile": true
}
```

## License
MIT
