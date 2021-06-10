import { Glue } from './Glue';
import { GlueBlendMode } from './GlueShaderSources';
import {
  glueIsSourceLoaded,
  glueGetSourceDimensions,
  GlueSourceType,
} from './GlueUtils';

/**
 * Draw options for textures.
 */
export interface GlueTextureDrawOptions {
  /**
   * Horizontal offset in pixels.
   */
  x?: number;

  /**
   * Vertical offset in pixels.
   */
  y?: number;

  /**
   * Width in pixels.
   */
  width?: number;

  /**
   * Height in pixels.
   */
  height?: number;

  /**
   * Opacity from 0.0 to 1.0.
   */
  opacity?: number;

  /**
   * Blend mode.
   */
  mode?: GlueBlendMode;
}

export class GlueTexture {
  private _width: number;
  private _height: number;
  private _disposed = false;
  private _texture: WebGLTexture;

  /**
   * Creates a new GlueTexture instance.
   * This constructor should not be called from outside of the Glue class.
   * @param gl WebGL context.
   * @param glue Glue instance.
   * @param _source HTMLImageElement or HTMLVideoElement containing the source. Must be loaded.
   */
  constructor(
    private gl: WebGLRenderingContext,
    private glue: Glue,
    private _source: GlueSourceType
  ) {
    if (!glueIsSourceLoaded(_source)) {
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
    const [width, height] = glueGetSourceDimensions(_source);
    this._width = width;
    this._height = height;
  }

  /**
   * Draws the texture onto the current framebuffer.
   * @param options Drawing options.
   */
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

  /**
   * Updates the current texture.
   * This is useful in case of video textures, where
   * this action will set the texture to the current playback frame.
   */
  update(source?: GlueSourceType): void {
    this.checkDisposed();

    if (source) {
      if (!glueIsSourceLoaded(source)) {
        throw new Error('Source is not loaded.');
      }

      const [width, height] = glueGetSourceDimensions(source);
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

  /**
   * Selects and binds the current texture to TEXTURE1.
   */
  use(): void {
    this.checkDisposed();

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);

    gl.bindTexture(gl.TEXTURE_2D, this._texture);
  }

  /**
   * Disposes of this GlueTexture object.
   * After this operation, the GlueTexture object may not be utilized further.
   * A new GlueTexture instance must be created for further use.
   */
  dispose(): void {
    this.gl.deleteTexture(this._texture);
  }

  private checkDisposed() {
    if (this._disposed) {
      throw new Error('This GlueTexture object has been disposed.');
    }
  }
}
