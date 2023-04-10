import { Glue } from './Glue';
import { GlueDrawable } from './GlueDrawable';
import {
  glueIsSourceLoaded,
  glueGetSourceDimensions,
  GlueSourceType,
} from './GlueUtils';

export class GlueTexture extends GlueDrawable {
  private _width: number;
  private _height: number;
  private _texture: WebGLTexture;

  /**
   * Creates a new GlueTexture instance.
   * This constructor should not be called from outside of the Glue class.
   * @param gl WebGL context.
   * @param glue Glue instance.
   * @param _source HTMLImageElement, HTMLVideoElement or HTMLCanvasElement containing the source. Must be loaded.
   */
  constructor(
    gl: WebGLRenderingContext,
    glue: Glue,
    private _source: GlueSourceType
  ) {
    super(gl, glue);

    if (!glueIsSourceLoaded(_source)) {
      throw new Error('Source is not loaded.');
    }

    const target = gl.TEXTURE1;
    const texture = glue._createTexture(target);

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

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get texture(): WebGLTexture {
    return this._texture;
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
   * Disposes of this GlueTexture object.
   * After this operation, the GlueTexture object may not be utilized further.
   * A new GlueTexture instance must be created for further use.
   */
  dispose(): void {
    this.gl.deleteTexture(this._texture);
    this._disposed = true;
  }
}
