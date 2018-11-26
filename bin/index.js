#!/usr/bin/env node

// Require Node.js Dependencies
const { readFile, writeFile } = require("fs").promises;
const { join } = require("path");

// Require Third-party Dependencies
const execa = require("execa");
const inquirer = require("inquirer");
const Registry = require("@slimio/npm-registry");

// Require Internal Dependencies
const DEFAULT_PKG = require("../template/package.json");
const { transfertFiles } = require("../src/utils");

// CONSTANTS
const FILE_INDENTATION = 4;
const ROOT_DIR = join(__dirname, "..");
const TEMPLATE_DIR = join(ROOT_DIR, "template");
const DEFAULT_FILES_DIR = join(TEMPLATE_DIR, "defaultFiles");
const DEFAULT_FILES_INCLUDE = join(TEMPLATE_DIR, "include");
const GEN_QUESTIONS = require("../src/questions.json");
const { DEV_DEPENDENCIES, NAPI_DEPENDENCIES } = require("../src/dependencies.json");

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

    // Ask projectName/projectDesc and if this is a NAPI Project
    const response = await inquirer.prompt(GEN_QUESTIONS);

    // If this is a NAPI project
    if (response.is_napi) {
        // Push devDependencies for NAPI project
        DEV_DEPENDENCIES.push("node-gyp", "prebuildify");

        // Update DEFAULT_PKG Scripts
        DEFAULT_PKG.scripts.prebuilds = "prebuildify --napi";
        DEFAULT_PKG.scripts.build = "cross-env node-gyp configure && node-gyp build";

        await execa("mkdir include");
        await transfertFiles(DEFAULT_FILES_INCLUDE, join(cwd, "include"));

        // Handle binding.gyp
        const buf = await readFile(join(TEMPLATE_DIR, "binding.gyp"));
        const gyp = JSON.parse(buf.toString());

        gyp.targets[0].target_name = response.projectname;
        gyp.targets[0].sources = `${response.projectname}.cpp`;

        // Create .cpp file at the root of the project
        await execa(`touch ${response.projectname}.cpp`);

        await writeFile(join(cwd, "binding.gyp"), JSON.stringify(gyp, null, FILE_INDENTATION));
    }

    // Handle Package.json
    {
        const npmRegistry = new Registry();
        const cwdPackage = join(cwd, "package.json");

        const buf = await readFile(cwdPackage);
        const pkg = JSON.parse(buf.toString());
        pkg.name = `@slimio/${response.projectname}`;
        pkg.description = response.projectdesc;
        pkg.dependencies = {};
        pkg.devDependencies = {};

        // Search for Dependencies if NAPI
        if (response.is_napi) {
            console.log("Seeking latest package(s) version for napi!");
            const Packages = await Promise.all(
                NAPI_DEPENDENCIES.map((pkgName) => npmRegistry.package(pkgName))
            );
            for (const Pkg of Packages) {
                pkg.dependencies[Pkg.name] = `^${Pkg.lastVersion}`;
            }
        }

        // Search for DevDependencies
        console.log("Seeking latest package(s) version on npm registery!");
        const Packages = await Promise.all(
            DEV_DEPENDENCIES.map((pkgName) => npmRegistry.package(pkgName))
        );
        for (const Pkg of Packages) {
            pkg.devDependencies[Pkg.name] = `^${Pkg.lastVersion}`;
        }

        await writeFile(cwdPackage, JSON.stringify(Object.assign(pkg, DEFAULT_PKG), null, FILE_INDENTATION));
    }

    // Handle README.md
    console.log("Writing default README.md");
    const buf = await readFile(join(TEMPLATE_DIR, "README.md"));

    const finalReadme = buf.toString()
        .replace(/\${package}/gm, `@slimio/${response.projectname}`)
        .replace(/\${desc}/gm, `${response.projectdesc}`);

    await writeFile(join(cwd, "README.md"), finalReadme);

    console.log("Done with no errors...");
}
main().catch(console.error);
