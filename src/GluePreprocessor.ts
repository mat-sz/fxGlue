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
};

const shaderPrefix = 'precision mediump float;\nprecision mediump int;\n';

export interface GluePreprocessorResult {
  lineMap: Record<number, number>;
  source: string;
}

/**
 * Preprocesses the Glue-compatible GLSL shader source.
 * @param source Shader source.
 * @param vertex Flag whether the shader source belongs to a vertex shader.
 * @returns Result containing line map (for debugging) and a processed source.
 */
export function gluePreprocessShader(
  source: string,
  vertex = false,
  customImports: Record<string, string> = {}
): GluePreprocessorResult {
  let processedShader = shaderPrefix;
  if (vertex) {
    processedShader += 'attribute vec3 position;\n';
  }

  // Uniforms
  processedShader += 'uniform sampler2D iTexture;\n';
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
        (customImports[trimmed] || imports[trimmed]) &&
        !included.includes(trimmed)
      ) {
        processedShader += (customImports[trimmed] || imports[trimmed]) + '\n';
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
