export interface NormalizedScanBox {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  label: string;
  confidence?: number;
}

/**
 * Convert raw backend or HF model bounding boxes (normalized [0..1] OR pixel [x1,y1,x2,y2])
 * into clamped percentage coordinates [0..100] aligned to the image's natural dimensions.
 */
export function normalizeScanBoxes(
  rawBoxes: any[] | undefined,
  naturalWidth: number,
  naturalHeight: number,
  fallbackLabel = "Detected ROI"
): NormalizedScanBox[] {
  if (!Array.isArray(rawBoxes) || rawBoxes.length === 0) return [];

  const result: NormalizedScanBox[] = [];

  for (let i = 0; i < rawBoxes.length; i++) {
    const rawBox = rawBoxes[i];
    const coords = Array.isArray(rawBox)
      ? rawBox
      : rawBox?.coordinates || rawBox?.bbox || null;

    if (!Array.isArray(coords) || coords.length < 4) continue;

    const x1 = Number(coords[0]);
    const y1 = Number(coords[1]);
    const x2 = Number(coords[2]);
    const y2 = Number(coords[3]);

    if ([x1, y1, x2, y2].some((v) => Number.isNaN(v))) continue;

    const maxVal = Math.max(x1, y1, x2, y2);
    let nx1 = x1;
    let ny1 = y1;
    let nx2 = x2;
    let ny2 = y2;

    if (maxVal > 1.05) {
      // Pixel coordinates relative to natural image size (or YOLO input size)
      const refW = naturalWidth > 0 ? naturalWidth : Math.max(640, x1, x2);
      const refH = naturalHeight > 0 ? naturalHeight : Math.max(640, y1, y2);
      const denomW = Math.max(refW, x1, x2);
      const denomH = Math.max(refH, y1, y2);
      nx1 = x1 / denomW;
      nx2 = x2 / denomW;
      ny1 = y1 / denomH;
      ny2 = y2 / denomH;
    }

    const left = Math.max(0, Math.min(1, Math.min(nx1, nx2)));
    const right = Math.max(0, Math.min(1, Math.max(nx1, nx2)));
    const top = Math.max(0, Math.min(1, Math.min(ny1, ny2)));
    const bottom = Math.max(0, Math.min(1, Math.max(ny1, ny2)));

    const width = Math.max(0.02, right - left);
    const height = Math.max(0.02, bottom - top);

    // Ensure box stays inside [0, 1]
    const clampedLeft = Math.min(left, 1 - width);
    const clampedTop = Math.min(top, 1 - height);

    result.push({
      leftPct: clampedLeft * 100,
      topPct: clampedTop * 100,
      widthPct: width * 100,
      heightPct: height * 100,
      label: rawBox?.class || rawBox?.label || fallbackLabel || `ROI #${i + 1}`,
      confidence: typeof rawBox?.confidence === "number" ? rawBox.confidence : undefined,
    });
  }

  return result;
}

