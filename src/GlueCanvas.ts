import { Glue } from './Glue';
import { GlueUtils } from './GlueUtils';

export class GlueCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly glue: Glue;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.glue = new Glue(GlueUtils.getWebGLContext(this.canvas));
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.glue.setSize(width, height);
  }
}
