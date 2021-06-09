export type GlueSourceType = HTMLImageElement | HTMLVideoElement;

export class GlueUtils {
  static isWebGLAvailable(): boolean {
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

  static getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
    const options = {
      premultipliedAlpha: false,
    };

    const context =
      canvas.getContext('webgl', options) ||
      canvas.getContext('experimental-webgl', options);

    if (!context) {
      throw new Error('WebGL is not available.');
    }

    return context as WebGLRenderingContext;
  }

  static isSourceLoaded(source: GlueSourceType): boolean {
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

  static getSourceDimensions(source: GlueSourceType): [number, number] {
    if (source instanceof HTMLImageElement) {
      return [source.naturalWidth, source.naturalHeight];
    } else if (source instanceof HTMLVideoElement) {
      return [source.videoWidth, source.videoHeight];
    }

    throw new Error('Unable to get source dimensions.');
  }
}
