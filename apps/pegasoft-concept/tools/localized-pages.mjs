import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {localizeHtml} from '../src/locale-messages.js';
/** Static, crawler-readable localized homepages. Inspection entries stay frozen in English. */
export function localizedPages(){
 let directory;
 return {name:'pegasoft-localized-homepages',configResolved(config){directory=resolve(config.root,config.build.outDir);},async writeBundle(){
  const source=await readFile(resolve(directory,'index.html'),'utf8');
  for(const language of ['el','en']){await mkdir(resolve(directory,language),{recursive:true});await writeFile(resolve(directory,language,'index.html'),localizeHtml(source,language));}
  await writeFile(resolve(directory,'index.html'),localizeHtml(source,'el'));
 }};
}
