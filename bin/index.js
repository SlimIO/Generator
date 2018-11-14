#!/usr/bin/env node

// Require Node.js Dependencies
const {
    createReadStream, createWriteStream,
    promises: { readdir, readFile, writeFile }
} = require("fs");
const { join } = require("path");

// Require Third-party Dependencies
const execa = require("execa");
const inquirer = require("inquirer");

// Require Internal Dependencies
const DEFAULT_PKG = require("../template/package.json");

// CONSTANTS
const ROOT_DIR = join(__dirname, "..");
const TEMPLATE_DIR = join(ROOT_DIR, "template");
const DEFAULT_FILES_DIR = join(TEMPLATE_DIR, "defaultFiles");
const DEFAULT_FILES_INCLUDE = join(TEMPLATE_DIR, "include");

// QUESTIONS
const GEN_QUESTIONS = [
    {
        message: "What is the name of your project",
        type: "input",
        name: "projectname"
    },
    {
        message: "Add a description (optional)",
        type: "input",
        name: "projectdesc"
    },
    {
        message: "Voulez vous ajoutez les includer C++",
        type: "confirm",
        name: "includers"
    }];

/**
 * @async
 * @function COPY_PASTE_DIR
 * @desc Read and Write a directory with a stream
 * @returns {Promise<void>}
 * @param {string} DIR directory
 * @param {string} NEWDIR new directory
 */
async function COPY_PASTE_DIR(DIR, NEWDIR) {
    const AllFiles = await readdir(DIR);
    for (const fileName of AllFiles) {
        const rS = createReadStream(join(DIR, fileName), {
            highWaterMark: 1024
        });
        const wS2 = createWriteStream(join(NEWDIR, fileName));
        for await (const buf of rS) {
            wS2.write(buf);
        }
        wS2.end();
    }
}

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
    await COPY_PASTE_DIR(DEFAULT_FILES_DIR, cwd);

    // Ask projectName/projectDesc and C++ INCLUDERS_ASK
    const response = await inquirer.prompt(GEN_QUESTIONS);

    // INCLUDERS_ASK
    if (response.includers === true) {
        await execa("mkdir include");
        const NEW_INCLUDE_DIR = join(cwd, "include");
        await COPY_PASTE_DIR(DEFAULT_FILES_INCLUDE, NEW_INCLUDE_DIR);
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
