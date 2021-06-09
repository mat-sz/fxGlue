import { GlueProgram } from './GlueProgram';
import {
  defaultFragmentShader,
  defaultVertexShader,
  blendFragmentShaders,
  GlueBlendMode,
} from './GlueShaderSources';

export class Glue {
  private _programs: Record<string, GlueProgram> = {};
  private _textures: Record<string, WebGLTexture> = {};
  private _textureSizes: Record<string, [number, number]> = {};
  private _textureSources: Record<string, HTMLImageElement> = {};
  private _width = 0;
  private _height = 0;
  private _renderTextures: WebGLTexture[] = [];
  private _renderFramebuffers: WebGLFramebuffer[] = [];
  private _currentFramebuffer = 0;
  private _final = false;
  private _disposed = false;

  constructor(private gl: WebGLRenderingContext) {
    this.registerProgram('_default');
    for (const mode of Object.values(GlueBlendMode) as GlueBlendMode[]) {
      this.registerProgram('_blend_' + mode, blendFragmentShaders[mode]);
    }

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
    mode: GlueBlendMode = GlueBlendMode.NORMAL
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

    const blendProgram = this.program('_blend_' + mode);

    if (blendProgram) {
      blendProgram.uniforms.set('iImage', 1);
      blendProgram.uniforms.set('iSize', size);
      blendProgram.uniforms.set('iOffset', [x / this._width, y / this._height]);
      blendProgram.uniforms.set('iOpacity', opacity);
      blendProgram.apply();
    }

    if (typeof image !== 'string') {
      this.deregisterImage('_temp');
    }
  }

  registerImage(name: string, source: HTMLImageElement): void {
    this.checkDisposed();

    if (!source.complete || source.naturalHeight === 0) {
      throw new Error('Source is not loaded.');
    }

    if (this._textures[name]) {
      throw new Error('A texture with this name already exists: ' + name);
    }

    const gl = this.gl;
    const target = gl.TEXTURE1;
    const texture = this.createTexture(target);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    this._textures[name] = texture;
    this._textureSizes[name] = [source.naturalWidth, source.naturalHeight];
    this._textureSources[name] = source;
  }

  useImage(name: string): void {
    if (!this._textures[name]) {
      throw new Error("A texture with this name doesn't exist: " + name);
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, this._textures[name]);
  }

  updateImage(name: string, source?: HTMLImageElement): void {
    if (!this._textures[name]) {
      throw new Error("A texture with this name doesn't exist: " + name);
    }

    if (source) {
      if (!source.complete || source.naturalHeight === 0) {
        throw new Error('Source is not loaded.');
      }

      this._textureSizes[name] = [source.naturalWidth, source.naturalHeight];
      this._textureSources[name] = source;
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, this._textures[name]);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this._textureSources[name]
    );
  }

  deregisterImage(name: string): void {
    this.checkDisposed();

    if (this._textures[name]) {
      this.gl.deleteTexture(this._textures[name]);
      delete this._textures[name];
      delete this._textureSizes[name];
      delete this._textureSources[name];
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
