import { ProcessingStats, RadialDataPoint } from "../types";

/**
 * Computes the centroid (Center of Mass) of the image intensity.
 */
export const calculateCentroid = (
  imageData: ImageData
): { x: number; y: number; maxVal: number } => {
  const { width, height, data } = imageData;
  let totalMass = 0;
  let sumX = 0;
  let sumY = 0;
  let maxVal = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Convert RGB to grayscale luminosity roughly
      const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      
      if (intensity > maxVal) maxVal = intensity;

      // Thresholding to remove background noise from centroid calc
      // Only consider pixels > 20% of peak for CoM
      if (intensity > maxVal * 0.2) {
          totalMass += intensity;
          sumX += x * intensity;
          sumY += y * intensity;
      }
    }
  }

  if (totalMass === 0) return { x: width / 2, y: height / 2, maxVal: 0 };

  return {
    x: sumX / totalMass,
    y: sumY / totalMass,
    maxVal
  };
};

/**
 * Extracts the radial profile starting from the centroid.
 */
export const calculateRadialProfile = (
  imageData: ImageData,
  centerX: number,
  centerY: number,
  maxRadius: number = 64
): RadialDataPoint[] => {
  const { width, data } = imageData;
  const bins = new Array(maxRadius).fill(0);
  const counts = new Array(maxRadius).fill(0);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxRadius) {
        const binIndex = Math.floor(distance);
        const idx = (y * width + x) * 4;
        const intensity = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        bins[binIndex] += intensity;
        counts[binIndex]++;
      }
    }
  }

  // Normalize and create profile
  const profile: RadialDataPoint[] = [];
  const peak = counts[0] > 0 ? bins[0] / counts[0] : 255; // Approx peak

  for (let i = 0; i < maxRadius; i++) {
    const avgIntensity = counts[i] > 0 ? bins[i] / counts[i] : 0;
    // Normalized to 0-1 range
    profile.push({
      radius: i,
      intensity: avgIntensity / peak,
      idealDiffraction: Math.exp(-0.1 * i * i) // Dummy Airy function for visualization comparison
    });
  }

  return profile;
};

/**
 * Check if the image center is saturated (clipping).
 */
export const checkSaturation = (
  imageData: ImageData, 
  centerX: number, 
  centerY: number, 
  radius: number = 3
): boolean => {
  const { width, data } = imageData;
  let saturatedPixels = 0;
  const threshold = 250; // Near 255 for 8-bit images

  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y++) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x++) {
       if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx+1];
          const b = data[idx+2];
          // Check if any channel is clipped
          if (r >= threshold || g >= threshold || b >= threshold) {
             saturatedPixels++;
          }
       }
    }
  }
  // If more than 4 pixels in the core are saturated, it's clipped
  return saturatedPixels > 4;
};

/**
 * Crop the image around the centroid to prepare for API upload.
 * Can optionally apply a log stretch for visualization.
 * Returns both the DataURL (for display/upload) and ImageData (for 3D analysis).
 */
export const cropImage = (
  sourceCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  applyLogStretch: boolean = false
): { url: string; imageData: ImageData | null } => {
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = size;
  cropCanvas.height = size;
  const ctx = cropCanvas.getContext("2d");
  
  if (!ctx) return { url: "", imageData: null };

  // Draw source onto crop
  // Source x start: x - size/2
  const sx = x - size / 2;
  const sy = y - size / 2;

  // Draw original first
  ctx.drawImage(
    sourceCanvas,
    sx, sy, size, size,
    0, 0, size, size
  );

  let imgData = ctx.getImageData(0, 0, size, size);

  if (applyLogStretch) {
     const data = imgData.data;
     // Apply simple log stretch: output = c * log(1 + input)
     // c = 255 / log(1 + 255) approx 45.98
     const constant = 255 / Math.log(1 + 255);
     
     for (let i = 0; i < data.length; i += 4) {
        // Simple luminosity stretch
        data[i] = constant * Math.log(1 + data[i]);     // R
        data[i+1] = constant * Math.log(1 + data[i+1]); // G
        data[i+2] = constant * Math.log(1 + data[i+2]); // B
     }
     ctx.putImageData(imgData, 0, 0);
  } else {
     // Re-fetch clean data if we didn't modify it, 
     // just to be safe (though imgData is already valid).
  }

  return { 
    url: cropCanvas.toDataURL("image/png"),
    imageData: imgData
  };
};

export const estimateStats = (imageData: ImageData): ProcessingStats => {
  const centroid = calculateCentroid(imageData);
  
  // Estimate FWHM (Rough)
  // Find pixels > half max
  let halfMaxCount = 0;
  const halfMax = centroid.maxVal / 2;
  const { width, height, data } = imageData;
  
  let backgroundSum = 0;
  let backgroundCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const val = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (val > halfMax) halfMaxCount++;
    if (val < centroid.maxVal * 0.1) {
        backgroundSum += val;
        backgroundCount++;
    }
  }
  
  // Area = pi * (FWHM/2)^2 roughly -> FWHM = 2 * sqrt(Area/pi)
  // Since pixels are square, area approx = count
  const fwhm = 2 * Math.sqrt(halfMaxCount / Math.PI);
  
  const bg = backgroundCount > 0 ? backgroundSum / backgroundCount : 0;
  const signal = centroid.maxVal - bg;
  const noise = Math.sqrt(bg + 1); // Shot noise approx
  
  return {
    centroid: { x: centroid.x, y: centroid.y },
    fwhmPixels: parseFloat(fwhm.toFixed(2)),
    snr: parseFloat((signal / noise).toFixed(1)),
    peakIntensity: Math.floor(centroid.maxVal),
    backgroundLevel: Math.floor(bg)
  };
};