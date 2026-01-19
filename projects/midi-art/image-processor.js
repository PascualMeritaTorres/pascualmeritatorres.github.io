/**
 * Image to MIDI Art - OpenCV.js Contour Processor
 * Extracts contours from images and converts them to MIDI notes
 */

class ImageProcessor {
  constructor() {
    this.isReady = false;
    this.cv = null;

    // Configuration optimized for complex shapes
    this.config = {
      maxImageWidth: 600,
      minContourAreaPercent: 0.015, // Lower threshold = more contours
      minContourPoints: 3,
      totalDuration: 64, // 4 bars in 16th notes
      pitchRange: { min: 48, max: 96 }, // C3 to C7
      epsilonFactor: 0.002, // Lower = less simplification = more detail preserved
      resampleInterval: 4, // Sample contour every N pixels for more notes
      minNotesPerContour: 16, // Ensure at least this many notes per contour

      // Complex shape preprocessing parameters
      bilateralD: 9, // Diameter for bilateral filter
      bilateralSigmaColor: 75, // Color sigma for bilateral filter
      bilateralSigmaSpace: 75, // Space sigma for bilateral filter
      claheClipLimit: 2.0, // CLAHE contrast limit
      claheTileSize: 8, // CLAHE tile grid size
      cannyLow: 50, // Canny low threshold (lower = more edges)
      cannyHigh: 100, // Canny high threshold
      morphKernelSize: 3, // Morphological kernel size
    };

    // Scale definitions for auto-selection based on curvature
    this.scales = {
      pentatonic: [0, 2, 4, 7, 9],
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    };
  }

  /**
   * Load OpenCV.js from CDN
   */
  async init() {
    if (this.isReady) return;

    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.cv && window.cv.Mat) {
        this.cv = window.cv;
        this.isReady = true;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://docs.opencv.org/4.x/opencv.js";
      script.async = true;

      script.onload = () => {
        // OpenCV.js needs time to initialize after script loads
        const checkReady = () => {
          if (window.cv && window.cv.Mat) {
            this.cv = window.cv;
            this.isReady = true;
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };

        // Set up the onRuntimeInitialized callback
        if (window.cv) {
          window.cv["onRuntimeInitialized"] = () => {
            this.cv = window.cv;
            this.isReady = true;
            resolve();
          };
        }

        checkReady();
      };

      script.onerror = () => {
        reject(new Error("Failed to load OpenCV.js"));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Process an image and convert to MIDI notes
   * @param {HTMLImageElement|HTMLCanvasElement} imageElement
   * @returns {Array} Array of note objects
   */
  async processImage(imageElement) {
    if (!this.isReady) {
      await this.init();
    }

    const cv = this.cv;
    let src = null;
    let gray = null;
    let enhanced = null;
    let blurred = null;
    let edges = null;
    let closed = null;
    let contours = null;
    let hierarchy = null;
    let kernel = null;

    try {
      // 1. Load image into Mat
      src = cv.imread(imageElement);

      // 2. Resize if too large
      if (src.cols > this.config.maxImageWidth) {
        const scale = this.config.maxImageWidth / src.cols;
        const newSize = new cv.Size(this.config.maxImageWidth, Math.round(src.rows * scale));
        cv.resize(src, src, newSize, 0, 0, cv.INTER_AREA);
      }

      const imageArea = src.cols * src.rows;

      // 3. Convert to grayscale
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // 4. Apply CLAHE for contrast enhancement (helps with complex shapes)
      enhanced = new cv.Mat();
      const clahe = new cv.CLAHE(this.config.claheClipLimit, new cv.Size(this.config.claheTileSize, this.config.claheTileSize));
      clahe.apply(gray, enhanced);
      clahe.delete();

      // 5. Apply bilateral filter (preserves edges better than Gaussian)
      blurred = new cv.Mat();
      cv.bilateralFilter(enhanced, blurred, this.config.bilateralD, this.config.bilateralSigmaColor, this.config.bilateralSigmaSpace);

      // 6. Canny edge detection (better for complex contours than thresholding)
      edges = new cv.Mat();
      cv.Canny(blurred, edges, this.config.cannyLow, this.config.cannyHigh);

      // 7. Morphological closing to connect broken contour segments
      closed = new cv.Mat();
      kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(this.config.morphKernelSize, this.config.morphKernelSize));
      cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);

      // 8. Find contours (use CHAIN_APPROX_NONE for all points)
      contours = new cv.MatVector();
      hierarchy = new cv.Mat();
      cv.findContours(
        closed,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL, // Only outermost contours, no internal edges
        cv.CHAIN_APPROX_NONE // Get all contour points, not just endpoints
      );

      // 9. Filter and process contours
      const filteredContours = this.filterContours(contours, imageArea);
      const notes = [];

      for (const contour of filteredContours) {
        const contourNotes = this.contourToNotes(contour, src.cols, src.rows);
        notes.push(...contourNotes);
      }

      // Clean up filtered contours
      for (const contour of filteredContours) {
        contour.delete();
      }

      // Remove overlapping notes
      return this.deduplicateNotes(notes);
    } finally {
      // Clean up OpenCV memory
      if (src) src.delete();
      if (gray) gray.delete();
      if (enhanced) enhanced.delete();
      if (blurred) blurred.delete();
      if (edges) edges.delete();
      if (closed) closed.delete();
      if (kernel) kernel.delete();
      if (hierarchy) hierarchy.delete();
      if (contours) {
        for (let i = 0; i < contours.size(); i++) {
          contours.get(i).delete();
        }
        contours.delete();
      }
    }
  }

  /**
   * Filter out small/noisy contours
   */
  filterContours(contours, imageArea) {
    const cv = this.cv;
    const minArea = imageArea * (this.config.minContourAreaPercent / 100);
    const filtered = [];

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      const pointCount = contour.rows;

      if (area >= minArea && pointCount >= this.config.minContourPoints) {
        // Clone the contour to keep all original points (no simplification)
        const clone = contour.clone();
        filtered.push(clone);
      }
    }

    return filtered;
  }

