// Require Node.js Dependencies
const {
    createReadStream, createWriteStream,
    promises: { readdir, stat }
} = require("fs");
const { join } = require("path");
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
 * ┌─/bin
 * │   └ index1.js
 * ├─/test
 * │   └ test.js
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
        dir = dir.replace(/\//gi, "\\");
        // throw new Error("presence of /");
    }
    // 
    if (dir.match(/\\$/gi)) {
        dir = dir.replace(/\\$/gi, "");
    }
    let strAddDepth = "";
    if (pDepth > 0) {
        for (let index = 0; index < pDepth; index++) {
            strAddDepth += "│   ";
        }
    }

    const rootPath = pRootPath === null ? dir : pRootPath;
    const elems = await readdir(dir);
    const files = [];
    let count = 0;

    for (const elem of elems) {
        const xstat = await stat(join(dir, elem));
        if (xstat.isDirectory()) {
            // Print folders before files in comparison to root folder
            const depth = pDepth > 0 ? dir.replace(rootPath, "").match(/\\/g).length + 1 : 1;
            // Only for the first folder beggin with ┌ insted of ├
            const strDir = depth === 1 && count === 0 ? `┌─/${elem}` : `├─/${elem}`;
            console.log(`${strAddDepth}${strDir}`);

            await tree(join(dir, elem), depth, rootPath);
            count++;
        }
        else {
            files.push(elem);
        }
    }
    const last = files.length - 1;
    // Print all files after folders
    files.forEach((val, ind) => console.log(`${strAddDepth}${ind === last ? "└" : "├"} ${val}`));
}

module.exports = {
    transfertFiles,
    tree
};
