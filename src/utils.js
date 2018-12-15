// Require Node.js Dependencies
const {
    createReadStream, createWriteStream,
    promises: { readdir, stat }
} = require("fs");
const { join } = require("path");
const chalk = require("chalk");

// Require Third-party Dependencies
const is = require("@slimio/is");

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
 * @function arborescence
 * @desc print the entire project tree
 * @param {!string} dir directory path. Path can handle "/" and "\" separator and not end with a separator
 * @param {number=} pDepth depth level from the root folder
 * @param {number=} pRootPath path of the root folder if there is recursivity
 * @returns {void}
 *
 * @example
 * tree("C:/path/to/your/directory/direcnewProject");
 * output expected :
 * ┌─📁bin
 * │ └ index1.js
 * ├─📁test
 * │ └ test.js
 * ├ .editorconfig
 * ├ .eslintrc
 * ├ .gitignore
 * ├ .npmignore
 * ├ .npmrc
 * ├ commitlint.config.js
 * ├ CONTRIBUTING.md
 * ├ index.js
 * ├ jsdoc.json
 * ├ LICENSE
 * ├ package.json
 * └ README.md
 */
async function tree(dir, pDepth = 0, pRootPath = null) {
    if (is.nullOrUndefined(dir)) {
        throw new Error("Current working directory path is missing");
    }
    if (dir.match(/\//gi)) {
        // eslint-disable-next-line
        dir = dir.replace(/\//gi, "\\");
    }
    if (dir.match(/\\$/gi)) {
        // eslint-disable-next-line
        dir = dir.replace(/\\$/gi, "");
    }

    const rootPath = pRootPath === null ? dir : pRootPath;
    // Calculate Depth with root folder and number of separators "\"
    const depth = is.nullOrUndefined(dir.replace(rootPath, "").match(/\\\w+/g)) ?
        0 : dir.replace(rootPath, "").match(/\\\w+/g).length;

    let strAddDepth = "";
    if (depth > 0) {
        for (let index = 0; index < depth; index++) {
            strAddDepth += "│ ";
        }
    }

    const elems = await readdir(dir);
    const files = [];
    let count = 0;

    // Print only one time at the begginning
    if (depth === 0) {
        console.log(chalk.greenBright("project tree :"));
    }

    for (const elem of elems) {
        const xstat = await stat(join(dir, elem));
        if (xstat.isDirectory()) {
            // Print folders befor files
            // Only for the first folder, beggin with ┌ insted of ├
            const strDir = depth === 0 && count === 0 ?
                chalk`{yellow ┌─📁}{yellow ${elem}}` :
                chalk`{yellow ├─📁}{yellow ${elem}}`;
            console.log(chalk`{yellow ${strAddDepth}}${(strDir)}`);

            await tree(join(dir, elem), depth, rootPath);
            count++;
        }
        else {
            files.push(elem);
        }
    }
    const last = files.length - 1;
    // Print all files after folders
    files.forEach((val, ind) => console.log(chalk`{yellow ${strAddDepth}${ind === last ? "└" : "├"}} {cyanBright ${val}}`));
}

module.exports = {
    transfertFiles,
    tree
};
