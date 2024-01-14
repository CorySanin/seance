import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import uglifyjs from "uglify-js";
import * as sass from 'sass';
import * as csso from 'csso';

const spawn = child_process.spawn;
const fsp = fs.promises;
const STYLESDIR = 'styles';
const SCRIPTSDIR = 'scripts';
const IMAGESDIR = path.join('assets', 'images');
const STYLEOUTDIR = process.env.STYLEOUTDIR || path.join(import.meta.dir, 'assets', 'css');
const SCRIPTSOUTDIR = process.env.SCRIPTSOUTDIR || path.join(import.meta.dir, 'assets', 'js');
const IMAGESOUTDIR = process.env.IMAGESOUTDIR || path.join(import.meta.dir, 'assets', 'webp');
const STYLEOUTFILE = process.env.STYLEOUTFILE || 'styles.css';
const SQUASH = new RegExp('^[0-9]+-');

async function emptyDir(dir: string) {
    await Promise.all((await fsp.readdir(dir, { withFileTypes: true })).map(f => path.join(dir, f.name)).map(p => fsp.rm(p, {
        recursive: true,
        force: true
    })));
}

async function mkdir(dir: string | string[]) {
    if (typeof dir === 'string') {
        await fsp.mkdir(dir, { recursive: true });
    }
    else {
        await Promise.all(dir.map(mkdir));
    }
}

// Process styles
async function styles() {
    await mkdir([STYLEOUTDIR, STYLESDIR]);
    await emptyDir(STYLEOUTDIR);
    let styles: string[] = [];
    let files = await fsp.readdir(STYLESDIR);
    await Promise.all(files.map(f => new Promise(async (res, reject) => {
        let p = path.join(STYLESDIR, f);
        console.log(`Processing style ${p}`);
        let style = sass.compile(p).css;
        if (f.charAt(0) !== '_') {
            if (SQUASH.test(f)) {
                styles.push(style);
            }
            else {
                let o = path.join(STYLEOUTDIR, f.substring(0, f.lastIndexOf('.')) + '.css');
                await fsp.writeFile(o, csso.minify(style).css);
                console.log(`Wrote ${o}`);
            }
        }
        res(0);
    })));
    let out = csso.minify(styles.join('\n')).css;
    let outpath = path.join(STYLEOUTDIR, STYLEOUTFILE);
    await fsp.writeFile(outpath, out);
    console.log(`Wrote ${outpath}`);
}

// Process scripts
async function scripts() {
    await mkdir([SCRIPTSOUTDIR, SCRIPTSDIR]);
    await emptyDir(SCRIPTSOUTDIR);
    let files = await fsp.readdir(SCRIPTSDIR);
    await Promise.all(files.map(f => new Promise(async (res, reject) => {
        let p = path.join(SCRIPTSDIR, f);
        let o = path.join(SCRIPTSOUTDIR, f);
        console.log(`Processing script ${p}`);
        try {
            await fsp.writeFile(o, uglifyjs.minify((await fsp.readFile(p)).toString()).code);
            console.log(`Wrote ${o}`);
        }
        catch (ex) {
            console.log(`error writing ${o}: ${ex}`);
        }
        res(0);
    })));
}

// Process images
async function images(dir = '') {
    let p = path.join(IMAGESDIR, dir);
    await mkdir(p);
    if (dir.length === 0) {
        await mkdir(IMAGESOUTDIR)
        await emptyDir(IMAGESOUTDIR);
    }
    let files = await fsp.readdir(p, {
        withFileTypes: true
    });
    if (files.length) {
        await Promise.all(files.map(f => new Promise(async (res, reject) => {
            if (f.isFile()) {
                let outDir = path.join(IMAGESOUTDIR, dir);
                let infile = path.join(p, f.name);
                let outfile = path.join(outDir, f.name.substring(0, f.name.lastIndexOf('.')) + '.webp');
                await mkdir(outDir);
                console.log(`Processing image ${infile}`)
                let process = spawn('cwebp', ['-mt', '-q', '50', infile, '-o', outfile]);
                let timeout = setTimeout(() => {
                    reject('Timed out');
                    process.kill();
                }, 30000);
                process.on('exit', async (code) => {
                    clearTimeout(timeout);
                    if (code === 0) {
                        console.log(`Wrote ${outfile}`);
                        res(null);
                    }
                    else {
                        reject(code);
                    }
                });
            }
            else if (f.isDirectory()) {
                images(path.join(dir, f.name)).then(res).catch(reject);
            }
        })));
    }
}

function isAbortError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError';
}

(async function () {
    await Promise.all([styles(), scripts(), images()]);
    if (process.argv.indexOf('--watch') >= 0) {
        console.log('watching for changes...');
        (async () => {
            try {
                const watcher = fsp.watch(STYLESDIR);
                for await (const _ of watcher)
                    await styles();
            } catch (err) {
                if (isAbortError(err))
                    return;
                throw err;
            }
        })();

        (async () => {
            try {
                const watcher = fsp.watch(SCRIPTSDIR);
                for await (const _ of watcher)
                    await scripts();
            } catch (err) {
                if (isAbortError(err))
                    return;
                throw err;
            }
        })();

        (async () => {
            try {
                const watcher = fsp.watch(IMAGESDIR, {
                    recursive: true // no Linux ☹️
                });
                for await (const _ of watcher)
                    await images();
            } catch (err) {
                if (isAbortError(err))
                    return;
                throw err;
            }
        })();
    }
})();
