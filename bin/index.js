#!/usr/bin/env node
/* eslint-disable require-atomic-updates */
"use strict";

// Require Node.js Dependencies
const { readFile, writeFile, unlink, readdir, copyFile, mkdir, rmdir } = require("fs").promises;
const { join } = require("path");
const { performance } = require("perf_hooks");

// Require Third-party Dependencies
const spawn = require("cross-spawn");
const qoa = require("qoa");
const Registry = require("@slimio/npm-registry");
const manifest = require("@slimio/manifest");
const Spinner = require("@slimio/async-cli-spinner");
const { gray, yellow, cyan, green, white, underline, red } = require("kleur");
const { downloadNodeFile, extract, constants: { File } } = require("@slimio/nodejs-downloader");
const { validate, CONSTANTS } = require("@slimio/validate-addon-name");

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
const TEST_SCRIPTS = {
    ava: "cross-env psp && ava --verbose",
    japa: "cross-env psp && node test/test.js",
    jest: "cross-env psp && jest --coverage"
};

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
        await rmdir(headerDir, { recursive: true });
    }
}

/**
 * @async
 * @function generateTest
 * @param {!string} libName
 * @returns {Promise<void>}
 */
async function generateTest(libName) {
    const testPath = join(process.cwd(), "test");
    await mkdir(testPath, { recursive: true });

    const buf = await readFile(join(DEFAULT_FILES_TEST, `${libName}.js`));
    await writeFile(join(testPath, "test.js"), buf.toString());
}

/**
 * @async
 * @function getQueriesResponse
 * @returns {Promise<object>}
 */
