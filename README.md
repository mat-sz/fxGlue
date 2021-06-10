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
  vec2 p = gl_FragCoord.xy / iResolution.xy;
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
