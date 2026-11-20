import * as pixi from 'pixi.js';

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec3 uColor;
uniform float uOutline;

float coverage(vec2 delta) {
    return texture(uTexture, clamp(vTextureCoord + delta, uInputClamp.xy, uInputClamp.zw)).a;
}

void main() {
    float alpha = coverage(vec2(0.0));
    if (uOutline > 0.5) {
        // Only paint outside covered pixels. In Silhouette the input alpha
        // already contains the union of the clipped attachments.
        vec2 stepSize = 1.5 * uInputPixel.zw;
        float around = max(max(coverage(vec2(stepSize.x, 0.0)), coverage(vec2(-stepSize.x, 0.0))),
                           max(coverage(vec2(0.0, stepSize.y)), coverage(vec2(0.0, -stepSize.y))));
        vec2 diagonal = stepSize * 0.70710678;
        around = max(around, max(max(coverage(diagonal), coverage(-diagonal)),
                                 max(coverage(vec2(diagonal.x, -diagonal.y)), coverage(vec2(-diagonal.x, diagonal.y)))));
        alpha = around * (1.0 - step(0.001, alpha));
    }
    finalColor = vec4(uColor * alpha, alpha);
}
`;

// ProjectViewport uses the WebGL renderer. Each filter pass uses a padded
// source bound confined to that viewport.
export function createGhostArtworkFilter() {
  return new pixi.Filter({
    glProgram: pixi.GlProgram.from({vertex:pixi.defaultFilterVert,fragment,name:'fbones-ghost-artwork'}),
    resolution:1,
    padding:2,
    clipToViewport:true,
    resources:{
      ghostUniforms:new pixi.UniformGroup({
        uColor:{value:new Float32Array(3),type:'vec3<f32>'},
        uOutline:{value:0,type:'f32'},
      }),
    },
  });
}

export function configureGhostArtworkFilter(filter:pixi.Filter,color:number,outline:boolean) {
  const group=filter.resources.ghostUniforms;
  group.uniforms.uColor.set([(color>>>16)/255,((color>>>8)&255)/255,(color&255)/255]);
  group.uniforms.uOutline=outline?1:0;
  group.update();
}
