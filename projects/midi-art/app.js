/**
 * Text2MidiArt - Main Application
 */

class Text2MidiArt {
  constructor() {
    // DOM Elements
    this.textInput = document.getElementById("text-input");
    this.charCount = document.getElementById("char-count");
    this.generateBtn = document.getElementById("generate-btn");
    this.inputError = document.getElementById("input-error");

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

    this.chips = document.querySelectorAll(".preset-btn");
    this.noteCount = document.getElementById("note-count");
    this.statusIndicator = document.getElementById("status-indicator");

    // State
    this.currentText = "";
    this.pendingText = null;
    this.tempo = 120;

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

    // Bind events
    this.bindEvents();

    // Initial state
    this.updateCharCount();
    this.updateTempoDisplay();
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

    // Chips (suggestions)
    this.chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const preset = chip.dataset.preset;
        this.textInput.value = preset;
        this.updateCharCount();
        this.clearError();
        this.updateChipSelection();
      });
    });

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
    this.updateChipSelection();
  }

  updateChipSelection() {
    const typed = this.textInput.value.toUpperCase();
    this.chips.forEach((chip) => {
      chip.classList.toggle("selected", chip.dataset.preset === typed);
    });
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

  showConfirmDialog() {
    this.confirmDialog.style.display = "flex";
  }

  hideConfirmDialog() {
    this.confirmDialog.style.display = "none";
    this.pendingText = null;
  }

  confirmGenerate() {
    const textToGenerate = this.pendingText;
    this.hideConfirmDialog();
    if (textToGenerate !== null) {
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
