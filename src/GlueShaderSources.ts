export const defaultFragmentShader = `void main()
{
  vec2 p = gl_FragCoord.xy / iResolution.xy;
  gl_FragColor = texture2D(iTexture, p);
}`;

export const defaultVertexShader = `void main() {
  gl_Position = vec4(position, 1.0);
}`;

export const blendFragmentShader = `uniform sampler2D iImage;
uniform vec2 iSize;
uniform vec2 iOffset;
uniform float iOpacity;
uniform int iMode;

void main()
{
  vec2 p = gl_FragCoord.xy / iResolution.xy;
  vec2 uv = gl_FragCoord.xy / iResolution.xy;

  uv.x -= iOffset.x;
  uv.y += iOffset.y - 1.0 + iSize.y / iResolution.y;
  uv *= iResolution.xy / iSize.xy;

  vec4 src = texture2D(iTexture, p);
  gl_FragColor = src;
  
  if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0) {
    vec4 dest = texture2D(iImage, uv);
    dest.a *= iOpacity;
    
    if (iMode == 0) { // NORMAL
      dest *= dest.a;
      gl_FragColor *= 1.0 - dest.a;
      gl_FragColor += dest;
    } else if (iMode == 1) { // MULTIPLY
      if (dest.a > 0.0) {
        gl_FragColor.rgb = (dest.rgb / dest.a) * ((1.0 - src.a) + src.rgb);
        gl_FragColor.a = min(src.a + dest.a - src.a * dest.a, 1.0);
        // gl_FragColor.rgb *= mult.a;
      }
    }
  }
}`;
