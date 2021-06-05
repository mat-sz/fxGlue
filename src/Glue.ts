import { GlueProgram } from './GlueProgram';

const defaultFragmentShader = `void main()
{
  vec2 p = gl_FragCoord.xy / iResolution.xy;
  gl_FragColor = texture2D(iTexture, p);
}`;

const defaultVertexShader = `void main() {
  gl_Position = vec4(position, 1.0);
}`;

const blendFragmentShader = `uniform sampler2D iImage;
uniform vec2 iSize;
uniform vec2 iOffset;
uniform float iOpacity;
uniform int iMode;

void main()
{
  vec2 p = gl_FragCoord.xy / iResolution.xy;
  vec2 uv = gl_FragCoord.xy / iResolution.xy;

  uv.x -= iOffset.x;
  uv.y += iOffset.y - 1.0 + iSize.y / iResolution.y;
  uv *= iResolution.xy / iSize.xy;

  vec4 src = texture2D(iTexture, p);
  gl_FragColor = src;
  
  if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0) {
    vec4 dest = texture2D(iImage, uv);
    dest.a *= iOpacity;
    
    if (iMode == 0) { // NORMAL
      dest *= dest.a;
      gl_FragColor *= 1.0 - dest.a;
      gl_FragColor += dest;
    } else if (iMode == 1) { // MULTIPLY
      if (dest.a > 0.0) {
        gl_FragColor.rgb = (dest.rgb / dest.a) * ((1.0 - src.a) + src.rgb);
        gl_FragColor.a = min(src.a + dest.a - src.a * dest.a, 1.0);
        // gl_FragColor.rgb *= mult.a;
      }
    }
  }
}`;

export class Glue {
  private _programs: Record<string, GlueProgram> = {};
  private _textures: Record<string, WebGLTexture> = {};
  private _textureSizes: Record<string, [number, number]> = {};
  private _width = 0;
  private _height = 0;
  private _renderTextures: WebGLTexture[] = [];
  private _renderFramebuffers: WebGLFramebuffer[] = [];
  private _currentFramebuffer = 0;
  private _final = false;
  private _disposed = false;

  constructor(private gl: WebGLRenderingContext) {
    this.registerProgram('_default');
    this.registerProgram('_blend', blendFragmentShader);

    this.addFramebuffer();
    this.addFramebuffer();
  }

  setScale(scale: number): void {
    this.checkDisposed();

    this.setSize(this._width * scale, this._height * scale);
  }

  setSize(width: number, height: number): void {
    this.checkDisposed();

    for (const program of Object.values(this._programs)) {
      program.setSize(width, height);
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);

    for (const texture of this._renderTextures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    }

    gl.bindTexture(
      gl.TEXTURE_2D,
      this._renderTextures[this._currentFramebuffer]
    );

    this._width = width;
    this._height = height;
  }

  image(
    image: HTMLImageElement | string,
    x = 0,
    y = 0,
    width?: number,
    height?: number,
    opacity = 1,
    mode = 0
  ): void {
    this.checkDisposed();

    let size = [];
    if (typeof image === 'string') {
      this.useImage(image);
      size = this._textureSizes[image];
    } else {
      this.registerImage('_temp', image);
      size = [image.naturalWidth, image.naturalHeight];
    }

    if (width && height) {
      size = [width, height];
    }

    this.program('_blend')?.uniforms.set('iImage', 1);
    this.program('_blend')?.uniforms.set('iSize', size);
    this.program('_blend')?.uniforms.set('iOffset', [
      x / this._width,
      y / this._height,
    ]);
    this.program('_blend')?.uniforms.set('iMode', mode);
    this.program('_blend')?.uniforms.set('iOpacity', opacity);
    this.program('_blend')?.apply();

    if (typeof image !== 'string') {
      this.deregisterImage('_temp');
    }
  }

  registerImage(name: string, image: HTMLImageElement): void {
    this.checkDisposed();

    if (!image.complete || image.naturalHeight === 0) {
      throw new Error('Image is not loaded.');
    }

    if (this._textures[name]) {
      throw new Error('A texture with this name already exists: ' + name);
    }

    const gl = this.gl;
    const target = gl.TEXTURE1;
    const texture = this.createTexture(target);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    this._textures[name] = texture;
    this._textureSizes[name] = [image.naturalWidth, image.naturalHeight];
  }

  useImage(name: string): void {
    if (!this._textures[name]) {
      throw new Error("A texture with this name doesn't exist: " + name);
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, this._textures[name]);
  }

  deregisterImage(name: string): void {
    this.checkDisposed();

    if (this._textures[name]) {
      this.gl.deleteTexture(this._textures[name]);
      delete this._textures[name];
      delete this._textureSizes[name];
    }
  }

  hasImage(name: string): boolean {
    return !!this._textures[name];
  }

  registerProgram(
    name: string,
    fragmentShader?: string,
    vertexShader?: string
  ): GlueProgram {
    this.checkDisposed();

    if (this._programs[name]) {
      throw new Error('A program with this name already exists: ' + name);
    }

    if (!fragmentShader) {
      fragmentShader = defaultFragmentShader;
    }

    if (!vertexShader) {
      vertexShader = defaultVertexShader;
    }

    const program = new GlueProgram(
      this.gl,
      this,
      fragmentShader,
      vertexShader
    );

    program.setSize(this._width, this._height);

    this._programs[name] = program;

    return program;
  }

  deregisterProgram(name: string): void {
    this.checkDisposed();

    this._programs[name]?.dispose();
    delete this._programs[name];
  }

  hasProgram(name: string): boolean {
    return !!this._programs[name];
  }

  program(name: string): GlueProgram | undefined {
    this.checkDisposed();
    return this._programs[name];
  }

  render(): void {
    this.checkDisposed();
    this._final = true;
    this.program('_default')?.apply();
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    for (const texture of this._renderTextures) {
      this.gl.deleteTexture(texture);
    }

    for (const framebuffer of this._renderFramebuffers) {
      this.gl.deleteFramebuffer(framebuffer);
    }

    for (const program of Object.values(this._programs)) {
      program.dispose();
    }

    this._renderFramebuffers = [];
    this._renderTextures = [];
    this._programs = {};
    this._disposed = true;
  }

  switchFramebuffer(): void {
    this.checkDisposed();

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(
      gl.TEXTURE_2D,
      this._renderTextures[this._currentFramebuffer]
    );
    this._currentFramebuffer = this._currentFramebuffer === 0 ? 1 : 0;

    gl.bindFramebuffer(
      gl.FRAMEBUFFER,
      this._final ? null : this._renderFramebuffers[this._currentFramebuffer]
    );
    this._final = false;
  }

  resetFramebuffer(): void {
    this.checkDisposed();

    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private checkDisposed(): void {
    if (this._disposed) {
      throw new Error('This Glue object has been disposed.');
    }
  }

  private addFramebuffer(): void {
    const [texture, framebuffer] = this.createFramebuffer(1, 1);
    this._renderTextures.push(texture);
    this._renderFramebuffers.push(framebuffer);
  }

  private createTexture(target?: number): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();

    if (!texture) {
      throw new Error('Unable to create texture.');
    }

    if (!target) {
      target = gl.TEXTURE0;
    }

    gl.activeTexture(target);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }

  private createFramebuffer(
    width: number,
    height: number
  ): readonly [WebGLTexture, WebGLFramebuffer] {
    const gl = this.gl;
    const texture = this.createTexture();

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    const framebuffer = gl.createFramebuffer();

    if (!framebuffer) {
      throw new Error('Unable to create a framebuffer.');
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    return [texture, framebuffer] as const;
  }
}
