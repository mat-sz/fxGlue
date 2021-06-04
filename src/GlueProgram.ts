import { Glue } from './Glue';
import { GluePreprocessor } from './GluePreprocessor';
import { GlueUniforms } from './GlueUniforms';

export class GlueProgramError extends Error {
  vertexShaderErrors: Record<number, string[]> = {};
  fragmentShaderErrors: Record<number, string[]> = {};
}

export class GlueProgram {
  readonly uniforms: GlueUniforms;

  private _vertexShader?: WebGLShader;
  private _fragmentShader?: WebGLShader;
  private _vertexShaderErrors: Record<number, string[]> = {};
  private _fragmentShaderErrors: Record<number, string[]> = {};
  private _program: WebGLProgram;
  private _width = 0;
  private _height = 0;
  private _disposed = false;

  constructor(
    private gl: WebGLRenderingContext,
    private glue: Glue,
    fragmentShaderSource: string,
    vertexShaderSource: string
  ) {
    const fragmentResult = GluePreprocessor.processShader(fragmentShaderSource);
    const vertexResult = GluePreprocessor.processShader(
      vertexShaderSource,
      true
    );

    const program = gl.createProgram();

    if (!program) {
      throw new Error('Unable to create program.');
    }

    this._program = program;

    let shader = this.attachShader(fragmentResult.source, gl.FRAGMENT_SHADER);

    if (shader) {
      if (typeof shader === 'string') {
        this._fragmentShaderErrors = this.parseErrors(
          shader,
          fragmentResult.lineMap
        );
      } else {
        this._fragmentShader = shader;
      }
    }

    shader = this.attachShader(vertexResult.source, gl.VERTEX_SHADER);

    if (shader) {
      if (typeof shader === 'string') {
        this._vertexShaderErrors = this.parseErrors(
          shader,
          vertexResult.lineMap
        );
      } else {
        this._vertexShader = shader;
      }
    }

    if (!this._fragmentShader || !this._vertexShader) {
      gl.deleteProgram(program);

      const error = new GlueProgramError('Could not compile WebGL shader.');
      error.vertexShaderErrors = this._vertexShaderErrors;
      error.fragmentShaderErrors = this._fragmentShaderErrors;
      throw error;
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }

    this.uniforms = new GlueUniforms(gl, program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    this.glue.setRectangle(gl, -1, -1, 2, 2);

    const positionLocation = gl.getAttribLocation(this._program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  get vertexShaderErrors(): Record<number, string[]> {
    return this._vertexShaderErrors;
  }

  get fragmentShaderErrors(): Record<number, string[]> {
    return this._fragmentShaderErrors;
  }

  setSize(width: number, height: number): void {
    this.checkDisposed();

    this._width = width;
    this._height = height;

    this.uniforms.set('iResolution', [width, height, 1]);
  }

  apply(): void {
    this.checkDisposed();

    this.glue.switchFramebuffer();

    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._program);

    this.uniforms.set('iResolution', [this._width, this._height, 1]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this.gl.deleteProgram(this._program);

    if (this._vertexShader) {
      this.gl.deleteShader(this._vertexShader);
    }

    if (this._fragmentShader) {
      this.gl.deleteShader(this._fragmentShader);
    }

    this._disposed = true;
  }

  private parseErrors(log: string, lineMap: Record<number, number>) {
    const lines = log.split('\n');
    const errors: Record<number, string[]> = {};
    for (const line of lines) {
      if (line.startsWith('ERROR: ')) {
        const split = line.split(':');
        split.shift();
        split.shift();
        const position = split.shift();
        const message = split.join(':').trim();

        if (position && lineMap[parseInt(position)]) {
          const realLine = lineMap[parseInt(position)];
          if (!errors[realLine]) {
            errors[realLine] = [];
          }

          errors[realLine].push(message);
        } else {
          if (!errors[0]) {
            errors[0] = [];
          }

          errors[0].push(message);
        }
      }
    }

    return errors;
  }

  private checkDisposed() {
    if (this._disposed) {
      throw new Error('This GlueProgram object has been disposed.');
    }
  }

  private attachShader(code: string, type: number) {
    const gl = this.gl;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Unable to create shader.');
    }

    gl.shaderSource(shader, code);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      return info;
    }

    gl.attachShader(this._program, shader);
    return shader;
  }
}
