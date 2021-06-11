import { Glue } from './Glue';

export type GlueUniformValue =
  | string
  | number
  | boolean
  | Float32List
  | Int32List;

interface GlueUniformInfo {
  type: number;
  location: WebGLUniformLocation;
  lastValue?: GlueUniformValue;
  textureId?: number;
}

export class GlueUniforms {
  private uniforms: Record<string, GlueUniformInfo> = {};

  /**
   * Creates a new GlueUniforms instance.
   * This constructor should not be called from outside of the Glue class.
   * @param gl WebGL context.
   * @param glue Glue instance.
   */
  constructor(
    private gl: WebGLRenderingContext,
    private glue: Glue,
    private program: WebGLProgram
  ) {
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    let textureId = 1;
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
        textureId: info.type === gl.SAMPLER_2D ? textureId : undefined,
      };

      if (info.type === gl.SAMPLER_2D) {
        textureId++;
      }
    }
  }

  /**
   * Get last uniform value.
   * NOTE: This will not reflect the current state of WebGL
   * if the value is changed outside of this class.
   * @param name Uniform name.
   * @returns The value.
   */
  get(name: string): GlueUniformValue | undefined {
    return this.uniforms[name]?.lastValue;
  }

  /**
   * Sets the uniform to this value.
   * @param name Uniform name.
   * @param value Value. String values are ONLY accepted for vec3/vec4 color uniforms in form of a hex string (#FFFFFF).
   */
  set(name: string, value: GlueUniformValue): void {
    this.gl.useProgram(this.program);
    this.setOne(name, value);
  }

  /**
   * Sets all uniforms in the object where key is the uniform name and value is the value to be set.
   * @param object Object with values. String values are ONLY accepted for vec3/vec4 color uniforms in form of a hex string (#FFFFFF) or sampler2D uniforms in form of the name of a registered texture.
   */
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

    if (typeof value === 'string') {
      if (
        uniform.type === this.gl.FLOAT_VEC3 ||
        uniform.type === this.gl.FLOAT_VEC4
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
      } else if (uniform.type === this.gl.SAMPLER_2D && uniform.textureId) {
        const texture = this.glue.texture(value);
        if (!texture) {
          throw new Error(
            `Registered texture of name '${value}' could not be found.`
          );
        }

        texture.use(this.gl.TEXTURE0 + uniform.textureId);
        value = uniform.textureId;
      } else {
        throw new Error(
          'String values are only supported for vec3/vec4 types (in form of hex color strings) or sampler2D types (in form of registered texture name).'
        );
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
