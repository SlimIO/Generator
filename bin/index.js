#!/usr/bin/env node

// Require Node.js Dependencies
const { readFile, writeFile } = require("fs").promises;
const { join } = require("path");

// Require Third-party Dependencies
const execa = require("execa");
const inquirer = require("inquirer");

// Require Internal Dependencies
const DEFAULT_PKG = require("../template/package.json");
const GEN_QUESTIONS = require("../src/questions.json");
const { transfertFiles } = require("../src/utils");

// CONSTANTS
const ROOT_DIR = join(__dirname, "..");
const TEMPLATE_DIR = join(ROOT_DIR, "template");
const DEFAULT_FILES_DIR = join(TEMPLATE_DIR, "defaultFiles");
const DEFAULT_FILES_INCLUDE = join(TEMPLATE_DIR, "include");

/**
 * @async
 * @function main
 * @desc Main Generator CLI
 * @returns {Promise<void>}
 */
async function main() {
    const cwd = process.cwd();
    if (cwd === ROOT_DIR || cwd === __dirname) {
        throw new Error("Cannot execute at the root of the project");
    }

    // Create initial package.json
    await execa("npm init -y");

    // Write default projects files
    await transfertFiles(DEFAULT_FILES_DIR, cwd);

    // Ask projectName/projectDesc and C++ INCLUDERS_ASK
    const response = await inquirer.prompt(GEN_QUESTIONS);

    // INCLUDERS_ASK
    if (response.includers === true) {
        await execa("mkdir include");
        await transfertFiles(DEFAULT_FILES_INCLUDE, join(cwd, "include"));

        // Handle binding.gyp
        const buf = await readFile(join(TEMPLATE_DIR, "binding.gyp"));
        const gyp = JSON.parse(buf.toString());

        // eslint-disable-next-line
        gyp.targets[0].target_name = response.projectname;
        gyp.targets[0].sources = `${response.projectname}.cpp`;

        await writeFile(join(cwd, "binding.gyp"), JSON.stringify(gyp, null, 4));
    }

    // Handle Package.json
    {
        const cwdPackage = join(cwd, "package.json");

        const buf = await readFile(cwdPackage);
        const obj = JSON.parse(buf.toString());
        obj.name = `@slimio/${response.projectname}`;
        obj.description = response.projectdesc;
        const finalPayload = Object.assign(obj, DEFAULT_PKG);

        await writeFile(cwdPackage, JSON.stringify(finalPayload, null, 2));
    }

    // Handle README.md
    const buf = await readFile(join(TEMPLATE_DIR, "README.md"));

    const finalReadme = buf.toString()
        .replace(/\${package}/gm, `@slimio/${response.projectname}`)
        .replace(/\${desc}/gm, `${response.projectdesc}`);

    await writeFile(join(cwd, "README.md"), finalReadme);
}
main().catch(console.error);
