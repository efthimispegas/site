import json,re,hashlib
from pathlib import Path
base=Path('.superpowers/sdd/pegasoft-hero-baseline-plan');dest=base/'task2-closure'
logs=sorted(base.glob('*.log'))+sorted((base/'task2-rotation-probe').glob('*.log'))
pattern=re.compile(r'animationstart|animation-start|onsetIntervalPts|sourceOnset|onset interval|vectrfl',re.I)
clock=re.compile(r'currentTime|observedAtMs',re.I)
trace=re.compile(r'trace\.zip')
pins=[];matches=[];clockLogs=[];traceLogs=[]
for p in logs:
 b=p.read_bytes();s=re.sub(r'\x1b\[[0-9;]*m','',b.decode(errors='replace')); pins.append({'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 for n,line in enumerate(s.splitlines(),1):
  if pattern.search(line):matches.append({'path':str(p),'line':n,'text':line[:1000]})
 if clock.search(s):clockLogs.append(str(p))
 if trace.search(s):traceLogs.append(str(p))
packet=base/'task2-loader-qualification-packet.json';contract=base/'task2-loader-onset-evidence-contract.json'
pk=json.loads(packet.read_text());ct=json.loads(contract.read_text())
for p in [packet,contract]:
 b=p.read_bytes();pins.append({'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
result={'date':'2026-10-02','scope':'User-requested saved loader log search: top-level existing logs and retained rotation-probe logs; no whole chat/session history scan','logsSearched':len(logs),'patterns':pattern.pattern,'matches':matches,'nativeClockMentions':clockLogs,'playwrightTraceMentions':traceLogs,'sourceOnsetPacketStatus':pk['sourceOnset']['status'],'sourceOnsetPacketLimit':pk['sourceOnset']['limitations'],'sourceAgeContractsUnfilled':sum(s['source']['ageMs'] is None and s['source']['onsetIntervalPts'] is None for s in ct['states']),'verdict':'Loader logs and qualification packet exist, but no recording-session animation-start telemetry was found in the searched saved logs. Native clock mentions and Playwright trace references are local capture/test evidence. The source packet expressly retains presentation onset as unqualified; no source age populated.','inputs':pins}
dest.joinpath('loader-log-search.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'logsSearched':len(logs),'sourceStartPatternMatches':len(matches),'nativeClockMentionLogs':len(clockLogs),'localTraceMentionLogs':len(traceLogs),'sourceAgeContractsUnfilled':result['sourceAgeContractsUnfilled']}))
