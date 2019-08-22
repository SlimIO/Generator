#!/usr/bin/env node
"use strict";

// Require Node.js Dependencies
const { readFile, writeFile, unlink, readdir, copyFile, mkdir, appendFile } = require("fs").promises;
const { join } = require("path");

// Require Third-party Dependencies
const execa = require("execa");
const qoa = require("qoa");
const premove = require("premove");
const Registry = require("@slimio/npm-registry");
const manifest = require("@slimio/manifest");
const Spinner = require("@slimio/async-cli-spinner");
const { downloadNodeFile, extract, constants: { File } } = require("@slimio/nodejs-downloader");

// Require Internal Dependencies
const DEFAULT_PKG = require("../template/package.json");
const { transfertFiles, filterPackageName, cppTemplate, upperCase } = require("../src/utils");

// CONSTANTS
const FILE_INDENTATION = 4;
const ROOT_DIR = join(__dirname, "..");
const TEMPLATE_DIR = join(ROOT_DIR, "template");
const DEFAULT_FILES_DIR = join(TEMPLATE_DIR, "defaultFiles");
const DEFAULT_FILES_INCLUDE = join(TEMPLATE_DIR, "include");
const DEFAULT_FILES_TEST = join(TEMPLATE_DIR, "test");
const GEN_QUESTIONS = require("../src/questions.json");
const { DEV_DEPENDENCIES, NAPI_DEPENDENCIES } = require("../src/dependencies.json");

// Vars
Spinner.DEFAULT_SPINNER = "dots";

/**
 * @async
 * @function downloadNAPIHeader
 * @description Download and extract NAPI Headers
 * @param {!string} dest include directory absolute path
 * @returns {Promise<void>}
 */
async function downloadNAPIHeader(dest) {
    const tarFile = await downloadNodeFile(File.Headers, { dest });

    /** @type {string} */
    let headerDir;
    try {
        headerDir = await extract(tarFile);
    }
    finally {
        await unlink(tarFile);
    }

    try {
        const [nodeVerDir] = await readdir(headerDir);
        const nodeDir = join(headerDir, nodeVerDir, "include", "node");

        await Promise.all([
            copyFile(join(nodeDir, "node_api.h"), join(dest, "node_api.h")),
            copyFile(join(nodeDir, "node_api_types.h"), join(dest, "node_api_types.h"))
        ]);
    }
    finally {
        await premove(headerDir);
    }
}

/**
 * @async
 * @function main
 * @description Main Generator CLI
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
    const response = await qoa.prompt(GEN_QUESTIONS);
    const projectName = filterPackageName(response.projectname);
    if (projectName.length <= 1 || projectName.length > 214) {
        throw new Error("The project name must be of length 2<>214");
    }
    console.log(`Creating project: ${projectName}\n`);

    switch (response.covpackage) {
        case "nyc": {
            DEV_DEPENDENCIES.push("nyc");
            DEFAULT_PKG.scripts.coverage = "nyc npm test";
            DEFAULT_PKG.scripts.report = "nyc report --reporter=html";
            break;
        }
        case "c8": {
            DEV_DEPENDENCIES.push("c8");
            DEFAULT_PKG.scripts.coverage = "c8 -r=\"html\" npm test";
            break;
        }
    }

    if (response.env || response.covpackage === "c8") {
        DEV_DEPENDENCIES.push("dotenv");
        await writeFile(join(cwd, ".env"), "");
        if (response.covpackage === "c8") {
            await appendFile(join(cwd, ".env"), `NODE_V8_COVERAGE="${join(cwd, "coverage")}"\n`);
        }
    }

    // If this is a NAPI project
    if (response.type === "NAPI") {
        // Push devDependencies for NAPI project
        DEV_DEPENDENCIES.push("node-gyp", "prebuildify", "cross-env");

        // Update DEFAULT_PKG Scripts
        DEFAULT_PKG.scripts.prebuilds = "prebuildify --napi";
        DEFAULT_PKG.scripts.build = "cross-env node-gyp configure && node-gyp build";

        // Download include files
        console.log("Download NAPI C/C++ header");
        {
            const includeDir = join(cwd, "include");
            await mkdir(join(cwd, "include"), { recursive: true });
            await downloadNAPIHeader(includeDir);
            await transfertFiles(DEFAULT_FILES_INCLUDE, includeDir);
        }

        // Handle binding.gyp
        const buf = await readFile(join(TEMPLATE_DIR, "binding.gyp"));
        const gyp = JSON.parse(buf.toString());

        gyp.targets[0].target_name = projectName;
        gyp.targets[0].sources = [`${projectName}.cpp`];

        // Create .cpp file at the root of the project
        await Promise.all([
            writeFile(join(cwd, `${projectName}.cpp`), cppTemplate(projectName)),
            writeFile(join(cwd, "binding.gyp"), JSON.stringify(gyp, null, FILE_INDENTATION))
        ]);
    }

    // If the project is a binary project
    if (response.type === "CLI" || response.binary) {
        await mkdir(join(cwd, "bin"), { recursive: true });
        const { binName } = await qoa.input({
            query: "What is the name of the binary command ?",
            handle: "binName"
        });
        DEFAULT_PKG.bin = {
            [binName]: "./bin/index.js"
        };
        await writeFile(join(cwd, "bin", "index.js"), "#!/usr/bin/env node");
    }

    // Handle Package.json
    {
        const npmRegistry = new Registry();
        const cwdPackage = join(cwd, "package.json");

        const buf = await readFile(cwdPackage);
        const pkg = JSON.parse(buf.toString());
        pkg.name = `@slimio/${projectName}`;
        pkg.version = response.version;
        pkg.description = response.projectdesc;
        pkg.dependencies = {};
        pkg.devDependencies = {};

        // Search for Dependencies if NAPI
        if (response.type === "NAPI") {
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

        if (response.husky) {
            const buf = await readFile(join(DEFAULT_FILES_TEST, "test.js"));
            const testFolderPath = join(cwd, "test");
            await mkdir(testFolderPath);
            await writeFile(join(testFolderPath, "test.js"), buf.toString());
        }
        else {
            delete DEFAULT_PKG.husky;
        }
        await writeFile(cwdPackage, JSON.stringify(Object.assign(pkg, DEFAULT_PKG), null, FILE_INDENTATION));
    }

    // Handle README.md
    console.log("Writing default README.md");
    const buf = await readFile(join(TEMPLATE_DIR, "README.md"));
    const MDTemplate = response.type === "Addon" ? "addon.md" : "default.md";
    const gettingStarted = await readFile(join(TEMPLATE_DIR, "readme", MDTemplate), "utf-8");

    const finalReadme = buf.toString()
        .replace(/\${getting_started}/gm, gettingStarted)
        .replace(/\${title}/gm, upperCase(projectName))
        .replace(/\${version}/gm, response.version)
        .replace(/\${package}/gm, `@slimio/${projectName}`)
        .replace(/\${desc}/gm, `${response.projectdesc}`);

    await writeFile(join(cwd, "README.md"), finalReadme);

    // Write Manifest
    manifest.create({
        name: projectName,
        version: response.version,
        type: response.type
    }, void 0, true);

    if (!response.binary) {
        console.log("Write index.js file!");
        await writeFile("index.js", "");
    }

    const spinner = new Spinner().start("Installing packages...");
    try {
        await execa("npm install");
        spinner.succeed();
    }
    catch (err) {
        spinner.failed(err.message);
    }
    console.log("\n > Done with no errors...\n\n");
}
main().catch(console.error);
