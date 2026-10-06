import fs from 'node:fs';import sharp from 'sharp';
const dir=new URL('./source-sequence/',import.meta.url);
const regress=pts=>{let n=pts.length,sx=0,sy=0,sxx=0,sxy=0;for(const[x,y]of pts){sx+=x;sy+=y;sxx+=x*x;sxy+=x*y;}let m=(n*sxy-sx*sy)/(n*sxx-sx*sx),b=(sy-m*sx)/n;return {slope:m,intercept:b,rms:Math.sqrt(pts.reduce((s,[x,y])=>s+(y-m*x-b)**2,0)/n)};};
let lift=[],pivot=[];
for(const[kind,count]of [['y',159],['k',97]])for(let i=0;i<count;i++){
 const {data,info}=await sharp(new URL(`${kind}-${String(i).padStart(3,'0')}.avif`,dir).pathname).resize(960).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const px=(x,y)=>{const k=(y*info.width+x)*info.channels;return [data[k],data[k+1],data[k+2]];};
 const gray=(x,y)=>{const[r,g,b]=px(x,y);return Math.max(r,g,b)-Math.min(r,g,b)<20&&r<230&&r>65;};
 const x0=kind==='y'?817:195,x1=945,y0=140,y1=325,w=x1-x0,h=y1-y0,mask=new Uint8Array(w*h),dilated=new Uint8Array(w*h),seen=new Uint8Array(w*h);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(gray(x,y)&&px(x,y)[0]>90){mask[(y-y0)*w+x-x0]=1;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x-x0+dx,yy=y-y0+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)dilated[yy*w+xx]=1;}}
 let biggest=[];for(let k=0;k<dilated.length;k++)if(dilated[k]&&!seen[k]){const q=[k];seen[k]=1;for(let n=0;n<q.length;n++){const id=q[n],x=id%w,y=Math.floor(id/w);for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&dilated[j]&&!seen[j]){seen[j]=1;q.push(j);}}}if(q.length>biggest.length)biggest=q;}
 const belongs=new Uint8Array(w*h);biggest.forEach(k=>belongs[k]=1);
 let rows=[];for(let y=y0;y<y1;y++){let xs=[];for(let x=x0;x<x1;x++){const k=(y-y0)*w+x-x0;if(mask[k]&&belongs[k])xs.push(x);}if(xs.length>(kind==='y'?60:75))rows.push({y,min:xs[0],max:xs.at(-1),count:xs.length});}
 // Track the container through a fixed interior band. This excludes crane/head
 // pixels even when physically connected to the silver shell above it.
 const bands=[];for(let yy=205;yy<=265;yy++){let runs=[],run=[];for(let xx=x0;xx<x1;xx++)if(gray(xx,yy)&&px(xx,yy)[0]>90){if(run.length&&xx-run.at(-1)>15){runs.push(run);run=[];}run.push(xx);}if(run.length)runs.push(run);let best=runs.sort((a,b)=>(b.at(-1)-b[0])-(a.at(-1)-a[0]))[0];if(best&&best.at(-1)-best[0]>65)bands.push({y:yy,min:best[0],max:best.at(-1)});}
 const left=regress(bands.map(r=>[r.y,r.min])),right=regress(bands.map(r=>[r.y,r.max])),center=regress(bands.map(r=>[r.y,(r.min+r.max)/2])),bottom=rows.at(-1)?.y,top=kind==='y'?bottom-126:rows[0]?.y;
 const mid=235,measurement={index:i,container_top:top,container_bottom:bottom,container_center_x:(left.intercept+right.intercept)/2+center.slope*mid,container_width:(right.intercept-left.intercept)+(right.slope-left.slope)*mid,container_tilt_degrees:Math.atan(center.slope)*180/Math.PI,edge_fit_rms_px:[left.rms,right.rms],container_height:bottom-top};
 if(kind==='y'){
  let yellow=[];for(let y=130;y<189;y++)for(let x=820;x<940;x++){const[r,g,b]=px(x,y);if(r>110&&g>65&&b<70&&r>g*1.12)yellow.push([x,y]);}
  measurement.spreader_y=yellow.length?yellow.reduce((s,p)=>s+p[1],0)/yellow.length:null;lift.push(measurement);
 }else pivot.push(measurement);
}
fs.writeFileSync(new URL('dense-reference-measurements.json',import.meta.url),JSON.stringify({method:'Every ordered source frame decoded. Least-squares regression of opposing silver container edges, fixed interior band y205..265 excluding crane/head and corners; planar tilt separated from translating top edge. Screen-pixel fits, not CAD joint angles.',resolution:[960,540],lift,pivot},null,2)+'\n');
console.log('Lift',lift.filter((x,i)=>i%10===0||i===158).map(x=>[x.index,x.container_top,x.container_tilt_degrees.toFixed(3),x.spreader_y?.toFixed(2),x.edge_fit_rms_px.map(x=>x.toFixed(2))]));console.log('Pivot',pivot.filter((x,i)=>i%12===0).map(x=>[x.index,x.container_width.toFixed(1),x.container_center_x.toFixed(1),x.container_top,x.container_tilt_degrees.toFixed(2)]));
