"use strict";

// Require Node.js Dependencies
const { createReadStream, createWriteStream, promises: { readdir } } = require("fs");
const { promisify } = require("util");
const { join } = require("path");
const stream = require("stream");

// Require Third-party Dependencies
const { taggedString } = require("@slimio/utils");

// Create Async methods
const pipeline = promisify(stream.pipeline);

/**
 * @async
 * @function transfertFiles
 * @description Transfer all files in a given directory to a new given directory (the target).
 * @param {!string} currDir current Directory where file are stored
 * @param {!string} targetDir target Directory where files should be transfered
 * @returns {Promise<void>}
 */
async function transfertFiles(currDir, targetDir) {
    const AllFiles = await readdir(currDir);

    const _p = [];
    for (const fileName of AllFiles) {
        _p.push(pipeline(
            createReadStream(join(currDir, fileName)),
            createWriteStream(join(targetDir, fileName))
        ));
    }
    await Promise.all(_p);
}

/**
 * @function filterPackageName
 * @param {!string} name package name
 * @returns {string}
 */
function filterPackageName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\./, "")
        .replace(/_/, "-")
        .replace(/\s/, "");
}

/**
 * @function upperCase
 * @description Uppercase first letter of word
 * @param {!string} word string to uppercase
 * @returns {string}
 */
function upperCase(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

const cppTemplate = taggedString`
#include "napi.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // exports.Set("methodName", Napi::Function::New(env, methodName));

    return exports;
}

NODE_API_MODULE(${0}, Init)
`;

module.exports = { transfertFiles, filterPackageName, cppTemplate, upperCase };
