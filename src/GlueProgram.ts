import { Glue } from './Glue';
import { gluePreprocessShader } from './GluePreprocessor';
import { GlueUniforms, GlueUniformValue } from './GlueUniforms';

const rectangleBuffer = new Float32Array([
  -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
]);

export class GlueProgramError extends Error {
  vertexShaderErrors: Record<number, string[]> = {};
  fragmentShaderErrors: Record<number, string[]> = {};
}

export class GlueProgram {
  readonly uniforms: GlueUniforms;

  private _vertexShader?: WebGLShader;
  private _fragmentShader?: WebGLShader;
  private _program: WebGLProgram;
  private _disposed = false;

  /**
   * Creates a new GlueProgram instance.
   * This constructor should not be called from outside of the Glue class.
   * @param gl WebGL context.
   * @param glue Glue instance.
   * @param fragmentShaderSource Glue-compatible GLSL fragment shader source.
   * @param vertexShaderSource Glue-compatible GLSL vertex shader source.
   * @throws When compilation fails a GlueProgramError (containing vertexShaderErrors and fragmentShaderErrors properties) will be thrown.
   */
  constructor(
    private gl: WebGLRenderingContext,
    private glue: Glue,
    fragmentShaderSource: string,
    vertexShaderSource: string,
    customImports: Record<string, string> = {}
  ) {
    const fragmentResult = gluePreprocessShader(
      fragmentShaderSource,
      false,
      customImports
    );
    const vertexResult = gluePreprocessShader(
      vertexShaderSource,
      true,
      customImports
    );

    const program = gl.createProgram();

    if (!program) {
      throw new Error('Unable to create program.');
    }

    this._program = program;

    let _vertexShaderErrors: Record<number, string[]> = {};
    let _fragmentShaderErrors: Record<number, string[]> = {};

    let shader = this.attachShader(fragmentResult.source, gl.FRAGMENT_SHADER);

    if (shader) {
      if (typeof shader === 'string') {
        _fragmentShaderErrors = this.parseErrors(
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
        _vertexShaderErrors = this.parseErrors(shader, vertexResult.lineMap);
      } else {
        this._vertexShader = shader;
      }
    }

    if (!this._fragmentShader || !this._vertexShader) {
      gl.deleteProgram(program);

      let errors = '';
      for (const line of Object.keys(_vertexShaderErrors)) {
        errors +=
          'Vertex shader, line ' +
          line +
          ': ' +
          _vertexShaderErrors[parseInt(line)].join(',');
      }

      for (const line of Object.keys(_fragmentShaderErrors)) {
        errors +=
          'Fragment shader, line ' +
          line +
          ': ' +
          _fragmentShaderErrors[parseInt(line)].join(',');
      }

      const error = new GlueProgramError(
        'Could not compile WebGL shader.\n\n' + errors
      );
      error.vertexShaderErrors = _vertexShaderErrors;
      error.fragmentShaderErrors = _fragmentShaderErrors;
      throw error;
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error('Could not compile WebGL program.\n\n' + info);
    }

    this.uniforms = new GlueUniforms(gl, glue, program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, rectangleBuffer, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this._program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Applies the program to the current framebuffer.
   * @param uniforms Uniform values (optional).
   */
  apply(uniforms?: Record<string, GlueUniformValue>): void {
    this.checkDisposed();

    this.glue._switchFramebuffer();

    const { width, height } = this.glue;
    const gl = this.gl;

    gl.viewport(0, 0, width, height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._program);

    this.uniforms.set('iResolution', [width, height]);

    if (uniforms) {
      this.uniforms.setAll(uniforms);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Disposes of this GlueProgram object.
   * After this operation, the GlueProgram object may not be utilized further.
   * A new GlueProgram instance must be created for further use.
   */
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
