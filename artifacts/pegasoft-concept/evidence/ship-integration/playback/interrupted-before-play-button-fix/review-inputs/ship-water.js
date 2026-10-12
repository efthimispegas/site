import * as T from './vendor/three/build/three.module.js';
export function makeWater(){
 const material=new T.ShaderMaterial({clipping:true,uniforms:{storyTime:{value:0},scale:{value:1},shipInverse:{value:new T.Matrix4()}},vertexShader:`
 #include <common>
 #include <clipping_planes_pars_vertex>
 varying vec3 world; void main(){vec4 w=modelMatrix*vec4(position,1.0);world=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 }`,fragmentShader:`
 #include <common>
 #include <clipping_planes_pars_fragment>
 uniform float storyTime;uniform float scale;uniform mat4 shipInverse;varying vec3 world;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){
 #include <clipping_planes_fragment>
 vec2 p=world.xz/max(scale,.001);float t=storyTime*.3;
 float swell=sin(p.x*.29+p.y*.12-t)*.5+sin(p.x*.13-p.y*.35-t*.8)*.27;
 float n=noise(p*.7+vec2(t*.13,0));float detail=noise(p*2.8-vec2(t*.06,t*.11));
 float highlight=smoothstep(.58,.93,n*.55+detail*.35+swell*.11);
 vec3 deep=vec3(.004,.025,.067),light=vec3(.010,.048,.105);
 vec3 color=mix(deep,light,n*.75+.12*swell);float ripplePhase=p.x*1.45+p.y*.54+swell*.7-t;float ripple=pow(1.0-abs(sin(ripplePhase)),7.0)*clamp(1.0-fwidth(ripplePhase)*.8,0.0,1.0);color+=highlight*vec3(.008,.014,.018)+ripple*vec3(.005,.009,.012);
 vec3 local=(shipInverse*vec4(world,1.0)).xyz;
 float body=step(-53.0,local.x)*step(local.x,53.0);float sideDistance=abs(abs(local.z)-6.8);
 float sideFoam=body*exp(-sideDistance*sideDistance/.7)*smoothstep(.36,.83,noise(local.xz*2.0+vec2(t*.8,0)));
 float aft=-55.0-local.x;float wakeWidth=1.5+max(aft,0.0)*.055;
 float wake=step(0.0,aft)*exp(-max(aft,0.0)/30.0)*exp(-local.z*local.z/(wakeWidth*wakeWidth))*smoothstep(.33,.79,noise(local.xz*.65-vec2(t,0)));
 color=mix(color,vec3(.36,.49,.57),clamp(sideFoam*.5+wake*.68,0.0,.65));
 gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:T.DoubleSide});
 const mesh=new T.Mesh(new T.PlaneGeometry(15000,15000),material);mesh.rotation.x=-Math.PI/2;mesh.name='procedural_review_ocean';return mesh;
}
