import { Glue } from './Glue';
import { glueGetWebGLContext } from './GlueUtils';

export class GlueCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly glue: Glue;
  readonly gl: WebGLRenderingContext | WebGL2RenderingContext;

  /**
   * Creates a new canvas and a new Glue instance.
   */
  constructor(options?: WebGLContextAttributes) {
    this.canvas = document.createElement('canvas');
    this.gl = glueGetWebGLContext(this.canvas, options);
    this.glue = new Glue(this.gl);
  }

  /**
   * Sets the size of the output. Must be called before everything else.
   * @param width Width (px).
   * @param height Height (px).
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.glue.setSize(width, height);
  }
}
