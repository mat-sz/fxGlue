import { Glue } from './Glue';
import { GlueBlendMode } from './GlueShaderSources';
import { GlueUtils, GlueSourceType } from './GlueUtils';

export interface GlueTextureDrawOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  mode?: GlueBlendMode;
}

export class GlueTexture {
  private _width: number;
  private _height: number;
  private _disposed = false;
  private _texture: WebGLTexture;

  constructor(
    private gl: WebGLRenderingContext,
    private glue: Glue,
    private _source: GlueSourceType
  ) {
    if (!GlueUtils.isSourceLoaded(_source)) {
      throw new Error('Source is not loaded.');
    }

    const target = gl.TEXTURE1;
    const texture = glue.createTexture(target);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      _source
    );

    this._texture = texture;
    const [width, height] = GlueUtils.getSourceDimensions(_source);
    this._width = width;
    this._height = height;
  }

  draw({
    x = 0,
    y = 0,
    width,
    height,
    opacity = 1,
    mode = GlueBlendMode.NORMAL,
  }: GlueTextureDrawOptions = {}): void {
    this.use();

    let size = [this._width, this._height];
    if (width && height) {
      size = [width, height];
    }

    const blendProgram = this.glue.program('_blend_' + mode);

    if (!blendProgram) {
      throw new Error('Invalid blend mode.');
    }

    blendProgram.apply({
      iImage: 1,
      iSize: size,
      iOffset: [x / this._width, y / this._height],
      iOpacity: opacity,
    });
  }

  update(source?: GlueSourceType): void {
    this.checkDisposed();

    if (source) {
      if (!GlueUtils.isSourceLoaded(source)) {
        throw new Error('Source is not loaded.');
      }

      const [width, height] = GlueUtils.getSourceDimensions(source);
      this._width = width;
      this._height = height;
      this._source = source;
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, this._texture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this._source
    );
  }

  use(): void {
    this.checkDisposed();

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, this._texture);
  }

  dispose(): void {
    this.gl.deleteTexture(this._texture);
  }

  private checkDisposed() {
    if (this._disposed) {
      throw new Error('This GlueProgram object has been disposed.');
    }
  }
}
