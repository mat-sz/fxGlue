const imports: Record<string, string> = {
  math: `
#define PI 3.1415926538
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#define E 2.718281828459045

float pow2(const in float x) { return x*x; }
float pow3(const in float x) { return x*x*x; }
float pow4(const in float x) { float x2 = x*x; return x2*x2; }

float atan2(const in float y, const in float x) { return x == 0.0 ? sign(y)*PI/2.0 : atan(y, x); }
float atan2(const in vec2 v) { return atan2(v.y, v.x); }
`,
  wrap: `
float mirroredRepeat(const in float a) { return abs(mod(a + 1.0, 2.0) - 1.0); }
vec2 mirroredRepeat(const in vec2 uv) { return vec2(mirroredRepeat(uv.x), mirroredRepeat(uv.y)); }

float repeat(const in float a) { return mod(a, 1.0); }
vec2 repeat(const in vec2 uv) { return vec2(repeat(uv.x), repeat(uv.y)); }

float clip(const in vec2 v, const in vec4 bounds) {
  vec2 s = step(bounds.xy, v) - step(bounds.zw, v);
  return s.x * s.y;   
}
float clip(const in vec2 v) { return clip(v, vec4(0.0, 0.0, 1.0, 1.0)); }

float clipSmooth(const in vec2 v, const in vec4 bounds, const in float x) {
  vec2 s = smoothstep(bounds.xy, bounds.xy + vec2(x), v) - smoothstep(bounds.zw - vec2(x), bounds.zw, v);
  return s.x * s.y;   
}
float clipSmooth(const in vec2 v, const in float x) { return clipSmooth(v, vec4(0.0, 0.0, 1.0, 1.0), x); }
`,
  color: `
// TODO: Rewrite this to improve performance.
// From: https://github.com/Jam3/glsl-hsl2rgb/blob/master/index.glsl

float hue2rgb(float f1, float f2, float hue) {
  if (hue < 0.0)
    hue += 1.0;
  else if (hue > 1.0)
    hue -= 1.0;
  float res;
  if ((6.0 * hue) < 1.0)
    res = f1 + (f2 - f1) * 6.0 * hue;
  else if ((2.0 * hue) < 1.0)
    res = f2;
  else if ((3.0 * hue) < 2.0)
    res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
  else
    res = f1;
  return res;
}

vec3 hsl2rgb(vec3 hsl) {
  vec3 rgb;
  
  if (hsl.y == 0.0) {
    rgb = vec3(hsl.z);
  } else {
    float f2;
    
    if (hsl.z < 0.5)
        f2 = hsl.z * (1.0 + hsl.y);
    else
        f2 = hsl.z + hsl.y - hsl.y * hsl.z;
        
    float f1 = 2.0 * hsl.z - f2;
    
    rgb.r = hue2rgb(f1, f2, hsl.x + (1.0/3.0));
    rgb.g = hue2rgb(f1, f2, hsl.x);
    rgb.b = hue2rgb(f1, f2, hsl.x - (1.0/3.0));
  }   
  return rgb;
}

// From: https://gist.github.com/yiwenl/745bfea7f04c456e0101

vec3 hsv2rgb(vec3 hsv)
{
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
  return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
}

vec3 rgb2hsl(vec3 rgb) {
  vec3 hsl;

  float fmin = min(min(rgb.r, rgb.g), rgb.b);
  float fmax = max(max(rgb.r, rgb.g), rgb.b);
  float delta = fmax - fmin;

  hsl.z = (fmax + fmin) / 2.0;

  if (delta == 0.0) {
    hsl.x = 0.0;
    hsl.y = 0.0;
  } else {
    if (hsl.z < 0.5)
      hsl.y = delta / (fmax + fmin);
    else
      hsl.y = delta / (2.0 - fmax - fmin);

    float deltaR = (((fmax - rgb.r) / 6.0) + (delta / 2.0)) / delta;
    float deltaG = (((fmax - rgb.g) / 6.0) + (delta / 2.0)) / delta;
    float deltaB = (((fmax - rgb.b) / 6.0) + (delta / 2.0)) / delta;

    if (rgb.r == fmax)
      hsl.x = deltaB - deltaG;
    else if (rgb.g == fmax)
      hsl.x = (1.0 / 3.0) + deltaR - deltaB;
    else if (rgb.b == fmax)
      hsl.x = (2.0 / 3.0) + deltaG - deltaR;

    if (hsl.x < 0.0)
      hsl.x += 1.0;
    else if (hsl.x > 1.0)
      hsl.x -= 1.0;
  }

  return hsl;
}

vec3 rgb2hsv(vec3 rgb) {
  float Cmax = max(rgb.r, max(rgb.g, rgb.b));
  float Cmin = min(rgb.r, min(rgb.g, rgb.b));
  float delta = Cmax - Cmin;

  vec3 hsv = vec3(0., 0., Cmax);

  if (Cmax > Cmin) {
    hsv.y = delta / Cmax;

    if (rgb.r == Cmax)
      hsv.x = (rgb.g - rgb.b) / delta;
    else {
      if (rgb.g == Cmax)
        hsv.x = 2. + (rgb.b - rgb.r) / delta;
      else
        hsv.x = 4. + (rgb.r - rgb.g) / delta;
    }
    hsv.x = fract(hsv.x / 6.);
  }
  return hsv;
}

float luma(const in vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float luma(const in vec4 color) {
  return luma(color.rgb);
}
`,
  noise: `
//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod7(vec3 x) {
  return x - floor(x * (1.0 / 7.0)) * 7.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

// https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// https://github.com/ashima/webgl-noise/blob/master/src/cellular2D.glsl
vec2 cellular(vec2 P) {
  #define K 0.142857142857 // 1/7
  #define Ko 0.428571428571 // 3/7
  #define jitter 1.0 // Less gives more regular pattern
  vec2 Pi = mod289(floor(P));
  vec2 Pf = fract(P);
  vec3 oi = vec3(-1.0, 0.0, 1.0);
  vec3 of = vec3(-0.5, 0.5, 1.5);
  vec3 px = permute(Pi.x + oi);
  vec3 p = permute(px.x + Pi.y + oi); // p11, p12, p13
  vec3 ox = fract(p*K) - Ko;
  vec3 oy = mod7(floor(p*K))*K - Ko;
  vec3 dx = Pf.x + 0.5 + jitter*ox;
  vec3 dy = Pf.y - of + jitter*oy;
  vec3 d1 = dx * dx + dy * dy; // d11, d12 and d13, squared
  p = permute(px.y + Pi.y + oi); // p21, p22, p23
  ox = fract(p*K) - Ko;
  oy = mod7(floor(p*K))*K - Ko;
  dx = Pf.x - 0.5 + jitter*ox;
  dy = Pf.y - of + jitter*oy;
  vec3 d2 = dx * dx + dy * dy; // d21, d22 and d23, squared
  p = permute(px.z + Pi.y + oi); // p31, p32, p33
  ox = fract(p*K) - Ko;
  oy = mod7(floor(p*K))*K - Ko;
  dx = Pf.x - 1.5 + jitter*ox;
  dy = Pf.y - of + jitter*oy;
  vec3 d3 = dx * dx + dy * dy; // d31, d32 and d33, squared
  // Sort out the two smallest distances (F1, F2)
  vec3 d1a = min(d1, d2);
  d2 = max(d1, d2); // Swap to keep candidates for F2
  d2 = min(d2, d3); // neither F1 nor F2 are now in d3
  d1 = min(d1a, d2); // F1 is now in d1
  d2 = max(d1a, d2); // Swap to keep candidates for F2
  d1.xy = (d1.x < d1.y) ? d1.xy : d1.yx; // Swap if smaller
  d1.xz = (d1.x < d1.z) ? d1.xz : d1.zx; // F1 is in d1.x
  d1.yz = min(d1.yz, d2.yz); // F2 is now not in d2.yz
  d1.y = min(d1.y, d1.z); // nor in  d1.z
  d1.y = min(d1.y, d2.x); // F2 is in d1.y, we're done.
  return sqrt(d1.xy);
}
`,
  mask: `float mask(vec2 p, float value) {
  if (!iMaskEnabled) {
    return value;
  }

  float r = texture2D(iMask, p).r;
  return value * r;
}

float mask(float value) {
  if (!iMaskEnabled) {
    return value;
  }

  vec2 p = gl_FragCoord.xy / iResolution;
  return mask(p, value);
}
`,
};

