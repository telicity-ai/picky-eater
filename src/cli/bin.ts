import { main } from './main.js';

const major = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(major) || major < 22) {
  process.stderr.write(`picky-eater requires Node.js 22 or newer (found ${process.versions.node}).\n`);
  process.exit(1);
}

void main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
