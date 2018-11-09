#!/usr/bin/env node

// Require Node.js Dependencies
const { readdir, readFile, writeFile } = require("fs").promises;
const { join } = require("path");

// Require Third-party Dependencies
const execa = require("execa");
const inquirer = require("inquirer");

// CONSTANTS
const ROOT_DIR = join(__dirname, "..");
const TEMPLATE_DIR = join(ROOT_DIR, "template");

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
    (await readdir(
        join(TEMPLATE_DIR, "defaultFiles")
    )).map((file) => writeFile(file));

    // Ask projectName and projectDesc
    const questions = [
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
    const response = await inquirer.prompt(questions);

    // Handle Package.json
    {
        const cwdPackage = join(cwd, "package.json");

        const buf = await readFile(cwdPackage);
        const obj = JSON.parse(buf.toString());
        obj.name = `@slimio/${response.projectname}`;
        obj.description = response.projectdesc;

        await writeFile(cwdPackage, JSON.stringify(obj, null, 2));
    }

    // Handle README.md
    const buf = await readFile(join(TEMPLATE_DIR, "README.md"));

    const finalReadme = buf.toString()
        .replace(/\${package}/gm, `@slimio/${response.projectname}`)
        .replace(/\${desc}/gm, `${response.projectdesc}`);

    await writeFile(join(cwd, "README.md"), finalReadme);
}
main().catch(console.error);
