/** Approved preview fields. Drafts stay in memory; this adapter never submits remotely. */
const shared=new Set(['name','email','company']);
export const CONTACT_FIELDS=Object.freeze({
 General:[['name','Name','text'],['email','Email','email'],['company','Company (optional)','text',true],['message','Message','textarea']],
 'Company owner':[['name','Name','text'],['email','Business email','email'],['company','Company / website','text'],['goals','Project goals','textarea']],
 Investor:[['name','Name','text'],['email','Email','email'],['firm','Firm','text'],['interest','Investment interest','textarea']],
 Careers:[['name','Name','text'],['email','Email','email'],['role','Role / discipline','text'],['portfolio','Portfolio / CV link','url']]
});
export function createContactForm({panel,scope}){
 const document=panel.ownerDocument,drafts={shared:{},General:{},'Company owner':{},Investor:{},Careers:{}};
 scope.listen(panel,'input',event=>{const input=event.target,key=input.dataset.field;if(!key)return;drafts[shared.has(key)?'shared':input.dataset.audience][key]=input.value;});
 scope.listen(panel,'submit',event=>{event.preventDefault();const form=event.target;if(!form.checkValidity())return;form.querySelector('output').textContent='Draft validated. Nothing has been sent; the submission endpoint is not connected.';});
 function show(audience){
  const form=document.createElement('form');form.id='contact-preview-form';form.className='contact-preview-form';
  for(const [key,text,type,optional=false]of CONTACT_FIELDS[audience]){
   const label=document.createElement('label');label.textContent=text;const input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;else input.rows=4;
   input.id='contact-field-'+key;input.name=key;input.required=!optional;input.dataset.field=key;input.dataset.audience=audience;input.value=drafts[shared.has(key)?'shared':audience][key]||'';input.autocomplete={name:'name',email:'email',company:'organization'}[key]||'off';label.htmlFor=input.id;label.append(input);form.append(label);
  }
  const button=document.createElement('button');button.type='submit';button.textContent='Review message';const status=document.createElement('output');status.id='contact-preview-status';status.setAttribute('aria-live','polite');form.append(button,status);panel.replaceChildren(form);
 }
 return {show};
}
