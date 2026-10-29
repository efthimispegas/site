import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { brotliCompress, gzip, constants } from 'node:zlib';
import { promisify } from 'node:util';
const brotli = promisify(brotliCompress),
  zip = promisify(gzip);
/** Sidecars preserve decoded approved bytes and work on static hosting. */
export function staticCompression() {
  let output;
  async function compress(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await compress(file);
        continue;
      }
      if (!['.glb', '.js', '.css', '.json', '.ttf'].includes(extname(file)))
        continue;
      const bytes = await readFile(file);
      if (bytes.length < 1024) continue;
      const [br, gz] = await Promise.all([
        brotli(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }),
        zip(bytes, { level: 6 }),
      ]);
      if (br.length < bytes.length) await writeFile(file + '.br', br);
      if (gz.length < bytes.length) {
        await writeFile(file + '.gz', gz);
        if (extname(file) === '.glb') await writeFile(file + '.gz.bin', gz);
      }
    }
  }
  return {
    name: 'pegasoft-static-compression',
    apply: 'build',
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      return compress(output);
    },
  };
}