const shaderPrefix = 'precision mediump float;\nprecision mediump int;\n';

export interface GluePreprocessorResult {
  lineMap: Record<number, number>;
  source: string;
}

export class GluePreprocessor {
  private _imports: Record<string, string> = {};

  /**
   * Registers a GLSL partial as an import to be used with the @use syntax.
   * Unlike other register functions, this will replace the currently registered import with the same name.
   * @param name Name of the partial.
   * @param source Source of the partial.
   */
  registerImport(name: string, source: string): void {
    this._imports[name] = source;
  }

  /**
   * Removes a GLSL partial from registered imports
   * @param name Name of the partial.
   */
  deregisterImport(name: string): void {
    delete this._imports[name];
  }

  /**
   * Preprocesses the Glue-compatible GLSL shader source.
   * @param source Shader source.
   * @param vertex Flag whether the shader source belongs to a vertex shader.
   * @returns Result containing line map (for debugging) and a processed source.
   */
  preprocessShader(source: string, vertex = false): GluePreprocessorResult {
    let processedShader = shaderPrefix;
    if (vertex) {
      processedShader += 'attribute vec3 position;\n';
    }

    // Uniforms
    processedShader += 'uniform sampler2D iTexture;\n';
    processedShader += 'uniform sampler2D iMask;\n';
    processedShader += 'uniform bool iMaskEnabled;\n';
    processedShader += 'uniform vec2 iResolution;\n';

    const lines = source.split('\n');
    const lineMap: Record<number, number> = {};

    let currentInputLine = 0;
    let currentOutputLine = processedShader.split('\n').length;
    const included: string[] = [];

    for (const line of lines) {
      let trimmed = line.trim();
      if (trimmed.startsWith('@use ')) {
        trimmed = trimmed.replace('@use ', '');
        if (
          (this._imports[trimmed] || imports[trimmed]) &&
          !included.includes(trimmed)
        ) {
          processedShader +=
            (this._imports[trimmed] || imports[trimmed]) + '\n';
          currentOutputLine = processedShader.split('\n').length;
          included.push(trimmed);
        }

        currentInputLine++;
        continue;
      }

      processedShader += line + '\n';
      lineMap[currentOutputLine] = currentInputLine;
      currentInputLine++;
      currentOutputLine++;
    }

    return {
      lineMap,
      source: processedShader,
    };
  }
}
