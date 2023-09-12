export type GlueSourceType =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement;

/**
 * Check if WebGL is available in the current browser.
 * @returns Whether WebGL is available or not.
 */
export function glueIsWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Check if WebGL 2 is available in the current browser.
 * @returns Whether WebGL 2 is available or not.
 */
export function glueIsWebGL2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGL2RenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Get a WebGL context from a given canvas.
 * @returns The WebGL context.
 */
export function glueGetWebGLContext(
  canvas: HTMLCanvasElement,
  options?: WebGLContextAttributes
): WebGLRenderingContext | WebGL2RenderingContext {
  if (options) {
    options.premultipliedAlpha = false;
  } else {
    options = {
      premultipliedAlpha: false,
    };
  }

  const context =
    canvas.getContext('webgl2', options) ||
    canvas.getContext('experimental-webgl2', options) ||
    canvas.getContext('webgl', options) ||
    canvas.getContext('experimental-webgl', options);

  if (!context) {
    throw new Error('WebGL is not available.');
  }

  return context as WebGLRenderingContext;
}

/**
 * Check if the source is loaded.
 * @param source The source image or video.
 * @returns Whether the source is loaded or not.
 */
export function glueIsSourceLoaded(source: GlueSourceType): boolean {
  if (!source) {
    return false;
  }

  if (source instanceof HTMLImageElement) {
    return source.complete && source.naturalHeight > 0;
  } else if (source instanceof HTMLVideoElement) {
    return source.readyState > 2;
  }

  return true;
}

/**
 * Get source dimensions
 * @param source The source image or video.
 * @returns An array with dimensions in the format of [width, height] (both numbers, px).
 */
export function glueGetSourceDimensions(
  source: GlueSourceType
): [number, number] {
  if (source instanceof HTMLImageElement) {
    return [source.naturalWidth, source.naturalHeight];
  } else if (source instanceof HTMLVideoElement) {
    return [source.videoWidth, source.videoHeight];
  } else if (source instanceof HTMLCanvasElement) {
    return [source.width, source.height];
  }

  throw new Error('Unable to get source dimensions.');
}
