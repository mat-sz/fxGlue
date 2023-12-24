<h1 align="center">fxGlue</h1>

<p align="center">
WebGL-based 2D image processing/effects library.
</p>

<p align="center">
<a href="https://npmjs.com/package/fxglue">
<img alt="npm" src="https://img.shields.io/npm/v/fxglue">
<img alt="npm" src="https://img.shields.io/npm/dw/fxglue">
<img alt="NPM" src="https://img.shields.io/npm/l/fxglue">
</a>
</p>

## Installation

fxGlue is available on [npm](https://www.npmjs.com/package/fxglue), you can install it with either npm or yarn:

```sh
npm install fxglue
# or:
yarn install fxglue
```

## Example use

```ts
// source is a HTMLImageElement, HTMLVideoElement or a HTMLCanvasElement.
// The source must be loaded.

import { GlueCanvasm, glueGetSourceDimensions } from 'fxglue';

export const fragmentShader = `
uniform float iRed;

void main()
{
  vec2 p = gl_FragCoord.xy / iResolution;
  gl_FragColor = texture2D(iTexture, p);
  gl_FragColor.r = iRed;
}`;

const glueCanvas = new GlueCanvas();
const { glue, canvas } = glueCanvas;

document.body.append(canvas);

glueCanvas.setSize(...glueGetSourceDimensions(source));
glue.registerTexture('source', source);
glue.registerProgram('filter', fragmentShader);

// In requestAnimationFrame.
glue.clear();
glue.texture('source')?.draw();
glue.program('filter')?.uniforms.set('iRed', 0.5);
glue.program('filter')?.apply();
glue.render();

// Or, simpler...
glue.clear();
glue.texture('source')?.draw();
glue.program('filter')?.apply({ iRed: 0.5 });
glue.render();

// If you'd like to only apply filters to one texture.
glue.clear();
glue.texture('source')?.draw();
glue.begin(); // Opens a new drawing group.
glue.texture('source')?.draw();
glue.program('filter')?.apply({ iRed: 0.5 });
glue.end();
glue.render();

// When no longer necessary.
glue.dispose();

// Or if you only want to remove one texture/program.
glue.deregisterProgram('filter');
glue.deregisterTexture('source');
```

**Texture and program names MUST NOT start with "~".**

## GLSL additions

### Uniforms

fxGlue alters the GLSL syntax and adds a few uniforms and one attribute out of the box.

The shader source **must not** include those uniforms in the code. They're provided by fxGlue and must be used as such.

- _vec2_ iResolution - resolution of the input texture, usually used to normalize gl_FragCoord as such: `gl_FragCoord.xy / iResolution`.
- _sampler2D_ iTexture - input texture, either output of the previously applied program or drawn texture.

Vertex shaders also include a `position` attribute. (_vec3_ position).

### Imports

fxGlue includes a syntax for inclusion of modules.

    @use math
    @use wrap

The `@use` statement must be the only one in a given line, must only contain one space before the module name and must contain only one module name. This statement must be used outside of blocks such as functions, before the imports are utilized, ideally at the beginning of the shader source.

There are two partials included with fxGlue: math and wrap.

## Partials

Custom partials can be registered by calling `registerImport`.

### math

Includes math constants and functions.

```glsl
#define PI 3.1415926538
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#define E 2.718281828459045

float pow2(const in float x)
float pow3(const in float x)
float pow4(const in float x)

float atan2(const in float y, const in float x)
float atan2(const in vec2 v)
```

### wrap

Includes functions related to accessing textures.

```glsl
// Repeats a float from 0.0 to 1.0, in a mirrored tile fashion.
float mirroredRepeat(const in float a)

// Repeats the texture in a mirrored tile fashion.
vec2 mirroredRepeat(const in vec2 uv)

// Repeats a float from 0.0 to 1.0, in a tile fashion.
float repeat(const in float a)

// Repeats the texture in a tile fashion.
vec2 repeat(const in vec2 uv)

// Clips the texture within given bounds.
float clip(const in vec2 v, const in vec4 bounds)

// Clips the texture within 0.0;0.0 to 1.0;1.0.
float clip(const in vec2 v)

// Clips the texture within given bounds, smoothly, based on provided radius x.
float clipSmooth(const in vec2 v, const in vec4 bounds, const in float x)

// Clips the texture within 0.0;0.0 to 1.0;1.0, smoothly, based on provided radius x.
float clipSmooth(const in vec2 v, const in float x)
```

### color

Includes HSL and HSV related functions.

```glsl
// Converts one color value.
float hue2rgb(float f1, float f2, float hue)

// Converts vec3(h, s, l) to vec3(r, g, b).
vec3 hsl2rgb(vec3 hsl)

// Converts vec3(h, s, v) to vec3(r, g, b).
vec3 hsv2rgb(vec3 hsv)

// Converts vec3(r, g, b) to vec3(h, s, l).
vec3 rgb2hsl(vec3 rgb)

// Converts vec3(r, g, b) to vec3(h, s, v).
vec3 rgb2hsv(vec3 rgb)
```

### noise

Contains noise functions from [webgl-noise](https://github.com/ashima/webgl-noise).

```glsl
// Cellular 2D noise
vec2 cellular(vec2 P)

// 2D noise
float snoise(vec2 v)
```
