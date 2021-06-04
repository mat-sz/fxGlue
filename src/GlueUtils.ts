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
    const context =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext);

    if (!context) {
      throw new Error('WebGL is not available.');
    }

    return context;
  }
}
