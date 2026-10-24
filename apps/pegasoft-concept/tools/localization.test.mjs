import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveLocale,localeUrl,localizeHtml,translate,messageSource,formatNumber,decimalSeparator} from '../src/locale-messages.js';
import {greek} from '../src/locales/el.js';
import {deploymentConfig} from './deployment-config.mjs';
import {CONSENT_KEY,readConsent,storeConsent} from '../src/cookie-consent.js';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Greek launch fallback; explicit URL wins preference, unknown locale falls back',()=>{
 assert.equal(resolveLocale(),'el');assert.equal(resolveLocale({stored:'en'}),'en');
 assert.equal(resolveLocale({pathname:'/el/',stored:'en'}),'el');assert.equal(resolveLocale({pathname:'/en/',stored:'el'}),'en');
 assert.equal(resolveLocale({pathname:'/en/',search:'?lang=el',stored:'en'}),'el');assert.equal(resolveLocale({stored:'fr'}),'el');
});
test('switch URL preserves current location and query without creating nested locale prefixes',()=>{
 assert.equal(localeUrl('http://localhost/el/?revision=test&lang=el#contact','en').href,'http://localhost/en/?revision=test#contact');
 assert.equal(localeUrl('https://example.test/en/insights/?page=2','el').pathname,'/el/insights/');
});
test('static bilingual pages translate content and metadata while preserving scripts and assets',()=>{
 const el=localizeHtml(source,'el',{origin:'https://site.example'}),en=localizeHtml(source,'en',{origin:'https://site.example'});
 assert.match(el,/<html lang="el"/);assert.match(en,/<html lang="en"/);
 assert.ok(el.includes('Κάθε ιδέα'));assert.ok(en.includes('Every idea'));
 assert.match(el, /data-locale="el"[^>]*aria-checked="true"/);assert.match(en, /data-locale="en"[^>]*aria-checked="true"/);
 assert.ok(el.includes('data-language-flag aria-hidden="true">🇬🇷'));assert.ok(en.includes('data-language-flag aria-hidden="true">🇬🇧'));
 assert.ok(el.includes('98,5%'));
 assert.ok(el.includes('data-msg="ship.engineered">Τεχνικές'));assert.ok(en.includes('data-msg="ship.engineered">Engineered'));
 assert.ok(el.includes('https://site.example/el/'));assert.ok(en.includes('https://site.example/en/'));
 const scripts=html=>html.match(/<script\b[^>]*>[\s\S]*?<\/script>/g);
 assert.deepEqual(scripts(el),scripts(source));assert.deepEqual(scripts(en),scripts(source));
 const assets=html=>[...html.matchAll(/(?:src|href)="([^"\s]+)"/g)].map(m=>m[1]);
 assert.deepEqual(assets(el),assets(source));
});
test('catalog is reversible without ambiguous messages; identity brands remain unchanged',()=>{
 const seen=new Map();for(const [key,value] of Object.entries(greek)){
  assert.ok(value.trim());assert.ok(!seen.has(value),`ambiguous Greek message: ${key} / ${seen.get(value)}`);seen.set(value,key);
  assert.equal(messageSource(value),key);
 }
 assert.equal(translate('PEGASOFT','el'),'PEGASOFT');assert.equal(translate('ship.engineered','en'),'Engineered');
});
test('Greek numeric formatting changes presentation without changing metric targets',()=>{
 assert.equal(formatNumber(98.5,'el'),'98,5');assert.equal(formatNumber(98.5,'en'),'98.5');assert.equal(decimalSeparator('el'),',');
});
test('landing consent remembers explicit accept/reject without enabling absent trackers',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(readConsent(storage),null);
 for(const choice of ['accept','reject','settings']){
  assert.equal(storeConsent(storage,choice),true);
  assert.deepEqual(readConsent(storage),{version:1,choice,necessary:true,analytics:false,marketing:false});
 }
 for(const value of ['bad json',JSON.stringify({necessary:true,analytics:false,marketing:false}),JSON.stringify({version:1,choice:'accept',necessary:true,analytics:true,marketing:false})]){
  values.set(CONSENT_KEY,value);assert.equal(readConsent(storage),null);
 }
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 assert.equal(readConsent(blocked),null);assert.equal(storeConsent(blocked,'reject'),false);
 assert.equal(storeConsent(undefined,'accept'),false);
 assert.throws(()=>storeConsent(storage,'unknown'));
});

test('deployment configuration is explicit, allowlisted and validates only an HTTPS origin',()=>{
 assert.deepEqual(deploymentConfig({}),{origin:''});
 assert.throws(()=>deploymentConfig({},{production:true}),/PEGASOFT_PUBLIC_SITE_URL/);
 assert.deepEqual(deploymentConfig({PEGASOFT_PUBLIC_SITE_URL:'https://review.example/',PRIVATE_TOKEN:'never-expose'}),{origin:'https://review.example'});
 for(const value of ['http://site.example','https://user:password@site.example','https://site.example/path','https://site.example/?token=private','https://site.example/#private','invalid'])assert.throws(()=>deploymentConfig({PEGASOFT_PUBLIC_SITE_URL:value}),/HTTPS origin/);
 const output=localizeHtml(source,'el',deploymentConfig({PEGASOFT_PUBLIC_SITE_URL:'https://review.example',PRIVATE_TOKEN:'never-expose'}));
 assert.ok(output.includes('https://review.example/el/'));
 assert.ok(output.includes('https://review.example/assets/social/hero-card-el-20261019.jpg'));
 assert.ok(!output.includes('never-expose'));
});
