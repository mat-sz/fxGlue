import { Glue } from './Glue';
import { GlueBlendMode } from './GlueShaderSources';
import { GlueSourceType } from './GlueUtils';

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
   * Angle, from 0.0 to 2*PI.
   */
  angle?: number;

  /**
   * Blend mode.
   */
  mode?: GlueBlendMode;

  /**
   * Mask.
   */
  mask?: string | GlueSourceType;
}

export class GlueDrawable {
  protected _disposed = false;

  constructor(protected gl: WebGLRenderingContext, protected glue: Glue) {}

  get width(): number {
    throw new Error('Not implemented.');
  }

  get height(): number {
    throw new Error('Not implemented.');
  }

  get texture(): WebGLTexture {
    throw new Error('Not implemented.');
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
    mask,
    angle = 0,
  }: GlueTextureDrawOptions = {}): void {
    this.use();

    let size = [this.width, this.height];
    if (width && height) {
      size = [width, height];
    }

    const blendProgram = this.glue.program('~blend');
    blendProgram?.apply(
      {
        iImage: 1,
        iSize: size,
        iOffset: [x / this.width, y / this.height],
        iOpacity: opacity,
        iBlendMode: mode,
        iAngle: Math.PI * 2 - angle,
      },
      mask
    );
  }

  /**
   * Selects and binds the current texture to TEXTURE1 or target.
   * @param target gl.TEXTURE1 to gl.TEXTURE32 (default: gl.TEXTURE1).
   */
  use(target?: number): void {
    this.checkDisposed();

    const gl = this.gl;
    gl.activeTexture(target || gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  dispose(): void {
    throw new Error('Not implemented.');
  }

  protected checkDisposed(): void {
    if (this._disposed) {
      throw new Error('This GlueDrawable object has been disposed.');
    }
  }
}
