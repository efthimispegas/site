import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, extname, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const app = resolve(import.meta.dirname, '..');
const workspace = resolve(app, '../..');
const source = resolve(workspace, 'artifacts/pegasoft-concept');
const entry = 'review/ship-jet-integration.html';
const checking = process.argv.includes('--check');
const refreshing = process.argv.includes('--refresh-packaging');
const hash = data => createHash('sha256').update(data).digest('hex');
const read = path => readFileSync(resolve(source, path));
const output = new Map(), records = new Map(), assetPaths = new Set(), modules = new Set();
const imports = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?(['"])([^'"\n]+)\1/g;
const local = (owner, path) => {
  const absolute = resolve(source, dirname(owner), path.split(/[?#]/)[0]);
  const result = relative(source, absolute).replaceAll('\\', '/');
  if (result.startsWith('../') || !existsSync(absolute)) throw Error(`Unresolved input: ${owner} -> ${path}`);
  return result;
};
function emit(target, data, input, treatment) {
  output.set(target, Buffer.isBuffer(data) ? data : Buffer.from(data));
  if (input) records.set(input, { source: input, sourceSha256: hash(read(input)), packaged: target,
    packagedSha256: hash(output.get(target)), treatment });
}
function asset(path) {
  assetPaths.add(path);
  emit(`public/assets/${path}`, read(path), path, 'byte-identical runtime asset');
  return `/assets/${path}`;
}
function module(path) {
  if (modules.has(path)) return;
  modules.add(path);
  let text = read(path).toString();
  text = text.replace(imports, (match, quote, specifier) => {
    let dependency;
    if (specifier === 'three') dependency = 'review/vendor/three/build/three.module.js';
    else if (specifier.startsWith('three/addons/')) dependency = 'review/vendor/three/examples/jsm/' + specifier.slice(13);
    else if (specifier.startsWith('.')) dependency = local(path, specifier);
    else throw Error(`Unexpected external module: ${path} -> ${specifier}`);
    module(dependency);
    let address = posix.relative(posix.dirname(path), dependency);
    if (!address.startsWith('.')) address = './' + address;
    const suffix = specifier.match(/[?#].*$/)?.[0] || '';
    return match.replace(quote + specifier + quote, quote + address + suffix + quote);
  });
  let usesAssets = false;
  text = text.replace(/(['"])(\.\.\/generation\/[^'"\n]+)\1/g, (match, quote, specifier) => {
    const pathToAsset = local(path, specifier);
    if (['.js', '.mjs'].includes(extname(pathToAsset))) return match;
    asset(pathToAsset); usesAssets = true;
    return `assets[${JSON.stringify(pathToAsset)}]`;
  });
  if (usesAssets) {
    let address = posix.relative(posix.dirname(path), 'review/runtime-assets.js');
    if (!address.startsWith('.')) address = './' + address;
    text = `import { assets } from ${JSON.stringify(address)};\n` + text;
  }
  emit(path, text, path, text === read(path).toString() ? 'byte-identical module' : 'import/asset addressing only');
}
let html = read(entry).toString();
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
html = html.replace(/<link\b[^>]*href=(['"])([^'"]+\.css)\1[^>]*>/g, (match, quote, address) => {
  const path = local(entry, address);
  emit(path, read(path), path, 'byte-identical stylesheet');
  // Preserve the original cascade; Vite moves extracted linked CSS to the end of <head>.
  return `<style data-approved-stylesheet=${quote}${path}${quote}>${read(path).toString()}</style>`;
});
html = html.replace(/\b(src|href)=(['"])([^'"]+)\2/g, (match, attribute, quote, address) => {
  if (/^(?:https?:|#|data:)/.test(address)) return match;
  const clean = address.split(/[?#]/)[0];
  if (clean.endsWith('.js')) { module(local(entry, address)); return match; }
  if (clean.endsWith('.css')) {
    const path = local(entry, address);
    emit(path, read(path), path, 'byte-identical stylesheet');
    return match;
  }
  if (clean.endsWith('.html') || address.includes('evidence/')) {
    const original = new URL(address, 'http://127.0.0.1:8767/' + entry).href;
    return `${attribute}=${quote}${original}${quote}`;
  }
  return `${attribute}=${quote}${asset(local(entry, address))}${quote}`;
});
html = html.replace(/url\(([^)]+)\)/g, (match, address) => {
  const clean = address.replace(/^['"]|['"]$/g, '');
  if (/^(?:https?:|data:|#)/.test(clean)) return match;
  return `url(${asset(local(entry, clean))})`;
});
emit(entry, html, entry, 'import map removed; asset/reference addressing only');
for (const path of ['review/fonts/manrope-OFL.txt', 'review/fonts/dmsans-OFL.txt', 'review/vendor/three/LICENSE']) {
  if (!existsSync(resolve(source, path))) throw Error(`Missing license: ${path}`);
  asset(path);
}
const registry = [...assetPaths].sort().map(path =>
  `  ${JSON.stringify(path)}: new URL(import.meta.env.BASE_URL + ${JSON.stringify('assets/' + path)}, location.origin).href,`).join('\n');
emit('review/runtime-assets.js', `// Generated addressing table; approved asset bytes remain unchanged.\nexport const assets = Object.freeze({\n${registry}\n});\n`);
const manifestPath = resolve(app, 'baseline-manifest.json');
const amendmentPath = resolve(app, 'runtime-amendments.json');
const refactorPath = resolve(app, 'controller-refactor-manifest.json');
const manifest = {
  schemaVersion: 1, stage: 'packaging_only', entry, threeRevision: '182',
  sourceRoot: 'artifacts/pegasoft-concept',
  sourceCommit: checking ? JSON.parse(readFileSync(manifestPath)).sourceCommit : execFileSync('git', ['rev-parse', 'HEAD'], {cwd:workspace,encoding:'utf8'}).trim(),
  approval: 'evidence/ship-jet-integration/user-approval.json',
  userAcceptedPackaging: false, runtimeRefactored: false,
  sources: [...records.values()].sort((a,b)=>a.source.localeCompare(b.source)),
  generated: [{path:'review/runtime-assets.js',sha256:hash(output.get('review/runtime-assets.js'))}],
};
if (checking) {
  if (JSON.stringify(JSON.parse(readFileSync(manifestPath))) !== JSON.stringify(manifest)) throw Error('Baseline manifest differs from approved source closure');
  const amendments = existsSync(amendmentPath) ? JSON.parse(readFileSync(amendmentPath)) : null;
  const amended = new Map();
  if (amendments) {
    if (amendments.baseManifestSha256 !== hash(readFileSync(manifestPath))) throw Error('Amendment baseline pin differs');
    const allowed = ['review/cloud-story-layers.js','review/ship-jet-sequence.js','review/ship-jet-integration.js'];
    if (amendments.files.length !== allowed.length) throw Error('Unexpected amendment scope');
    for (const row of amendments.files) {
      if (!allowed.includes(row.path) || amended.has(row.path)) throw Error('Unexpected amended file');
      if (row.baselinePackagedSha256 !== hash(output.get(row.path))) throw Error('Amendment original input pin differs');
      amended.set(row.path,row.sha256);
    }
    if (amendments.addedFiles.length !== 1 || amendments.addedFiles[0].path !== 'review/cloud-motion.js') throw Error('Unexpected added runtime scope');
    for (const row of amendments.addedFiles) if (hash(readFileSync(resolve(app,row.path))) !== row.sha256) throw Error('New motion module drift');
  }
  const transportPath=resolve(app,'transport-integration-manifest.json');
  const transportOverrides=new Map();
  const homepagePath=resolve(app,'homepage-integration-manifest.json');
  const homepageOverrides=new Map();
  if(existsSync(homepagePath)){
    const homepage=JSON.parse(readFileSync(homepagePath));
    if(homepage.previousTransportManifestSha256!==hash(readFileSync(transportPath)))throw Error('Homepage transport pin drift');
    const allowed=['src/journey-host.js','src/main.js','index.html'];
    if(homepage.files.length!==allowed.length||new Set(homepage.files.map(r=>r.path)).size!==allowed.length)throw Error('Unexpected homepage override scope');
    const motionPath=resolve(app,'website-motion-manifest.json'),motion=existsSync(motionPath)?JSON.parse(readFileSync(motionPath)).files:[];
    for(const row of homepage.files){
      const next=motion.find(r=>r.path===row.path);if(next&&next.previousSha256!==row.sha256)throw Error('Motion accepted homepage drift');
      const before=resolve(source,'evidence/homepage-opening-outcome/accepted-transport',row.path);
      if(!allowed.includes(row.path)||hash(readFileSync(before))!==row.previousSha256||hash(readFileSync(resolve(app,row.path)))!==(next?.sha256||row.sha256))throw Error('Homepage baseline/output drift');
      homepageOverrides.set(row.path,{...row,sha256:next?.sha256||row.sha256});
    }
  }
  if(existsSync(transportPath)){
    const transport=JSON.parse(readFileSync(transportPath));
    if(transport.previousRefactorSha256!==hash(readFileSync(refactorPath)))throw Error('Transport refactor input pin differs');
    if(transport.approvedWebsiteChecksSha256!==hash(readFileSync(resolve(source,'evidence/website-host/checks.json'))))throw Error('Transport accepted website pin differs');
    if(!existsSync(resolve(source,'evidence/website-host/user-approval.json')))throw Error('Transport requires website approval record');
    const allowed=['review/ship-jet-controller.js','review/ship-jet-scene.js','review/cloud-story-sequence.js','src/journey-host.js','src/journey.css','index.html','review/handoff-lift-rig.js','review/lift-container-contact.js'];
    if(transport.files.length!==allowed.length||new Set(transport.files.map(r=>r.path)).size!==allowed.length)throw Error('Unexpected transport changes');
    for(const row of transport.files){
      if(!allowed.includes(row.path))throw Error('Unexpected transport path');
      const frozen=resolve(source,'evidence/transport-assembly/accepted-inputs',row.path);
      if(hash(readFileSync(frozen))!==row.previousSha256||hash(readFileSync(resolve(app,row.path)))!==(homepageOverrides.get(row.path)?.sha256||row.sha256))throw Error('Transport input/output drift');
      transportOverrides.set(row.path,row);
    }
    const added=['src/transport-timeline.js','src/transport-sequence.js','src/transport-controller.js','src/road-deck-registration.js'];
    if(transport.addedFiles.length!==added.length||new Set(transport.addedFiles.map(r=>r.path)).size!==added.length)throw Error('Unexpected transport modules');
    for(const row of transport.addedFiles)if(!added.includes(row.path)||hash(readFileSync(resolve(app,row.path)))!==row.sha256)throw Error('Transport module drift');
  }
  const approvedOverrides=new Map(amended);
  for (const [path, data] of output) {
    if (existsSync(refactorPath)) {
      const refactor=JSON.parse(readFileSync(refactorPath));
      if(refactor.approvedAmendmentsSha256!==hash(readFileSync(amendmentPath)))throw Error('Refactor approval pin differs');
      if(refactor.acceptedReferenceSha256!==hash(readFileSync(resolve(source,'evidence/controller-refactor/accepted-reference.json'))))throw Error('Accepted reference pin differs');
      const allowed=['review/ship-jet-integration.js','review/cloud-story-layers.js','review/jet-crossing.js','review/ship-water.js'];
      if(refactor.files.length!==allowed.length||new Set(refactor.files.map(row=>row.path)).size!==allowed.length)throw Error('Unexpected controller scope');
      for(const row of refactor.files){
        if(!allowed.includes(row.path))throw Error('Unexpected controller file');
        const previous=approvedOverrides.get(row.path)||hash(output.get(row.path));
        if(row.acceptedSha256!==previous)throw Error('Accepted controller input pin differs');
      }
      const added=['review/runtime-lifecycle.js','review/ship-jet-controller.js','review/ship-jet-scene.js','review/ship-jet-inspection.js'];
      if(refactor.addedFiles.length!==added.length||new Set(refactor.addedFiles.map(row=>row.path)).size!==added.length)throw Error('Unexpected controller module scope');
      for(const row of refactor.addedFiles){const change=transportOverrides.get(row.path);if(change&&change.previousSha256!==row.sha256)throw Error('Transport controller input drift');if(!added.includes(row.path)||hash(readFileSync(resolve(app,row.path)))!==(homepageOverrides.get(row.path)?.sha256||change?.sha256||row.sha256))throw Error('Controller module drift');}
      const row=refactor.files.find(row=>row.path===path);
      if(row)amended.set(path,row.sha256);
    }
    const change=transportOverrides.get(path),previous=amended.get(path)||hash(data);
    const homepage=homepageOverrides.get(path);
    if(homepage&&homepage.previousSha256!==(change?.sha256||previous))throw Error('Homepage accepted source pin drift');
    if(change&&change.previousSha256!==previous)throw Error('Transport baseline input drift');
    if (!existsSync(resolve(app, path)) || hash(readFileSync(resolve(app, path))) !== (homepage?.sha256||change?.sha256||previous)) throw Error(`Packaged input drift: ${path}`);
  }
} else {
  if (existsSync(amendmentPath)) throw Error('Runtime amendments exist; packaging must not overwrite commissioned changes');
  if (existsSync(manifestPath)) {
    if (!refreshing) throw Error('Baseline already exists; inspect changes before replacing it');
    const previous=JSON.parse(readFileSync(manifestPath));
    for(const row of previous.sources) if(hash(read(row.source))!==row.sourceSha256) throw Error(`Approved source drift: ${row.source}`);
    manifest.sourceCommit=previous.sourceCommit;
  }
  for (const [path, data] of output) { mkdirSync(dirname(resolve(app, path)), {recursive:true}); writeFileSync(resolve(app, path), data); }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
console.log(JSON.stringify({status:checking?'baseline_verified':'baseline_packaged',modules:modules.size,assets:assetPaths.size,sourceInputs:records.size}));
