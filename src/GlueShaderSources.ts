/**
 * Blend mode. Do not use the string values directly.
 */
export enum GlueBlendMode {
  NORMAL,
  DISSOLVE,

  DARKEN,
  MULTIPLY,
  COLOR_BURN,
  LINEAR_BURN,

  LIGHTEN,
  SCREEN,
  COLOR_DODGE,
  LINEAR_DODGE,

  OVERLAY,
  SOFT_LIGHT,
  HARD_LIGHT,
  VIVID_LIGHT,
  LINEAR_LIGHT,
  PIN_LIGHT,
  HARD_MIX,

  DIFFERENCE,
  EXCLUSION,
  SUBTRACT,
  DIVIDE,

  HUE,
  SATURATION,
  COLOR,
  LUMINOSITY,

  LIGHTER_COLOR,
  DARKER_COLOR,
}

export const defaultFragmentShader = `void main() {
  vec2 p = gl_FragCoord.xy / iResolution;
  gl_FragColor = texture2D(iTexture, p);
}`;

export const defaultVertexShader = `void main() {
  gl_Position = vec4(position, 1.0);
}`;

// Source: https://github.com/jamieowen/glsl-blend

export const blendFragmentShader = `@use wrap
@use color
@use noise
@use mask

uniform sampler2D iImage;
uniform vec2 iSize;
uniform vec2 iOffset;
uniform float iOpacity;
uniform float iAngle;
uniform int iBlendMode;

vec2 rotateUV(vec2 uv, float rotation, float mid) {
  return vec2(
    cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
    cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
  );
}

float overlay(float base, float blend) {
	return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 overlay(vec3 base, vec3 blend) {
	return vec3(overlay(base.r,blend.r),overlay(base.g,blend.g),overlay(base.b,blend.b));
}

float colorDodge(float base, float blend) {
	return (blend==1.0)?blend:min(base/(1.0-blend),1.0);
}

vec3 colorDodge(vec3 base, vec3 blend) {
	return vec3(colorDodge(base.r,blend.r),colorDodge(base.g,blend.g),colorDodge(base.b,blend.b));
}

float colorBurn(float base, float blend) {
	return (blend==0.0)?blend:max((1.0-((1.0-base)/blend)),0.0);
}

vec3 colorBurn(vec3 base, vec3 blend) {
	return vec3(colorBurn(base.r,blend.r),colorBurn(base.g,blend.g),colorBurn(base.b,blend.b));
}

float vividLight(float base, float blend) {
	return (blend<0.5)?colorBurn(base,(2.0*blend)):colorDodge(base,(2.0*(blend-0.5)));
}

vec3 vividLight(vec3 base, vec3 blend) {
	return vec3(vividLight(base.r,blend.r),vividLight(base.g,blend.g),vividLight(base.b,blend.b));
}

float linearBurn(float base, float blend) {
	return max(base+blend-1.0,0.0);
}

vec3 linearBurn(vec3 base, vec3 blend) {
	return max(base+blend-vec3(1.0),vec3(0.0));
}

float linearDodge(float base, float blend) {
	return min(base+blend,1.0);
}

vec3 linearDodge(vec3 base, vec3 blend) {
	return min(base+blend,vec3(1.0));
}

float linearLight(float base, float blend) {
	return blend<0.5?linearBurn(base,(2.0*blend)):linearDodge(base,(2.0*(blend-0.5)));
}

vec3 linearLight(vec3 base, vec3 blend) {
	return vec3(linearLight(base.r,blend.r),linearLight(base.g,blend.g),linearLight(base.b,blend.b));
}

float pinLight(float base, float blend) {
	return (blend<0.5)?min(base,(2.0*blend)):max(base,(2.0*(blend-0.5)));
}

vec3 pinLight(vec3 base, vec3 blend) {
	return vec3(pinLight(base.r,blend.r),pinLight(base.g,blend.g),pinLight(base.b,blend.b));
}

float hardMix(float base, float blend) {
	return (vividLight(base,blend)<0.5)?0.0:1.0;
}

vec3 hardMix(vec3 base, vec3 blend) {
	return vec3(hardMix(base.r,blend.r),hardMix(base.g,blend.g),hardMix(base.b,blend.b));
}

float softLight(float base, float blend) {
	return (blend<0.5)?(2.0*base*blend+base*base*(1.0-2.0*blend)):(sqrt(base)*(2.0*blend-1.0)+2.0*base*(1.0-blend));
}

vec3 softLight(vec3 base, vec3 blend) {
	return vec3(softLight(base.r,blend.r),softLight(base.g,blend.g),softLight(base.b,blend.b));
}

void main() {
  vec2 p = gl_FragCoord.xy / iResolution;
  vec2 uv = gl_FragCoord.xy / iResolution;

  uv = rotateUV(uv, iAngle, 0.5);
  uv.x -= iOffset.x;
  uv.y += iOffset.y - 1.0 + iSize.y / iResolution.y;
  uv *= iResolution / iSize;

  vec4 src = texture2D(iTexture, p);
  gl_FragColor = src;
  
  vec4 dest = texture2D(iImage, uv);
  dest.a *= iOpacity;
  dest *= clip(uv);

  if (dest.a == 0.0) {
    return;
  }
  
  if (iBlendMode == ${GlueBlendMode.DISSOLVE}) {
    float probability = snoise(gl_FragCoord.xy);
    dest.rgb = probability < dest.a ? dest.rgb : src.rgb;
  } else if (iBlendMode == ${GlueBlendMode.DARKEN}) {
    dest.r = min(dest.r, src.r);
    dest.g = min(dest.g, src.g);
    dest.b = min(dest.b, src.b);
  } else if (iBlendMode == ${GlueBlendMode.MULTIPLY}) {
    dest.rgb = (dest.rgb) * ((1.0 - dest.a) + src.rgb);
  } else if (iBlendMode == ${GlueBlendMode.COLOR_BURN}) {
    dest.rgb = colorBurn(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.LINEAR_BURN}) {
    dest.rgb = max(dest.rgb + src.rgb - vec3(1.0), vec3(0.0));
  } else if (iBlendMode == ${GlueBlendMode.LIGHTEN}) {
    dest.r = max(dest.r, src.r);
    dest.g = max(dest.g, src.g);
    dest.b = max(dest.b, src.b);
  } else if (iBlendMode == ${GlueBlendMode.SCREEN}) {
    dest.rgb = (dest.rgb) + ((1.0 - src.a) + src.rgb) - (dest.rgb) * ((1.0 - src.a) + src.rgb);
  } else if (iBlendMode == ${GlueBlendMode.COLOR_DODGE}) {
    dest.rgb = colorDodge(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.LINEAR_DODGE}) {
    dest.rgb = min(dest.rgb + src.rgb, vec3(1.0));
  } else if (iBlendMode == ${GlueBlendMode.OVERLAY}) {
    dest.rgb = overlay(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.SOFT_LIGHT}) {
    dest.rgb = softLight(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.HARD_LIGHT}) {
    dest.rgb = overlay(dest.rgb, src.rgb);
  } else if (iBlendMode == ${GlueBlendMode.VIVID_LIGHT}) {
    dest.rgb = vividLight(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.LINEAR_LIGHT}) {
    dest.rgb = linearLight(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.PIN_LIGHT}) {
    dest.rgb = pinLight(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.HARD_MIX}) {
    dest.rgb = hardMix(src.rgb, dest.rgb);
  } else if (iBlendMode == ${GlueBlendMode.DIFFERENCE}) {
    dest.rgb = abs(dest.rgb - src.rgb);
  } else if (iBlendMode == ${GlueBlendMode.EXCLUSION}) {
    dest.rgb = src.rgb + dest.rgb - 2.0 * src.rgb * dest.rgb;
  } else if (iBlendMode == ${GlueBlendMode.SUBTRACT}) {
    dest.rgb = max(src.rgb - dest.rgb, vec3(0.0));
  } else if (iBlendMode == ${GlueBlendMode.DIVIDE}) {
    dest.rgb = src.rgb / dest.rgb;
  } else if (iBlendMode == ${GlueBlendMode.HUE}) {
    vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.x = hsl_dest.x;
    dest.rgb = hsl2rgb(hsl_src);
  } else if (iBlendMode == ${GlueBlendMode.SATURATION}) {
    vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.y = hsl_dest.y;
    dest.rgb = hsl2rgb(hsl_src);
  } else if (iBlendMode == ${GlueBlendMode.COLOR}) {
    vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.xy = hsl_dest.xy;
    dest.rgb = hsl2rgb(hsl_src);
  } else if (iBlendMode == ${GlueBlendMode.LUMINOSITY}) {
    vec3 hsl_src = rgb2hsl(src.rgb);
    vec3 hsl_dest = rgb2hsl(dest.rgb);
    hsl_src.z = hsl_dest.z;
    dest.rgb = hsl2rgb(hsl_src);
  } else if (iBlendMode == ${GlueBlendMode.LIGHTER_COLOR}) {
    dest = luma(src) > luma(dest) ? src : dest;
  } else if (iBlendMode == ${GlueBlendMode.DARKER_COLOR}) {
    dest = luma(dest) > luma(src) ? src : dest;
  }

  gl_FragColor *= 1.0 - dest.a;
  gl_FragColor += dest * dest.a;

  gl_FragColor = mix(src, gl_FragColor, mask(p, 1.0));
}`;
