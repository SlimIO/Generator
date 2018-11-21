// Require Node.js Dependencies
const {
    createReadStream, createWriteStream,
    promises: { readdir }
} = require("fs");
const { join } = require("path");

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

module.exports = {
    transfertFiles
};