  /**
   * Convert a simplified contour to MIDI notes
   */
  contourToNotes(contour, imageWidth, imageHeight) {
    const cv = this.cv;
    const notes = [];

    // Extract points from contour
    const points = [];
    for (let i = 0; i < contour.rows; i++) {
      points.push({
        x: contour.data32S[i * 2],
        y: contour.data32S[i * 2 + 1],
      });
    }

    if (points.length < 2) return notes;

    // Check if contour is closed (circle-like)
    const isClosed = cv.isContourConvex(contour) || this.isClosedContour(points);

    if (isClosed && points.length >= 4) {
      // Handle closed contours with contrary motion
      return this.processClosedContour(points, imageWidth, imageHeight);
    }

    // Process open contour
    return this.processOpenContour(points, imageWidth, imageHeight);
  }

  /**
   * Check if a contour is effectively closed
   */
  isClosedContour(points) {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    const dist = Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
    // Consider closed if first and last points are within 5% of max dimension
    const threshold = Math.max(...points.map((p) => p.x), ...points.map((p) => p.y)) * 0.05;
    return dist < threshold;
  }

  /**
   * Process a closed contour (circle, oval, etc.) with contrary motion
   */
  processClosedContour(points, imageWidth, imageHeight) {
    const notes = [];

    // Find leftmost and rightmost points
    let leftIdx = 0;
    let rightIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].x < points[leftIdx].x) leftIdx = i;
      if (points[i].x > points[rightIdx].x) rightIdx = i;
    }

    // Split into top and bottom halves
    const topHalf = [];
    const bottomHalf = [];

    // Reorder points starting from leftmost
    const reordered = [...points.slice(leftIdx), ...points.slice(0, leftIdx)];

    // Find the rightmost point in reordered array
    let splitIdx = 0;
    for (let i = 1; i < reordered.length; i++) {
      if (reordered[i].x > reordered[splitIdx].x) splitIdx = i;
    }

    // Top half: leftmost to rightmost (going one way)
    for (let i = 0; i <= splitIdx; i++) {
      topHalf.push(reordered[i]);
    }

    // Bottom half: rightmost back to leftmost (going the other way)
    for (let i = splitIdx; i < reordered.length; i++) {
      bottomHalf.push(reordered[i]);
    }
    bottomHalf.push(reordered[0]); // Close the loop

    // Generate notes for both halves
    const topNotes = this.processOpenContour(topHalf, imageWidth, imageHeight);
    const bottomNotes = this.processOpenContour(bottomHalf, imageWidth, imageHeight);

    return [...topNotes, ...bottomNotes];
  }

  /**
   * Resample a contour to have points at regular intervals
   */
  resampleContour(points) {
    if (points.length < 2) return points;

    const resampled = [points[0]];
    let accumulated = 0;
    const interval = this.config.resampleInterval;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const segmentLength = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));

      // Walk along this segment, adding points at intervals
      let remaining = segmentLength;
      let startDist = interval - accumulated;

      while (startDist <= remaining) {
        const t = startDist / segmentLength;
        resampled.push({
          x: prev.x + t * (curr.x - prev.x),
          y: prev.y + t * (curr.y - prev.y),
        });
        remaining -= startDist;
        startDist = interval;
      }

      accumulated = (accumulated + segmentLength) % interval;
    }

    // Always include the last point
    const last = points[points.length - 1];
    const lastResampled = resampled[resampled.length - 1];
    if (lastResampled.x !== last.x || lastResampled.y !== last.y) {
      resampled.push(last);
    }

    // Ensure minimum number of points
    if (resampled.length < this.config.minNotesPerContour && points.length >= 2) {
      return this.interpolateToMinPoints(points, this.config.minNotesPerContour);
    }

    return resampled;
  }

  /**
   * Interpolate points to ensure minimum count
   */
  interpolateToMinPoints(points, minCount) {
    if (points.length >= minCount) return points;

    const result = [];
    const totalLength = this.getContourLength(points);
    const stepLength = totalLength / (minCount - 1);

    let currentDist = 0;
    let segmentIdx = 0;
    let segmentDist = 0;

    result.push(points[0]);

    for (let i = 1; i < minCount - 1; i++) {
      const targetDist = i * stepLength;

      while (currentDist + this.getSegmentLength(points, segmentIdx) < targetDist && segmentIdx < points.length - 2) {
        currentDist += this.getSegmentLength(points, segmentIdx);
        segmentIdx++;
      }

      const segLen = this.getSegmentLength(points, segmentIdx);
      const t = segLen > 0 ? (targetDist - currentDist) / segLen : 0;
      const p1 = points[segmentIdx];
      const p2 = points[Math.min(segmentIdx + 1, points.length - 1)];

      result.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      });
    }

    result.push(points[points.length - 1]);
    return result;
  }

  getContourLength(points) {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      length += this.getSegmentLength(points, i);
    }
    return length;
  }

  getSegmentLength(points, idx) {
    if (idx >= points.length - 1) return 0;
    const p1 = points[idx];
    const p2 = points[idx + 1];
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Process an open contour (line, curve)
   */
  processOpenContour(points, imageWidth, imageHeight) {
    const notes = [];

    // Resample contour for more notes
    const resampledPoints = this.resampleContour(points);

    for (let i = 0; i < resampledPoints.length; i++) {
      const point = resampledPoints[i];

      // Calculate curvature at this point
      const curvature = this.calculateCurvature(resampledPoints, i);

      // Classify segment and get scale
      const classification = this.classifySegment(curvature);

      // Map position to pitch and time
      const pitch = this.yPositionToPitch(point.y, imageHeight);
      const time = this.xPositionToTime(point.x, imageWidth);

      // Quantize pitch to the selected scale
      const quantizedPitch = this.quantizeToScale(pitch, classification.scale);

      // Determine note duration based on classification
      let duration = 1; // Default: 1 sixteenth note
      if (classification.type === "SUSTAINED") {
        duration = Math.min(4, Math.max(1, Math.floor(classification.duration / 4)));
      } else if (classification.type === "SLOW_SCALE") {
        duration = 4; // Quarter note
      } else if (classification.type === "MEDIUM_SCALE") {
        duration = 2; // Eighth note
      } else if (classification.type === "CHORD") {
        // For chords, add multiple notes at same time
        duration = 2;
        // Add chord tones
        const chordTones = this.generateChordTones(quantizedPitch, 5);
        for (const chordPitch of chordTones) {
          if (chordPitch !== quantizedPitch) {
            notes.push({
              id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              pitch: chordPitch,
              startTime: time,
              duration: duration,
            });
          }
        }
      }

      // Add the main note
      notes.push({
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pitch: quantizedPitch,
        startTime: time,
        duration: duration,
      });
    }

    return notes;
  }

  /**
   * Calculate Menger curvature at a point
   */
  calculateCurvature(points, index) {
    if (index === 0 || index >= points.length - 1) return 0;

    const prev = points[index - 1];
    const curr = points[index];
    const next = points[index + 1];

    // Calculate triangle area using cross product
    const area = Math.abs((curr.x - prev.x) * (next.y - prev.y) - (next.x - prev.x) * (curr.y - prev.y)) / 2;

    // Calculate distances
    const d1 = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
    const d2 = Math.sqrt(Math.pow(next.x - curr.x, 2) + Math.pow(next.y - curr.y, 2));
    const d3 = Math.sqrt(Math.pow(next.x - prev.x, 2) + Math.pow(next.y - prev.y, 2));

    // Avoid division by zero
    if (d1 * d2 * d3 === 0) return 0;

    // Menger curvature
    return (4 * area) / (d1 * d2 * d3);
  }

  /**
   * Classify a segment based on its curvature (always pentatonic scale)
   */
  classifySegment(curvature) {
    if (curvature < 0.01) {
      return { type: "SUSTAINED", duration: 8, scale: "pentatonic" };
    }
    if (curvature < 0.05) {
      return { type: "SLOW_SCALE", scale: "pentatonic" };
    }
    if (curvature < 0.15) {
      return { type: "MEDIUM_SCALE", scale: "pentatonic" };
    }
    if (curvature < 0.4) {
      return { type: "FAST_SCALE", scale: "pentatonic" };
    }
    return { type: "CHORD", scale: "pentatonic" };
  }

  /**
   * Map Y position to MIDI pitch
   */
  yPositionToPitch(y, imageHeight) {
    // Invert Y (top of image = high pitch)
    const normalizedY = 1 - y / imageHeight;
    const { min, max } = this.config.pitchRange;
    return Math.round(min + normalizedY * (max - min));
  }

  /**
   * Map X position to time in 16th notes (unquantized for smooth contours)
   */
  xPositionToTime(x, imageWidth) {
    return (x / imageWidth) * this.config.totalDuration;
  }

  /**
   * Quantize pitch to a scale
   */
  quantizeToScale(midiPitch, scaleName) {
    const scale = this.scales[scaleName] || this.scales.chromatic;
    const rootNote = 60; // C4

    const octave = Math.floor((midiPitch - rootNote) / 12);
    let semitone = (((midiPitch - rootNote) % 12) + 12) % 12;

    // Find closest scale degree
    let closest = scale[0];
    let minDist = Math.abs(semitone - scale[0]);

    for (const degree of scale) {
      const dist = Math.min(Math.abs(semitone - degree), Math.abs(semitone - degree + 12), Math.abs(semitone - degree - 12));
      if (dist < minDist) {
        minDist = dist;
        closest = degree;
      }
    }

    return rootNote + octave * 12 + closest;
  }

  /**
   * Generate chord tones around a root note
   */
  generateChordTones(rootPitch, count) {
    const tones = [rootPitch];
    const intervals = [3, 4, 7, 10, 12]; // Minor 3rd, Major 3rd, 5th, 7th, Octave

    for (let i = 0; i < Math.min(count - 1, intervals.length); i++) {
      const tone = rootPitch + intervals[i];
      if (tone >= 21 && tone <= 108) {
        tones.push(tone);
      }
    }

    return tones;
  }

  /**
   * Remove overlapping notes (same pitch with overlapping time ranges)
   */
  deduplicateNotes(notes) {
    if (notes.length === 0) return notes;

    // Sort by pitch, then by startTime
    const sorted = [...notes].sort((a, b) => {
      if (a.pitch !== b.pitch) return a.pitch - b.pitch;
      return a.startTime - b.startTime;
    });

    const result = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      if (next.pitch === current.pitch) {
        // Same pitch - check for overlap
        const currentEnd = current.startTime + current.duration;
        const nextEnd = next.startTime + next.duration;

        if (next.startTime < currentEnd) {
          // Calculate overlap amount
          const overlapAmount = currentEnd - next.startTime;
          const shorterDuration = Math.min(current.duration, next.duration);
          const overlapPercent = overlapAmount / shorterDuration;

          if (overlapPercent > 0.5) {
            // More than 50% overlap - merge by extending current note
            current = {
              ...current,
              duration: Math.max(currentEnd, nextEnd) - current.startTime,
            };
          } else {
            // Less than 50% overlap - keep both separate
            result.push(current);
            current = next;
          }
        } else {
          // No overlap - keep current, move to next
          result.push(current);
          current = next;
        }
      } else {
        // Different pitch - keep current, move to next
        result.push(current);
        current = next;
      }
    }

    // Don't forget the last note
    result.push(current);

    return result;
  }
}

// Export for use
window.ImageProcessor = ImageProcessor;
