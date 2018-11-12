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
const DEFAULT_PKG = require("./template/package.json");

// CONSTANTS
const ROOT_DIR = join(__dirname, "..");
const TEMPLATE_DIR = join(ROOT_DIR, "template");
const DEFAULT_FILES_DIR = join(TEMPLATE_DIR, "defaultFiles");

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
    }
];

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
    const tplFiles = await readdir(DEFAULT_FILES_DIR);
    for (const fileName of tplFiles) {
        const rS = createReadStream(join(DEFAULT_FILES_DIR, fileName), {
            highWaterMark: 1024
        });
        const wS = createWriteStream(join(cwd, fileName));
        for await (const buf of rS) {
            wS.write(buf);
        }
        wS.end();
    }

    // Ask projectName and projectDesc
    const response = await inquirer.prompt(GEN_QUESTIONS);

    // Handle Package.json
    {
        const cwdPackage = join(cwd, "package.json");

        const buf = await readFile(cwdPackage);
        const obj = JSON.parse(buf.toString());
        obj.name = `@slimio/${response.projectname}`;
        obj.description = response.projectdesc;
        const finalPayload = Object.assign(obj, Object.create(DEFAULT_PKG));

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
