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
 * @function transfertFiles
 * @desc Transfer all files in a given directory to a new given directory (the target).
 * @param {!String} currDir current Directory where file are stored
 * @param {!String} targetDir target Directory where files should be transfered
 * @returns {Promise<void>}
 */
async function transfertFiles(currDir, targetDir) {
    const AllFiles = await readdir(currDir);
    for (const fileName of AllFiles) {
        const rS = createReadStream(join(currDir, fileName), {
            highWaterMark: 1024
        });
        const wS = createWriteStream(join(targetDir, fileName));
        for await (const buf of rS) {
            wS.write(buf);
        }
        wS.end();
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
    await transfertFiles(DEFAULT_FILES_DIR, cwd);

    // Ask projectName/projectDesc and C++ INCLUDERS_ASK
    const response = await inquirer.prompt(GEN_QUESTIONS);

    // INCLUDERS_ASK
    if (response.includers === true) {
        await execa("mkdir include");
        await transfertFiles(DEFAULT_FILES_INCLUDE, join(cwd, "include"));
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
