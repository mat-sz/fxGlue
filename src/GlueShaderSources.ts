/**
 * Blend mode. Do not use the string values directly.
 */
export enum GlueBlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  HARD_LIGHT = 'hard_light',
  SOFT_LIGHT = 'soft_light',
  DARKEN = 'darken',
  LIGHTEN = 'lighten',
  COLOR_DODGE = 'color_dodge',
  COLOR_BURN = 'color_burn',
  DIFFERENCE = 'difference',
  EXCLUSION = 'exclusion',
  HUE = 'hue',
  SATURATION = 'saturation',
  COLOR = 'color',
  LUMINOSITY = 'luminosity',
}

export const defaultFragmentShader = `void main() {
  vec2 p = gl_FragCoord.xy / iResolution;
  gl_FragColor = texture2D(iTexture, p);
}`;

export const defaultVertexShader = `void main() {
  gl_Position = vec4(position, 1.0);
}`;

const blendBaseFragmentShader = `@use wrap
@use color
@use mask

uniform sampler2D iImage;
uniform vec2 iSize;
uniform vec2 iOffset;
uniform float iOpacity;

void main() {
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

  if (dest.a == 0.0) {
    return;
  }
  
  @source

  dest.rgb *= dest.a;
  gl_FragColor *= 1.0 - dest.a;
  gl_FragColor += dest;

  gl_FragColor = mix(src, gl_FragColor, mask(p, 1.0));
}`;

const blendMainFragmentShader = blendBaseFragmentShader.replace(
  '@source',
  `if (src.a == 0.0) {
gl_FragColor = vec4(0, 0, 0, 0);
return;
}
vec3 Cb = src.rgb * src.a, Cs;
Cs = dest.rgb * dest.a;

@source

dest.rgb = (1.0 - src.a) * Cs + src.a * B;`
);

// Source: https://github.com/pixijs/pixi-picture/blob/master/src/ShaderParts.ts

export const blendFragmentShaders: Record<GlueBlendMode, string> = {
  [GlueBlendMode.NORMAL]: blendBaseFragmentShader.replace('@source', ``),
  [GlueBlendMode.MULTIPLY]: blendBaseFragmentShader.replace(
    '@source',
    `dest.rgb = (dest.rgb) * ((1.0 - dest.a) + src.rgb);`
  ),
  [GlueBlendMode.SCREEN]: blendBaseFragmentShader.replace(
    '@source',
    `dest.rgb = (dest.rgb) + ((1.0 - src.a) + src.rgb) - (dest.rgb) * ((1.0 - src.a) + src.rgb);`
  ),
  [GlueBlendMode.OVERLAY]: blendMainFragmentShader.replace(
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
  [GlueBlendMode.HARD_LIGHT]: blendMainFragmentShader.replace(
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
  [GlueBlendMode.DARKEN]: blendBaseFragmentShader.replace(
    '@source',
    `if (luma(dest) > luma(src)) {
      dest.rgb = src.rgb;
    }`
  ),
  [GlueBlendMode.LIGHTEN]: blendBaseFragmentShader.replace(
    '@source',
    `if (luma(dest) < luma(src)) {
      dest.rgb = src.rgb;
    }`
  ),
  [GlueBlendMode.COLOR_DODGE]: blendBaseFragmentShader.replace(
    '@source',
    `if (src.r < 1.0) {
      dest.r = min(1.0, src.r/(1.0 - dest.r));
    } else {
      dest.r = 1.0;
    }
    if (src.g < 1.0) {
      dest.g = min(1.0, src.g/(1.0 - dest.g));
    } else {
      dest.g = 1.0;
    }
    if (src.b < 1.0) {
      dest.b = min(1.0, src.b/(1.0 - dest.b));
    } else {
      dest.b = 1.0;
    }`
  ),
  [GlueBlendMode.COLOR_BURN]: blendBaseFragmentShader.replace(
    '@source',
    `if (dest.r > 0.0) {
      dest.r = 1.0 - min(1.0, (1.0 - src.r)/dest.r);
    } else {
      dest.r = 0.0;
    }
    if (dest.g > 0.0) {
      dest.g = 1.0 - min(1.0, (1.0 - src.g)/dest.g);
    } else {
      dest.g = 0.0;
    }
    if (dest.b > 0.0) {
      dest.b = 1.0 - min(1.0, (1.0 - src.b)/dest.b);
    } else {
      dest.b = 0.0;
    }`
  ),
  [GlueBlendMode.DIFFERENCE]: blendBaseFragmentShader.replace(
    '@source',
    `dest.r = abs(dest.r - src.r);
    dest.g = abs(dest.g - src.g);
    dest.b = abs(dest.b - src.b);`
  ),
  [GlueBlendMode.EXCLUSION]: blendBaseFragmentShader.replace(
    '@source',
    `dest.rgb = src.rgb + dest.rgb - 2.0 * src.rgb * dest.rgb;`
  ),
  [GlueBlendMode.HUE]: blendBaseFragmentShader.replace(
    '@source',
    `vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.x = hsl_dest.x;
    dest.rgb = hsl2rgb(hsl_src);`
  ),
  [GlueBlendMode.SATURATION]: blendBaseFragmentShader.replace(
    '@source',
    `vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.y = hsl_dest.y;
    dest.rgb = hsl2rgb(hsl_src);`
  ),
  [GlueBlendMode.COLOR]: blendBaseFragmentShader.replace(
    '@source',
    `vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.xy = hsl_dest.xy;
    dest.rgb = hsl2rgb(hsl_src);`
  ),
  [GlueBlendMode.LUMINOSITY]: blendBaseFragmentShader.replace(
    '@source',
    `vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.z = hsl_dest.z;
    dest.rgb = hsl2rgb(hsl_src);`
  ),
};
