const imports: Record<string, string> = {
  math: `#define PI 3.1415926538
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
float atan2(const in vec2 v) { return atan2(v.y, v.x); }`,
  wrap: `float mirroredRepeat(const in float a) { return abs(mod(a + 1.0, 2.0) - 1.0); }
vec2 mirroredRepeat(const in vec2 uv) { return vec2(mirroredRepeat(uv.x), mirroredRepeat(uv.y)); }

float repeat(const in float a) { return mod(a, 1.0); }
vec2 repeat(const in vec2 uv) { return vec2(repeat(uv.x), repeat(uv.y)); }`,
};

const shaderPrefix = 'precision mediump float;\nprecision mediump int;\n';

export interface GluePreprocessorResult {
  lineMap: Record<number, number>;
  source: string;
}

export class GluePreprocessor {
  static processShader(source: string, vertex = false): GluePreprocessorResult {
    let processedShader = shaderPrefix;
    if (vertex) {
      processedShader += 'attribute vec3 position;\n';
    }

    // Uniforms
    processedShader += 'uniform sampler2D iTexture;\n';
    processedShader += 'uniform vec3 iResolution;\n';

    const lines = source.split('\n');
    const lineMap: Record<number, number> = {};

    let currentInputLine = 0;
    let currentOutputLine = processedShader.split('\n').length;
    const included: string[] = [];

    for (const line of lines) {
      let trimmed = line.trim();
      if (trimmed.startsWith('@use ')) {
        trimmed = trimmed.replace('@use ', '');
        if (imports[trimmed] && !included.includes(trimmed)) {
          processedShader += imports[trimmed] + '\n';
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
