/**
 * Blend mode. Do not use the string values directly.
 */
export enum GlueBlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  OVERLAY = 'overlay',
  HARD_LIGHT = 'hard_light',
  SOFT_LIGHT = 'soft_light',
}

export const defaultFragmentShader = `void main()
{
  vec2 p = gl_FragCoord.xy / iResolution;
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
  vec2 p = gl_FragCoord.xy / iResolution;
  vec2 uv = gl_FragCoord.xy / iResolution;

  uv.x -= iOffset.x;
  uv.y += iOffset.y - 1.0 + iSize.y / iResolution.y;
  uv *= iResolution / iSize;

  vec4 src = texture2D(iTexture, p);
  gl_FragColor = src;
  
  vec4 dest = texture2D(iImage, uv);
  dest.a *= iOpacity;
  dest *= clip(uv);
  
  @source
}`;

const blendMainFragmentShader = blendBaseFragmentShader.replace(
  '@source',
  `if (src.a == 0.0) {
gl_FragColor = vec4(0, 0, 0, 0);
return;
}
vec3 Cb = src.rgb / src.a, Cs;
if (dest.a > 0.0) {
Cs = dest.rgb / dest.a;
}

@source

gl_FragColor.a = src.a + dest.a * (1.0-src.a);
gl_FragColor.rgb = (1.0 - src.a) * Cs + src.a * B;
gl_FragColor.rgb *= gl_FragColor.a;`
);

// Source: https://github.com/pixijs/pixi-picture/blob/master/src/ShaderParts.ts

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
    }`
  ),
  [GlueBlendMode.OVERLAY]: blendMainFragmentShader.replace(
    '@source',
    `vec3 multiply = Cb * Cs * 2.0;
    vec3 Cb2 = Cb * 2.0 - 1.0;
    vec3 screen = Cb2 + Cs - Cb2 * Cs;
    vec3 B;
    if (Cs.r <= 0.5) {
      B.r = multiply.r;
    } else {
      B.r = screen.r;
    }
    if (Cs.g <= 0.5) {
      B.g = multiply.g;
    } else {
      B.g = screen.g;
    }
    if (Cs.b <= 0.5) {
      B.b = multiply.b;
    } else {
      B.b = screen.b;
    }`
  ),
  [GlueBlendMode.HARD_LIGHT]: blendMainFragmentShader.replace(
    '@source',
    `vec3 multiply = Cb * Cs * 2.0;
    vec3 Cs2 = Cs * 2.0 - 1.0;
    vec3 screen = Cb + Cs2 - Cb * Cs2;
    vec3 B;
    if (Cb.r <= 0.5) {
      B.r = multiply.r;
    } else {
      B.r = screen.r;
    }
    if (Cb.g <= 0.5) {
      B.g = multiply.g;
    } else {
      B.g = screen.g;
    }
    if (Cb.b <= 0.5) {
      B.b = multiply.b;
    } else {
      B.b = screen.b;
    }`
  ),
  [GlueBlendMode.SOFT_LIGHT]: blendMainFragmentShader.replace(
    '@source',
    `vec3 first = Cb - (1.0 - 2.0 * Cs) * Cb * (1.0 - Cb);
    vec3 B;
    vec3 D;
    if (Cs.r <= 0.5) {
      B.r = first.r;
    } else {
      if (Cb.r <= 0.25) {
        D.r = ((16.0 * Cb.r - 12.0) * Cb.r + 4.0) * Cb.r;    
      } else {
        D.r = sqrt(Cb.r);
      }
      B.r = Cb.r + (2.0 * Cs.r - 1.0) * (D.r - Cb.r);
    }
    if (Cs.g <= 0.5) {
      B.g = first.g;
    } else {
      if (Cb.g <= 0.25) {
        D.g = ((16.0 * Cb.g - 12.0) * Cb.g + 4.0) * Cb.g;    
      } else {
        D.g = sqrt(Cb.g);
      }
      B.g = Cb.g + (2.0 * Cs.g - 1.0) * (D.g - Cb.g);
    }
    if (Cs.b <= 0.5) {
      B.b = first.b;
    } else {
      if (Cb.b <= 0.25) {
        D.b = ((16.0 * Cb.b - 12.0) * Cb.b + 4.0) * Cb.b;    
      } else {
        D.b = sqrt(Cb.b);
      }
      B.b = Cb.b + (2.0 * Cs.b - 1.0) * (D.b - Cb.b);
    }`
  ),
};
