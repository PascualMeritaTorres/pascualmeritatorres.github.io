/**
 * Text2MidiArt - Main Application
 * Supports both text input and image input for MIDI generation
 */

class Text2MidiArt {
  constructor() {
    // DOM Elements - Text Input
    this.textInput = document.getElementById("text-input");
    this.charCount = document.getElementById("char-count");
    this.generateBtn = document.getElementById("generate-btn");
    this.inputError = document.getElementById("input-error");

    // DOM Elements - Image Input
    this.imageDropZone = document.getElementById("image-drop-zone");
    this.imageInput = document.getElementById("image-input");
    this.dropZoneContent = document.getElementById("drop-zone-content");
    this.imagePreview = document.getElementById("image-preview");
    this.previewImg = document.getElementById("preview-img");
    this.imageClearBtn = document.getElementById("image-clear-btn");

    // DOM Elements - Transport
    this.playBtn = document.getElementById("play-btn");
    this.playIcon = document.getElementById("play-icon");
    this.pauseIcon = document.getElementById("pause-icon");
    this.stopBtn = document.getElementById("stop-btn");

    this.tempoValue = document.getElementById("tempo-value");
    this.tempoUp = document.getElementById("tempo-up");
    this.tempoDown = document.getElementById("tempo-down");

    this.zoomInBtn = document.getElementById("zoom-in-btn");
    this.zoomOutBtn = document.getElementById("zoom-out-btn");
    this.exportBtn = document.getElementById("export-btn");
    this.playhead = document.getElementById("playhead");

    this.confirmDialog = document.getElementById("confirm-dialog");
    this.confirmCancel = document.getElementById("confirm-cancel");
    this.confirmOk = document.getElementById("confirm-ok");

    this.clearNotesBtn = document.getElementById("clear-notes-btn");

    this.noteCount = document.getElementById("note-count");
    this.statusIndicator = document.getElementById("status-indicator");

    // State
    this.currentText = "";
    this.pendingText = null;
    this.pendingImage = null;
    this.currentImage = null;
    this.tempo = 120;
    this.isProcessingImage = false;

    // Initialize modules
    this.pianoRoll = new PianoRoll({
      onNotePreview: (midi) => this.playback.previewNote(midi),
      onNotesChange: (notes) => this.onNotesChange(notes),
    });

    this.playback = new Playback({
      bpm: this.tempo,
      onPlayStateChange: (isPlaying) => this.updatePlayButton(isPlaying),
      onPlayheadUpdate: (position) => this.updatePlayhead(position),
    });

    this.midiExport = new MidiExport();

    // Initialize image processor (lazy loaded)
    this.imageProcessor = new ImageProcessor();

    // Bind events
    this.bindEvents();
    this.bindImageEvents();

    // Initial state
    this.updateCharCount();
    this.updateTempoDisplay();

    // Load default image
    this.loadDefaultImage();
  }

