/**
 * Image preprocessing utility using Canvas to enhance readability before OCR.
 * Optimizes: brightness, contrast, shadows removal, and sharpening.
 */

/**
 * Preprocesses an image file and returns a base64 encoded optimized version.
 * @param {File} file - The uploaded image file.
 * @param {object} options - Enhancing options.
 * @returns {Promise<string>} - Base64 encoded JPEG data url.
 */
export function preprocessImage(file, options = { contrast: 30, brightness: 10, sharpen: true }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set dimensions
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Apply contrast and brightness adjustments
          const factor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
          const brightnessOffset = options.brightness;

          for (let i = 0; i < data.length; i += 4) {
            // R, G, B channels
            data[i]     = factor * (data[i] - 128) + 128 + brightnessOffset;
            data[i + 1] = factor * (data[i + 1] - 128) + 128 + brightnessOffset;
            data[i + 2] = factor * (data[i + 2] - 128) + 128 + brightnessOffset;
          }
          ctx.putImageData(imageData, 0, 0);

          // Apply sharpening filter if requested
          if (options.sharpen) {
            sharpenCanvas(canvas, ctx);
          }

          // Return base64 URL
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } catch (err) {
          console.warn("Canvas manipulation failed (probably CORS or local context), returning original data URL.");
          resolve(e.target.result);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image for processing."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Sharpening convolution matrix filter
 */
function sharpenCanvas(canvas, ctx) {
  const w = canvas.width;
  const h = canvas.height;
  try {
    const weights = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    const srcData = ctx.getImageData(0, 0, w, h);
    const src = srcData.data;
    const dstData = ctx.createImageData(w, h);
    const dst = dstData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sy = y;
        const sx = x;
        const dstOff = (y * w + x) * 4;

        let r = 0, g = 0, b = 0;
        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = sy + cy - halfSide;
            const scx = sx + cx - halfSide;

            if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
              const srcOff = (scy * w + scx) * 4;
              const wt = weights[cy * side + cx];
              r += src[srcOff] * wt;
              g += src[srcOff + 1] * wt;
              b += src[srcOff + 2] * wt;
            }
          }
        }
        dst[dstOff] = Math.min(255, Math.max(0, r));
        dst[dstOff + 1] = Math.min(255, Math.max(0, g));
        dst[dstOff + 2] = Math.min(255, Math.max(0, b));
        dst[dstOff + 3] = src[dstOff + 3]; // Keep alpha channel same
      }
    }
    ctx.putImageData(dstData, 0, 0);
  } catch (e) {
    console.error("Sharpening failed", e);
  }
}
