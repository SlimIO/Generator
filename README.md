# Generator
SlimIO Project Generator. This project has been created to help developer to generate a new GIT project with all required files and configuration.

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @slimio/generator
# or
$ yarn add @slimio/generator
```

## Usage example
The package will install globally the command `generator`. Just run this command with no arguments and it will generate a new SlimIO project on the current working dir.

> Note: if you'r working on the project itself, run `npm link` at the root of the project to get the global command.

## Roadmap

- Register project on a local DB for security!
- Add commands (update, upgrade)
- Add versioning script!
- Automatically find Node.js C++ header (for C Project).
- Add test
