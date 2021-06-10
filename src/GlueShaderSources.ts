/**
 * Blend mode. Do not use the string values directly.
 */
export enum GlueBlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
}

export const defaultFragmentShader = `void main()
{
  vec2 p = gl_FragCoord.xy / iResolution.xy;
  gl_FragColor = texture2D(iTexture, p);
}`;

export const defaultVertexShader = `void main() {
  gl_Position = vec4(position, 1.0);
}`;

const blendBaseFragmentShader = `@use wrap

uniform sampler2D iImage;
uniform vec2 iSize;
uniform vec2 iOffset;
uniform float iOpacity;

void main()
{
  vec2 p = gl_FragCoord.xy / iResolution.xy;
  vec2 uv = gl_FragCoord.xy / iResolution.xy;

  uv.x -= iOffset.x;
  uv.y += iOffset.y - 1.0 + iSize.y / iResolution.y;
  uv *= iResolution.xy / iSize.xy;

  vec4 src = texture2D(iTexture, p);
  gl_FragColor = src;
  
  vec4 dest = texture2D(iImage, uv);
  dest.a *= iOpacity;
  dest *= clip(uv);
  
  @source
}`;

export const blendFragmentShaders: Record<GlueBlendMode, string> = {
  [GlueBlendMode.NORMAL]: blendBaseFragmentShader.replace(
    '@source',
    `dest *= dest.a;
gl_FragColor *= 1.0 - dest.a;
gl_FragColor += dest;`
  ),
  [GlueBlendMode.MULTIPLY]: blendBaseFragmentShader.replace(
    '@source',
    `if (dest.a > 0.0) {
  gl_FragColor.rgb = (dest.rgb / dest.a) * ((1.0 - src.a) + src.rgb);
  gl_FragColor.a = min(src.a + dest.a - src.a * dest.a, 1.0);
  // gl_FragColor.rgb *= mult.a;
}`
  ),
};
