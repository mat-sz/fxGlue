<h1 align="center">fxGlue</h1>

<p align="center">
WebGL-based 2D image processing/effects library.
</p>

<p align="center">
<img alt="workflow" src="https://img.shields.io/github/workflow/status/mat-sz/fxglue/Node.js%20CI%20(yarn)">
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
// image is a HTMLImageElement with a LOADED image.

import { GlueCanvas } from 'fxglue';

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

glueCanvas.setSize(image.naturalWidth, image.naturalHeight);
glue.registerTexture('image', image);
glue.registerProgram('filter', fragmentShader);

// In requestAnimationFrame.
glue.texture('image')?.draw();
glue.program('filter')?.uniforms.set('iRed', 0.5);
glue.program('filter')?.apply();
glue.render();

// Or, simpler...
glue.texture('image')?.draw();
glue.program('filter')?.apply({ iRed: 0.5 });
glue.render();

// When no longer necessary.
glue.dispose();

// Or if you only want to remove one texture/program.
glue.deregisterProgram('filter');
glue.deregisterTexture('image');
```

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