  loadDefaultImage() {
    const defaultImageUrl = "/projects/midi-art/apple-logo.jpg";

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.currentImage = img;
      this.showImagePreview(defaultImageUrl);
    };
    img.onerror = () => {
      console.warn("Default image not found:", defaultImageUrl);
    };
    img.src = defaultImageUrl;
  }

  bindImageEvents() {
    if (!this.imageDropZone) return;

    // Click to open file picker
    this.imageDropZone.addEventListener("click", (e) => {
      if (e.target !== this.imageClearBtn && !this.imageClearBtn?.contains(e.target)) {
        this.imageInput.click();
      }
    });

    // File input change
    this.imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleImageFile(file);
      }
    });

    // Drag and drop
    this.imageDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.imageDropZone.classList.add("drag-over");
    });

    this.imageDropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.imageDropZone.classList.remove("drag-over");
    });

    this.imageDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.imageDropZone.classList.remove("drag-over");

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        this.handleImageFile(file);
      }
    });

    // Clear image button
    if (this.imageClearBtn) {
      this.imageClearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearImage();
      });
    }
  }

  handleImageFile(file) {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      this.showError("Please select an image file (JPG, PNG, GIF, WebP)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showError("Image too large. Maximum size is 10MB.");
      return;
    }

    this.clearError();

    // Create image element for processing
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        this.currentImage = img;
        this.showImagePreview(e.target.result);
        // Clear text input when image is selected
        this.textInput.value = "";
        this.updateCharCount();
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  showImagePreview(dataUrl) {
    if (this.previewImg && this.imagePreview && this.dropZoneContent) {
      this.previewImg.src = dataUrl;
      this.dropZoneContent.style.display = "none";
      this.imagePreview.style.display = "flex";
    }
  }

  clearImage() {
    this.currentImage = null;
    this.pendingImage = null;
    if (this.imageInput) this.imageInput.value = "";
    if (this.previewImg) this.previewImg.src = "";
    if (this.dropZoneContent) this.dropZoneContent.style.display = "flex";
    if (this.imagePreview) this.imagePreview.style.display = "none";
  }

  bindEvents() {
    // Text input
    this.textInput.addEventListener("input", () => {
      this.updateCharCount();
      this.clearError();
    });

    this.textInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleGenerate();
      }
    });

    // Generate
    this.generateBtn.addEventListener("click", () => this.handleGenerate());

    // Transport
    this.playBtn.addEventListener("click", () => this.handlePlay());
    this.stopBtn.addEventListener("click", () => this.handleStop());

    // Tempo (increment by 1)
    this.tempoUp.addEventListener("click", () => this.changeTempo(1));
    this.tempoDown.addEventListener("click", () => this.changeTempo(-1));

    // Zoom
    this.zoomInBtn.addEventListener("click", () => this.pianoRoll.zoomIn());
    this.zoomOutBtn.addEventListener("click", () => this.pianoRoll.zoomOut());

    // Export
    this.exportBtn.addEventListener("click", () => this.handleExport());

    // Dialog
    this.confirmCancel.addEventListener("click", () => this.hideConfirmDialog());
    this.confirmOk.addEventListener("click", () => this.confirmGenerate());

    // Clear notes
    this.clearNotesBtn.addEventListener("click", () => this.handleClearNotes());
    this.confirmDialog.addEventListener("click", (e) => {
      if (e.target === this.confirmDialog) {
        this.hideConfirmDialog();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (document.activeElement === this.textInput) {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleGenerate();
        }
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          this.handlePlay();
          break;
        case "Escape":
          this.handleStop();
          break;
        case "Enter":
          e.preventDefault();
          this.handleGenerate();
          break;
        case "Equal":
        case "NumpadAdd":
          this.changeTempo(1);
          break;
        case "Minus":
        case "NumpadSubtract":
          this.changeTempo(-1);
          break;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        this.handleExport();
      }
    });
  }

  updateCharCount() {
    const count = this.textInput.value.length;
    this.charCount.textContent = count;
  }

  showError(message) {
    this.inputError.textContent = message;
  }

  clearError() {
    this.inputError.textContent = "";
  }

  updateTempoDisplay() {
    this.tempoValue.textContent = this.tempo;
  }

  changeTempo(delta) {
    this.tempo = Math.max(40, Math.min(240, this.tempo + delta));
    this.updateTempoDisplay();
    this.playback.setTempo(this.tempo);
  }

  handleGenerate() {
    // Priority: Image first, then text
    if (this.currentImage) {
      this.handleImageGenerate();
      return;
    }

    const text = this.textInput.value;

    const validation = validateText(text);
    if (!validation.valid) {
      this.showError(validation.error);
      return;
    }

    this.clearError();

    if (this.pianoRoll.isDirty && this.pianoRoll.notes.length > 0) {
      this.pendingText = text;
      this.showConfirmDialog();
      return;
    }

    this.generateNotes(text);
  }

  async handleImageGenerate() {
    if (this.isProcessingImage) return;

    this.clearError();

    if (this.pianoRoll.isDirty && this.pianoRoll.notes.length > 0) {
      this.pendingImage = this.currentImage;
      this.showConfirmDialog();
      return;
    }

    await this.generateNotesFromImage(this.currentImage);
  }

  async generateNotesFromImage(imageElement) {
    if (this.isProcessingImage) return;

    this.isProcessingImage = true;
    this.handleStop();
    this.updateStatus("PROCESSING...");
    this.generateBtn.disabled = true;

    try {
      const notes = await this.imageProcessor.processImage(imageElement);

      if (notes.length === 0) {
        this.showError("No contours found in image. Try a higher contrast image.");
        this.updateStatus("READY");
        return;
      }

      this.pianoRoll.setNotes(notes);
      this.playback.setNotes(notes);
      this.currentText = "image";
      this.updateNoteCount(notes.length);
      this.updateStatus("READY");
    } catch (error) {
      console.error("Image processing error:", error);
      this.showError("Failed to process image. Please try another image.");
      this.updateStatus("ERROR");
    } finally {
      this.isProcessingImage = false;
      this.generateBtn.disabled = false;
    }
  }

  showConfirmDialog() {
    this.confirmDialog.style.display = "flex";
  }

  hideConfirmDialog() {
    this.confirmDialog.style.display = "none";
    this.pendingText = null;
    this.pendingImage = null;
  }

  confirmGenerate() {
    const textToGenerate = this.pendingText;
    const imageToGenerate = this.pendingImage;
    this.hideConfirmDialog();

    if (imageToGenerate !== null) {
      this.generateNotesFromImage(imageToGenerate);
    } else if (textToGenerate !== null) {
      this.generateNotes(textToGenerate);
    }
  }

  generateNotes(text) {
    this.handleStop();

    const notes = textToNotes(text, 60);
    this.pianoRoll.setNotes(notes);
    this.playback.setNotes(notes);
    this.currentText = text;
    this.updateNoteCount(notes.length);
    this.updateStatus("READY");
  }

  onNotesChange(notes) {
    this.playback.setNotes(notes);
    this.updateNoteCount(notes.length);
  }

  updateNoteCount(count) {
    if (this.noteCount) {
      this.noteCount.textContent = count;
    }
    // Show/hide clear button based on note count
    if (this.clearNotesBtn) {
      this.clearNotesBtn.style.display = count > 0 ? "flex" : "none";
    }
  }

  handleClearNotes() {
    this.handleStop();
    this.pianoRoll.setNotes([]);
    this.playback.setNotes([]);
    this.currentText = "";
    this.updateNoteCount(0);
    this.updateStatus("READY");
  }

  updateStatus(status) {
    if (this.statusIndicator) {
      this.statusIndicator.textContent = status;
    }
  }

  handlePlay() {
    this.playback.play();
  }

  handleStop() {
    this.playback.stop();
  }

  updatePlayButton(isPlaying) {
    this.playIcon.style.display = isPlaying ? "none" : "block";
    this.pauseIcon.style.display = isPlaying ? "block" : "none";
    this.playBtn.classList.toggle("active", isPlaying);

    if (isPlaying) {
      this.playhead.classList.add("visible");
      this.updateStatus("PLAYING");
    } else {
      this.updateStatus("READY");
    }
  }

  updatePlayhead(position) {
    const effectiveColWidth = this.pianoRoll.colWidth * this.pianoRoll.zoom;
    const x = position * effectiveColWidth;
    this.playhead.style.left = `${x}px`;

    if (position === 0 && !this.playback.isPlaying) {
      this.playhead.classList.remove("visible");
    }
  }

  handleExport() {
    const notes = this.pianoRoll.getNotes();

    if (notes.length === 0) {
      this.showError("No notes to export. Generate some text first!");
      return;
    }

    const filename = this.midiExport.generateFilename(this.currentText);
    this.midiExport.export(notes, filename, this.tempo);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new Text2MidiArt();
});
