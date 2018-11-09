#!/usr/bin/env node

// Require Node.js Dependencies
const { readdir, readFile, writeFile } = require("fs").promises;
const { join } = require('path');

// Require Third-party Dependencies
const execa = require("execa");
const inquirer = require("inquirer");

async function main() {

    await execa("npm init -y");

    const cwd = process.cwd();
    if (cwd === __dirname) {
        throw new Error("Cannot execute at the root of the project");
    }
    const projectFilesDir = join(__dirname, "projectfiles");
    const projectFileDirJSON = join(cwd, "package.json");
    const projectFileDirReadme = join(__dirname,"Readme","README.md")
    const projectreadme = join(cwd,"README.md")

    const files = await readdir(projectFilesDir);
    files.map((x) => writeFile(x));

    const questions = [
        {
            message: "What is the name of your project",
            type: "input",
            name: "ProjectName"
        },
        {
            message: "Add a description (optional)",
            type: "input",
            name: "ProjectDesc"
        }
    ];
    const response = await inquirer.prompt(questions)

    const buf = await readFile(projectFileDirJSON);
    const obj = JSON.parse(buf.toString());
    obj.name = `@slimio/${response.ProjectName}`;
    obj.description = response.ProjectDesc;

    await writeFile(projectFileDirJSON, JSON.stringify(obj, null, 2));

    const Readme = await readFile(projectFileDirReadme);
    const str = Readme.toString();
    FirstChange = str.replace(/\${package}/gm, `@slimio/${response.ProjectName}`);
    FinalChange = FirstChange.replace(/\${desc}/gm, response.ProjectDesc);

    await writeFile(projectreadme, FinalChange);

}
main().catch(console.error)