async function getQueriesResponse() {
    const response = {};
    let skipNext = false;
    for (const row of GEN_QUESTIONS) {
        if (skipNext) {
            skipNext = false;
            continue;
        }
        if (Reflect.has(row, "description")) {
            console.log(`\n ${yellow().bold("> note:")} ${gray().bold(row.description)}\n`);
            delete row.description;
        }

        row.query = underline().white().bold(row.query);
        if (row.type === "interactive") {
            row.symbol = "->";
        }
        const ret = await qoa.prompt([row]);
        if (row.handle === "testfw" && ret.testfw === "jest") {
            skipNext = true;
            response.covpackage = null;
        }

        Object.assign(response, ret);
        console.log(gray().bold("----------------------------"));
    }

    return response;
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
        console.log(red().bold("Cannot execute at the root of the project"));
        process.exit(0);
    }

    console.log(gray().bold(`\n > Executing generator at ${yellow().bold(cwd)}\n`));

    // Prompt all questions
    const response = await getQueriesResponse();
    const projectName = filterPackageName(response.projectname);
    if (projectName.length <= 1 || projectName.length > 214) {
        console.log(red().bold("The project name must be of length 2<>214"));
        process.exit(0);
    }

    // Check the addon package name
    if (response.type === "Addon" && !validate(projectName)) {
        console.log(red().bold(`The addon name not matching expected regex ${CONSTANTS.VALIDATE_REGEX}`));
        process.exit(0);
    }

    console.log(gray().bold(`\n > Start configuring project ${cyan().bold(projectName)}\n`));

    // Create initial package.json && write default projects files
    spawn.sync("npm", ["init", "-y"]);
    await transfertFiles(DEFAULT_FILES_DIR, cwd);
    await mkdir(join(cwd, "src"), { recursive: true });

    DEFAULT_PKG.keywords.push("SlimIO", projectName);
    DEFAULT_PKG.scripts.test = TEST_SCRIPTS[response.testfw];
    DEV_DEPENDENCIES.push(response.testfw);
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
        default:
        // do nothing;
    }

    // Create .env file
    if (response.type === "Service" || response.env || response.covpackage === "c8") {
        DEV_DEPENDENCIES.push("dotenv");
        const envData = response.covpackage === "c8" ? `NODE_V8_COVERAGE="${join(cwd, "coverage")}"\n` : "";
        await writeFile(join(cwd, ".env"), envData);
    }

    // Create .npmrc file
    if (response.type === "Service" || response.npmrc) {
        const npmrcData = "package-lock=false";
        await writeFile(join(cwd, ".npmrc"), npmrcData);
    }

    // If this is a NAPI project
    if (response.type === "NAPI") {
        // Push devDependencies for NAPI project
        DEV_DEPENDENCIES.push("node-gyp", "prebuildify", "cross-env");

        // Update DEFAULT_PKG Scripts
        DEFAULT_PKG.scripts.prebuilds = "prebuildify --napi";
        DEFAULT_PKG.scripts.build = "cross-env node-gyp configure && node-gyp build";

        // Download include files
        const spinner = new Spinner({ prefixText: white().bold("Setup & configure N-API files") });
        spinner.start("Downloading N-API Header");
        try {
            const includeDir = join(cwd, "include");
            const start = performance.now();

            await mkdir(join(cwd, "include"), { recursive: true });
            await Promise.all([
                downloadNAPIHeader(includeDir),
                transfertFiles(DEFAULT_FILES_INCLUDE, includeDir),
                async() => {
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
            ]);

            const executeTimeMs = green().bold(`${(performance.now() - start).toFixed(2)}ms`);
            spinner.succeed(`Done in ${executeTimeMs}`);
        }
        catch (err) {
            spinner.failed(err.message);
        }
    }

    // If the project is a binary project
    if (response.type === "CLI" || response.binary) {
        await mkdir(join(cwd, "bin"), { recursive: true });
        await writeFile(join(cwd, "bin", "index.js"), "#!/usr/bin/env node");

        const { binName } = await qoa.input({
            query: white().bold("What is the name of the binary command ?"),
            handle: "binName"
        });
        console.log(gray().bold("----------------------------\n"));

        DEFAULT_PKG.bin = { [binName]: "./bin/index.js" };
        DEFAULT_PKG.husky.hooks["pre-push"] = "cross-env eslint bin/index.js && npm test";
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
            const Packages = await Promise.all(
                NAPI_DEPENDENCIES.map((pkgName) => npmRegistry.package(pkgName))
            );
            for (const Pkg of Packages) {
                pkg.dependencies[Pkg.name] = `^${Pkg.lastVersion}`;
            }
        }

        // Search for DevDependencies
        const spinner = new Spinner({ prefixText: white().bold("Seeking latest package(s) version") }).start("Fetching...");
        try {
            const start = performance.now();
            const Packages = await Promise.all(
                DEV_DEPENDENCIES.map((pkgName) => npmRegistry.package(pkgName))
            );
            for (const Pkg of Packages) {
                pkg.devDependencies[Pkg.name] = `^${Pkg.lastVersion}`;
            }

            const executeTimeMs = green().bold(`${(performance.now() - start).toFixed(2)}ms`);
            spinner.succeed(`Fetched all latest versions in ${executeTimeMs}`);
        }
        catch (err) {
            spinner.failed(err.message);
        }

        await generateTest(response.testfw);
        await writeFile(cwdPackage, JSON.stringify(Object.assign(pkg, DEFAULT_PKG), null, FILE_INDENTATION));
    }

    // Handle README.md
    const ReadmeSpinner = new Spinner({ prefixText: white().bold("Setup README.md") }).start("Read file");
    try {
        const start = performance.now();
        const buf = await readFile(join(TEMPLATE_DIR, "README.md"));
        const MDTemplate = response.type === "Addon" ? "addon.md" : "default.md";
        const gettingStarted = await readFile(join(TEMPLATE_DIR, "readme", MDTemplate), "utf-8");

        ReadmeSpinner.text = "Replacing inner variables...";
        const finalReadme = buf.toString()
            .replace(/\${getting_started}/gm, gettingStarted)
            .replace(/\${lower-name}/gm, projectName.toLocaleLowerCase())
            .replace(/\${title}/gm, upperCase(projectName))
            .replace(/\${version}/gm, response.version)
            .replace(/\${package}/gm, `@slimio/${projectName}`)
            .replace(/\${desc}/gm, `${response.projectdesc}`);

        ReadmeSpinner.text = "Writing file to disk!";
        await writeFile(join(cwd, "README.md"), finalReadme);

        const executeTimeMs = green().bold(`${(performance.now() - start).toFixed(2)}ms`);
        ReadmeSpinner.succeed(`Done in ${executeTimeMs}`);
    }
    catch (err) {
        ReadmeSpinner.failed(err.message);
    }

    // Write Manifest
    manifest.create({
        name: projectName,
        version: response.version,
        type: response.type
    }, void 0, true);

    if (!response.binary) {
        await writeFile("index.js", "\"use strict\";\n");
    }

    const spinner = new Spinner().start(white().bold(`Running '${cyan().bold("npm install")}' on node_modules ...`));
    try {
        const start = performance.now();
        const child = spawn("npm", ["install"]);
        await new Promise((resolve, reject) => {
            child.once("close", resolve);
            child.once("error", reject);
        });

        const executeTimeMs = green().bold(`${((performance.now() - start) / 1000).toFixed(2)}ms`);
        spinner.succeed(white().bold(`Packages installed in ${executeTimeMs}`));
    }
    catch (err) {
        spinner.failed(red().bold(err.message));
    }
    console.log(gray().bold("\n > Done with no errors...\n\n"));
}
main().catch(console.error);
