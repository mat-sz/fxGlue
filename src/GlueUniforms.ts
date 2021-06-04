interface GlueUniformInfo {
  type: number;
  location: WebGLUniformLocation;
  lastValue?: any;
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

  get(name: string): any {
    return this.uniforms[name]?.lastValue;
  }

  set(name: string, value: any): void {
    this.gl.useProgram(this.program);
    const uniform = this.uniforms[name];

    if (!uniform) {
      return;
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
