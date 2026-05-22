import web from './web.js';
import JSON5 from 'json5'
import fs from 'fs';
import path from 'path';

let options = {};

await (async function () {
    const fsp = fs.promises;
    const FILEARGMATCH = /\.json5?$/i;
    let filePath;

    process.argv.forEach(function (val) {
        if (FILEARGMATCH.test(val)) {
            filePath = val;
        }
    });

    filePath = filePath || process.env.CONTACTCONFIG || path.join('config/config.json5');

    try {
        const fileContents = await fsp.readFile(filePath, {encoding: 'utf-8'});
        try {
            options = JSON5.parse(fileContents);
        }
        catch(err) {
            console.error('Config file was found but failed to parse. Please fix your config and try again.');
            console.error(err);
            process.exit(1);
        }
    }
    catch {
        console.log(`Failed to read file "${filePath}". A config file will not be used.`);
    }
})();

let w = new web(options);
process.on('SIGTERM', w.close);
