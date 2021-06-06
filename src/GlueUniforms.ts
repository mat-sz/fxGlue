export type GlueUniformValue = number | boolean | Float32List | Int32List;

interface GlueUniformInfo {
  type: number;
  location: WebGLUniformLocation;
  lastValue?: GlueUniformValue;
}

export class GlueUniforms {
  private uniforms: Record<string, GlueUniformInfo> = {};

  constructor(
    private gl: WebGLRenderingContext,
    private program: WebGLProgram
  ) {
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (let i = 0; i < n; ++i) {
      const info = gl.getActiveUniform(program, i);
      if (!info) {
        throw new Error('Could not retrieve uniform info: ' + i);
      }

      const location = gl.getUniformLocation(program, info.name);
      if (!location) {
        throw new Error('Could not retrieve uniform location: ' + i);
      }

      this.uniforms[info.name] = {
        type: info.type,
        location,
      };
    }
  }

  get(name: string): GlueUniformValue | undefined {
    return this.uniforms[name]?.lastValue;
  }

  set(name: string, value: GlueUniformValue): void {
    this.gl.useProgram(this.program);
    this.setOne(name, value);
  }

  setAll(object: Record<string, GlueUniformValue>): void {
    this.gl.useProgram(this.program);
    for (const key of Object.keys(object)) {
      this.setOne(key, object[key]);
    }
  }

  private setOne(name: string, value: any): void {
    const uniform = this.uniforms[name];

    if (!uniform) {
      return;
    }

    if (
      typeof value === 'string' &&
      (uniform.type === this.gl.FLOAT_VEC3 ||
        uniform.type === this.gl.FLOAT_VEC4)
    ) {
      if (value.length < 7) {
        throw new Error('Invalid color value.');
      }

      const r = parseInt(value.slice(1, 3), 16) / 255;
      const g = parseInt(value.slice(3, 5), 16) / 255;
      const b = parseInt(value.slice(5, 7), 16) / 255;

      if (
        typeof r !== 'number' ||
        typeof g !== 'number' ||
        typeof b !== 'number'
      ) {
        throw new Error('Invalid color value.');
      }

      if (uniform.type === this.gl.FLOAT_VEC3) {
        value = [r, g, b];
      } else {
        let a = parseInt(value.slice(7, 9), 16) / 255;
        if (isNaN(a)) {
          a = 1.0;
        }

        value = [r, g, b, a];
      }
    }

    uniform.lastValue = value;

    switch (uniform.type) {
      case this.gl.FLOAT:
        this.gl.uniform1f(uniform.location, value);
        break;
      case this.gl.FLOAT_VEC2:
        this.gl.uniform2fv(uniform.location, value);
        break;
      case this.gl.FLOAT_VEC3:
        this.gl.uniform3fv(uniform.location, value);
        break;
      case this.gl.FLOAT_VEC4:
        this.gl.uniform4fv(uniform.location, value);
        break;
      case this.gl.BOOL:
        this.gl.uniform1i(uniform.location, value ? 1 : 0);
        break;
      case this.gl.INT:
        this.gl.uniform1i(uniform.location, value);
        break;
      case this.gl.BOOL_VEC2:
      case this.gl.INT_VEC2:
        this.gl.uniform2iv(uniform.location, value);
        break;
      case this.gl.BOOL_VEC3:
      case this.gl.INT_VEC3:
        this.gl.uniform3iv(uniform.location, value);
        break;
      case this.gl.BOOL_VEC4:
      case this.gl.INT_VEC4:
        this.gl.uniform4iv(uniform.location, value);
        break;
      case this.gl.FLOAT_MAT2:
        this.gl.uniformMatrix2fv(uniform.location, false, value);
        break;
      case this.gl.FLOAT_MAT3:
        this.gl.uniformMatrix3fv(uniform.location, false, value);
        break;
      case this.gl.FLOAT_MAT4:
        this.gl.uniformMatrix4fv(uniform.location, false, value);
        break;
      case this.gl.SAMPLER_2D:
        this.gl.uniform1i(uniform.location, value);
        break;
    }
  }
}
