import * as T from './vendor/three/build/three.module.js';
export function makeWater(){
 const material=new T.ShaderMaterial({clipping:true,uniforms:{storyTime:{value:0},scale:{value:1},shipInverse:{value:new T.Matrix4()}},vertexShader:`
 #include <common>
 #include <clipping_planes_pars_vertex>
 varying vec3 world;void main(){vec4 w=modelMatrix*vec4(position,1.0);world=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 }`,fragmentShader:`
 #include <common>
 #include <clipping_planes_pars_fragment>
 uniform float storyTime;uniform float scale;uniform mat4 shipInverse;varying vec3 world;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.0-15.0)+10.0);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float turbulence(vec2 p){return noise(p)*.52+noise(p*2.07+17.0)*.29+noise(p*4.13+3.0)*.13+noise(p*8.23)*.06;}
 void main(){
 #include <clipping_planes_fragment>
 vec2 p=world.xz/max(scale,.001);float t=storyTime;
 // A directional deep-water spectrum. Derivatives give moving reflection normals;
 // high frequencies attenuate with the pixel footprint rather than shimmering.
 vec2 slope=vec2(0.0);float height=0.0;
 for(int i=0;i<20;i++){
  float j=float(i),k=.105*pow(1.255,j),angle=.38+sin(j*2.399)*1.3;
  vec2 dir=vec2(cos(angle),sin(angle));float phase=dot(p,dir)*k-sqrt(9.81*k)*t+j*5.731;
  float attenuation=1.0-smoothstep(.7,2.2,fwidth(phase));float amplitude=.055/k;
  slope+=dir*(amplitude*k*cos(phase))*attenuation;height+=amplitude*sin(phase)*attenuation;
 }
 vec3 N=normalize(vec3(-slope.x,1.0,-slope.y)),V=normalize(cameraPosition-world),L=normalize(vec3(-.25,.85,.46)),H=normalize(L+V);
 float nv=max(dot(N,V),.001),nh=max(dot(N,H),.001),nl=max(dot(N,L),.001);
 float rough=.29+clamp(length(fwidth(p))*.018,0.0,.13),a=rough*rough,a2=a*a;
 float denominator=nh*nh*(a2-1.0)+1.0,D=a2/(3.14159265*denominator*denominator);
 float g=rough*rough*.5,Gv=nv/(nv*(1.0-g)+g),Gl=nl/(nl*(1.0-g)+g);
 float F=.0204+.9796*pow(1.0-max(dot(V,H),0.0),5.0);
 float specular=clamp(D*Gv*Gl*F/(4.0*nv),0.0,1.7);
 vec3 reflected=reflect(-V,N);float sky=.45+.55*reflected.y;
 vec3 color=vec3(.003,.017,.036)+mix(vec3(.007,.024,.053),vec3(.022,.071,.128),sky)*(.22+.78*pow(1.0-nv,5.0));
 color*=.76+.24*clamp(height*.45+.5,0.0,1.0);color+=vec3(.009,.023,.037)*pow(nh,16.0);color+=vec3(.72,.85,1.0)*specular*.75;
 vec3 local=(shipInverse*vec4(world,1.0)).xyz;float x=local.x,z=abs(local.z);
 // Bow compression, divergent Kelvin wave trains and a widening stern wash.
 float bowBack=max(52.5-x,0.0),bowWidth=min(6.55,bowBack*.63+.35),side=z-bowWidth;
 vec2 flow=vec2(x+t*4.4,local.z);float foamNoise=turbulence(flow*.92+vec2(0.0,noise(flow*.16)*3.0));
 float hullRange=smoothstep(-57.0,-52.0,x)*(1.0-smoothstep(51.0,54.0,x));
 float contact=exp(-pow(side/.65,2.0))*hullRange;
 float wash=exp(-max(side,0.0)*.62)*step(0.0,side)*hullRange;
 float waveAge=52.5-x,kelvinEdge=6.3+max(waveAge,0.0)*.20+.65*sin(waveAge*.3+foamNoise*2.0);
 float kelvin=step(6.0,waveAge)*exp(-max(waveAge,0.0)/105.0)*exp(-pow((z-kelvinEdge)/1.4,2.0));
 float ridge=pow(.5+.5*sin(waveAge*1.1-z*2.7+t*1.1+foamNoise*2.0),5.0);
 float bowFront=exp(-pow((x-52.2)/1.2,2.0)-pow(local.z/1.5,2.0));
 float aft=max(-52.0-x,0.0),tailWidth=2.8+aft*.12;
 float aftMask=(1.0-smoothstep(-56.0,-51.0,x)),tail=exp(-aft/95.0)*exp(-pow(local.z/tailWidth,2.0))*aftMask;
 float edgeWash=exp(-pow((z-(3.4+aft*.16))/1.5,2.0))*exp(-aft/110.0)*aftMask;
 float filaments=pow(1.0-abs(sin(local.z*2.5+noise(flow*.3)*4.0)),3.0);
 float foamPattern=smoothstep(.29,.72,foamNoise),foam=(contact*.72+wash*.30+kelvin*ridge*.18+bowFront*.9+tail*(.45+.35*filaments)+edgeWash*.42)*foamPattern;
 float rippleWake=(kelvin+wash*.12+edgeWash*.35)*ridge;
 color+=vec3(.015,.030,.040)*rippleWake;
 float hullShade=hullRange*exp(-pow(max(side,0.0)/1.6,2.0))*.18;color*=1.0-hullShade;
 color=mix(color,vec3(.44,.57,.63),clamp(foam,0.0,.88));
 gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:T.DoubleSide});
 const mesh=new T.Mesh(new T.PlaneGeometry(15000,15000),material);mesh.rotation.x=-Math.PI/2;mesh.name='spectral_review_ocean';return mesh;
}
