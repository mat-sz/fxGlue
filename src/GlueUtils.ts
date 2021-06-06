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
}
