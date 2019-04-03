// Require Node.js Dependencies
const { createReadStream, createWriteStream, promises: { readdir } } = require("fs");
const { promisify } = require("util");
const { join } = require("path");
const stream = require("stream");

const pipeline = promisify(stream.pipeline);

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
        await pipeline(
            createReadStream(join(currDir, fileName)),
            createWriteStream(join(targetDir, fileName))
        );
    }
}

/**
 * @func filterPackageName
 * @param {!String} name package name
 * @returns {String}
 */
function filterPackageName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\./, "")
        .replace(/_/, "-")
        .replace(/\s/, "");
}

module.exports = { transfertFiles, filterPackageName };
