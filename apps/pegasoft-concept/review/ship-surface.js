// Runtime finish refinement only. The accepted GLB, palette, geometry and C01 stay intact.
export function applyShipSurface(ship){
 ship.traverse(mesh=>{
  if(!mesh.isMesh||!['Cargo_deep_navy','Cargo_satin_silver','Pegasoft_blue'].includes(mesh.material.name))return;
  const m=mesh.material;
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 shipSurfacePosition;varying vec3 shipSurfaceX;varying float shipSurfaceUp;').replace('#include <begin_vertex>','#include <begin_vertex>\nshipSurfacePosition=position;shipSurfaceX=normalize((modelViewMatrix*vec4(1.0,0.0,0.0,0.0)).xyz);shipSurfaceUp=normal.y;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 shipSurfacePosition;varying vec3 shipSurfaceX;varying float shipSurfaceUp;
    float surfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float surfaceNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(surfaceHash(i),surfaceHash(i+vec2(1,0)),f.x),mix(surfaceHash(i+vec2(0,1)),surfaceHash(i+vec2(1,1)),f.x),f.y);}
   `).replace('#include <color_fragment>',`#include <color_fragment>
    float roof=smoothstep(.7,.9,shipSurfaceUp)*step(8.8,shipSurfacePosition.y);
    float rib=shipSurfacePosition.x*24.63994;
    float filterRib=1.0-smoothstep(1.0,3.0,fwidth(rib));
    float wear=surfaceNoise(shipSurfacePosition.xz*.72)*.65+surfaceNoise(shipSurfacePosition.xz*3.4)*.35;
    diffuseColor.rgb*=1.0-roof*(.035+.085*wear+.07*(.5+.5*sin(rib))*filterRib);
   `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    normal=normalize(normal-shipSurfaceX*(cos(rib)*.32*filterRib*roof));
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=clamp(roughnessFactor+roof*(wear-.5)*.09,.04,1.0);
   `);
  };
  m.customProgramCacheKey=()=> 'ship-cargo-finish-v1';m.needsUpdate=true;
 });
}
