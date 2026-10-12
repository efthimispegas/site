const landmarks=[
 [230,'Ship content','The vessel stays on axis with the last centred content block entering from below.'],
 [234,'First veil','A thin cloud veil crosses from the left while the ship and last content continue receding.'],
 [238,'Cloud banks','The upper-left and lower/right banks enclose a central gap; the ship is still visible.'],
 [242,'Jet entrance','The nose starts entering at the left edge while the distant ship remains behind the cloud gap.'],
 [246,'Crossing overlap','The nose advances through the cloud view before the porcelain trust reveal.'],
 [250,'Trust reveal','The wing/fuselage crossing exposes the trust section from the left; clouds remain on the right.'],
 [274,'Tail exit','The trust section is exposed and the aircraft tail is leaving through the right edge.']
];
const host=document.querySelector('#landmarks'),img=document.querySelector('#landmark-image'),caption=document.querySelector('#landmark-caption');
function show(index){const [time,name,note]=landmarks[index];img.src=`../evidence/ship-jet-proposal/reference/frame-${time}.jpg`;img.alt=`Reference at ${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}: ${note}`;caption.textContent=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')} · ${name}. ${note}`;[...host.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}
landmarks.forEach(([time,name],i)=>{const button=document.createElement('button');button.type='button';button.textContent=`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')} · ${name}`;button.onclick=()=>show(i);host.append(button);});show(1);
try{const response=await fetch('../generation/cloud-family/input-proposal.json');if(!response.ok)throw Error('Manifest unavailable');const manifest=await response.json();document.querySelector('#prompts').textContent=manifest.inputs.map(input=>`${input.id} — ${input.role}\n\n${input.prompt}`).join('\n\n────────────────────\n\n');}catch(error){document.querySelector('#prompts').textContent='Open the input manifest below for the exact prompts.';console.error(error);}

const video=document.querySelector('video');
document.querySelector('#reference-play').onclick=()=>video.play().catch(error=>console.error(error));
document.querySelector('#reference-pause').onclick=()=>video.pause();
