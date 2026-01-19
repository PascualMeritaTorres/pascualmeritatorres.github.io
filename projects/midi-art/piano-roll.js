/**
 * Piano Roll - Rendering and Interaction
 */

class PianoRoll {
  constructor(options = {}) {
    // Elements
    this.keyboard = document.getElementById("piano-keyboard");
    this.gridWrapper = document.getElementById("piano-grid-wrapper");
    this.canvas = document.getElementById("piano-grid");
    this.notesContainer = document.getElementById("notes-container");
    this.playhead = document.getElementById("playhead");
    this.playheadHandle = document.getElementById("playhead-handle");
    this.timeline = document.getElementById("timeline");
    this.ctx = this.canvas.getContext("2d");

    // Configuration
    this.totalKeys = 88;
    this.lowestNote = 21; // A0
    this.highestNote = 108; // C8
    this.basePitch = 60; // C4 - center of generated text

    // Dimensions from CSS
    this.updateDimensions();

    // State
    this.notes = [];
    this.zoom = 1;
    this.minZoom = 0.5;
    this.maxZoom = 3;
    this.totalColumns = 100; // Default, updated when text is generated
    this.isDirty = false; // Track if manual edits have been made

    // Interaction state
    this.selectedNote = null;
    this.dragState = null;
    this.longPressTimer = null;
    this.longPressDelay = 500; // ms
    this.lastNoteDuration = 4; // Default: quarter note (4 sixteenth notes)

    // Two-finger pan state
    this.isPanning = false;
    this.panStartScroll = { x: 0, y: 0 };
    this.panStartTouch = { x: 0, y: 0 };

    // Callbacks
    this.onNotePreview = options.onNotePreview || (() => {});
    this.onNotesChange = options.onNotesChange || (() => {});
    this.onSeek = options.onSeek || (() => {});

    // Playhead dragging state
    this.isDraggingPlayhead = false;

    // Initialize
    this.init();
  }

  updateDimensions() {
    const style = getComputedStyle(document.documentElement);
    this.rowHeight = parseInt(style.getPropertyValue("--row-height")) || 16;
    this.colWidth = parseInt(style.getPropertyValue("--col-width")) || 20;
    this.keyWidth = parseInt(style.getPropertyValue("--key-width")) || 48;
  }

  init() {
    this.renderKeyboard();
    this.setupCanvas();
    this.renderGrid();
    this.renderTimeline();
    this.bindEvents();
    this.bindTimelineEvents();
    this.scrollToCenter();
  }

  // Get note name from MIDI number
  getNoteNameFromMidi(midi) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = noteNames[midi % 12];
    return { name: noteName, octave, full: `${noteName}${octave}` };
  }

  isBlackKey(midi) {
    const note = midi % 12;
    return [1, 3, 6, 8, 10].includes(note);
  }

  renderKeyboard() {
    this.keyboard.innerHTML = "";

    // Render from highest to lowest (top to bottom)
    for (let midi = this.highestNote; midi >= this.lowestNote; midi--) {
      const noteInfo = this.getNoteNameFromMidi(midi);
      const isBlack = this.isBlackKey(midi);

      const key = document.createElement("div");
      key.className = `piano-key ${isBlack ? "black-key" : "white-key"}`;
      key.dataset.midi = midi;

      this.keyboard.appendChild(key);
    }
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener("resize", () => {
      this.updateDimensions();
      this.resizeCanvas();
      this.renderGrid();
      this.renderTimeline();
      this.renderNotes();
    });
  }

  resizeCanvas() {
    const width = Math.max(this.totalColumns * this.colWidth * this.zoom, this.gridWrapper.clientWidth);
    const height = this.totalKeys * this.rowHeight;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.notesContainer.style.width = `${width}px`;
    this.notesContainer.style.height = `${height}px`;

    // Playhead height is now 100% of container via CSS
  }

  renderGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    // Backlit Transflective LCD - desaturated gray-green to match text input
    const lcdBg = "rgba(178, 186, 170, 1)"; // Main background (gray-green)
    const lcdBgAlt = "rgba(168, 176, 162, 1)"; // Alternate rows (slightly darker)
    const lcdBorder = "rgba(148, 156, 142, 0.55)"; // Grid lines (muted, soft)
    const lcdBorderStrong = "rgba(128, 136, 122, 0.65)"; // Beat markers

    // Draw row backgrounds (alternating for white/black keys)
    for (let i = 0; i < this.totalKeys; i++) {
      const midi = this.highestNote - i;
      const isBlack = this.isBlackKey(midi);
      const y = i * this.rowHeight;

      this.ctx.fillStyle = isBlack ? lcdBgAlt : lcdBg;
      this.ctx.fillRect(0, y, width, this.rowHeight);
    }

    // Draw horizontal lines
    this.ctx.strokeStyle = lcdBorder;
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= this.totalKeys; i++) {
      const y = i * this.rowHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(width, y + 0.5);
      this.ctx.stroke();
    }

    // Draw vertical lines (time divisions) - softer
    const effectiveColWidth = this.colWidth * this.zoom;
    const totalCols = Math.ceil(width / effectiveColWidth);

    for (let i = 0; i <= totalCols; i++) {
      const x = i * effectiveColWidth;

      // Stronger line every 4 columns (beat)
      if (i % 4 === 0) {
        this.ctx.strokeStyle = lcdBorderStrong;
        this.ctx.lineWidth = 1;
      } else {
        this.ctx.strokeStyle = lcdBorder;
        this.ctx.lineWidth = 0.5;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, height);
      this.ctx.stroke();
    }
  }

  renderTimeline() {
    if (!this.timeline) return;

    const effectiveColWidth = this.colWidth * this.zoom;
    const totalWidth = this.totalColumns * effectiveColWidth;
    const barWidth = 16 * effectiveColWidth; // 16 sixteenth notes = 1 bar

    // Create or update timeline inner container
    let inner = this.timeline.querySelector(".timeline-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "timeline-inner";
      this.timeline.appendChild(inner);
    }

    inner.innerHTML = "";
    inner.style.width = `${totalWidth}px`;

    // Add bar markers
    const numBars = Math.ceil(this.totalColumns / 16);
    for (let i = 0; i <= numBars; i++) {
      const marker = document.createElement("div");
      marker.className = "timeline-bar";
      marker.style.left = `${i * barWidth}px`;
      marker.textContent = i + 1;
      inner.appendChild(marker);
    }
  }

  bindTimelineEvents() {
    if (!this.timeline) return;

    // Sync timeline scroll with grid scroll
    this.gridWrapper.addEventListener("scroll", () => {
      this.timeline.scrollLeft = this.gridWrapper.scrollLeft;
    });

    // Click on timeline to seek
    this.timeline.addEventListener("click", (e) => {
      if (this.isDraggingPlayhead) return;
      const rect = this.timeline.getBoundingClientRect();
      const x = e.clientX - rect.left + this.timeline.scrollLeft;
      const position = x / (this.colWidth * this.zoom);
      this.onSeek(Math.max(0, position));
    });

    // Playhead handle drag
    if (this.playheadHandle) {
      this.playheadHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isDraggingPlayhead = true;
        this.playheadHandle.classList.add("dragging");
        document.body.style.cursor = "grabbing";
      });

      document.addEventListener("mousemove", (e) => {
        if (!this.isDraggingPlayhead) return;
        const rect = this.gridWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left + this.gridWrapper.scrollLeft;
        const position = x / (this.colWidth * this.zoom);
        this.onSeek(Math.max(0, position));
      });

      document.addEventListener("mouseup", () => {
        if (this.isDraggingPlayhead) {
          this.isDraggingPlayhead = false;
          this.playheadHandle.classList.remove("dragging");
          document.body.style.cursor = "";
        }
      });
    }
  }

  setNotes(notes) {
    this.notes = notes.map((n) => ({ ...n }));
    this.isDirty = false;
    this.updateTotalColumns();
    this.resizeCanvas();
    this.renderGrid();
    this.renderTimeline();
    this.renderNotes();
    this.scrollToContent();
  }

  getNotes() {
    return this.notes.map((n) => ({ ...n }));
  }

  updateTotalColumns() {
    if (this.notes.length === 0) {
      this.totalColumns = 100;
      return;
    }

    const maxEnd = Math.max(...this.notes.map((n) => n.startTime + n.duration));
    this.totalColumns = Math.max(maxEnd + 20, 100);
  }

  renderNotes() {
    this.notesContainer.innerHTML = "";

    const effectiveColWidth = this.colWidth * this.zoom;

    this.notes.forEach((note) => {
      const el = document.createElement("div");
      el.className = "note";
      el.dataset.id = note.id;

      const rowIndex = this.highestNote - note.pitch;
      const x = note.startTime * effectiveColWidth;
      const y = rowIndex * this.rowHeight;
      const width = note.duration * effectiveColWidth;

      el.style.left = `${x}px`;
      el.style.top = `${y + 1}px`;
      el.style.width = `${width - 1}px`;
      el.style.height = `${this.rowHeight - 2}px`;

      // Add resize handles
      const leftHandle = document.createElement("div");
      leftHandle.className = "note-resize-handle left";
      el.appendChild(leftHandle);

      const rightHandle = document.createElement("div");
      rightHandle.className = "note-resize-handle right";
      el.appendChild(rightHandle);

      this.notesContainer.appendChild(el);
    });
  }

  scrollToCenter() {
    // Scroll to middle C area
    const centerRow = this.highestNote - this.basePitch;
    const targetY = (centerRow - 10) * this.rowHeight;
    this.gridWrapper.scrollTop = Math.max(0, targetY);
    this.keyboard.scrollTop = this.gridWrapper.scrollTop;
  }

  scrollToContent() {
    if (this.notes.length === 0) {
      this.scrollToCenter();
      return;
    }

    // Find pitch range of notes
    const pitches = this.notes.map((n) => n.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const centerPitch = Math.floor((minPitch + maxPitch) / 2);

    // Scroll to center the notes vertically
    const centerRow = this.highestNote - centerPitch;
    const viewHeight = this.gridWrapper.clientHeight;
    const targetY = centerRow * this.rowHeight - viewHeight / 2;

    this.gridWrapper.scrollTop = Math.max(0, targetY);
    this.keyboard.scrollTop = this.gridWrapper.scrollTop;

    // Scroll horizontally to start
    this.gridWrapper.scrollLeft = 0;
  }

  bindEvents() {
    // Sync keyboard scroll with grid scroll (bidirectional)
    this.gridWrapper.addEventListener("scroll", () => {
      this.keyboard.scrollTop = this.gridWrapper.scrollTop;
    });

    this.keyboard.addEventListener("scroll", () => {
      this.gridWrapper.scrollTop = this.keyboard.scrollTop;
    });

    // Piano keyboard click - preview notes
    this.keyboard.addEventListener("mousedown", (e) => {
      const key = e.target.closest(".piano-key");
      if (key) {
        const midi = parseInt(key.dataset.midi);
        this.onNotePreview(midi);
      }
    });

    this.keyboard.addEventListener(
      "touchstart",
      (e) => {
        const key = e.target.closest(".piano-key");
        if (key) {
          e.preventDefault();
          const midi = parseInt(key.dataset.midi);
          this.onNotePreview(midi);
        }
      },
      { passive: false }
    );

    // Grid interactions
    this.bindGridEvents();
  }

  bindGridEvents() {
    // Mouse events
    this.gridWrapper.addEventListener("mousedown", (e) => this.handlePointerDown(e, "mouse"));
    this.gridWrapper.addEventListener("mousemove", (e) => this.handlePointerMove(e, "mouse"));
    this.gridWrapper.addEventListener("mouseup", (e) => this.handlePointerUp(e, "mouse"));
    this.gridWrapper.addEventListener("mouseleave", (e) => this.handlePointerUp(e, "mouse"));

    // Right-click to delete
    this.gridWrapper.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const note = e.target.closest(".note");
      if (note) {
        this.deleteNote(note.dataset.id);
      }
    });

    // Touch events
    this.gridWrapper.addEventListener("touchstart", (e) => this.handlePointerDown(e, "touch"), { passive: false });
    this.gridWrapper.addEventListener("touchmove", (e) => this.handlePointerMove(e, "touch"), { passive: false });
    this.gridWrapper.addEventListener("touchend", (e) => this.handlePointerUp(e, "touch"));
    this.gridWrapper.addEventListener("touchcancel", (e) => this.handlePointerUp(e, "touch"));
  }

  getPointerPosition(e, type) {
    const rect = this.gridWrapper.getBoundingClientRect();
    let clientX, clientY;

    if (type === "touch") {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return null;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left + this.gridWrapper.scrollLeft,
      y: clientY - rect.top + this.gridWrapper.scrollTop,
    };
  }

  positionToGrid(pos) {
    const effectiveColWidth = this.colWidth * this.zoom;
    const col = Math.floor(pos.x / effectiveColWidth);
    const row = Math.floor(pos.y / this.rowHeight);
    const pitch = this.highestNote - row;

    return { col, row, pitch };
  }

  handlePointerDown(e, type) {
    // Two-finger pan detection for touch
    if (type === "touch" && e.touches && e.touches.length >= 2) {
      e.preventDefault();
      this.isPanning = true;
      this.dragState = null; // Cancel any note interaction

      // Calculate center point of two touches
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.panStartTouch = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      this.panStartScroll = {
        x: this.gridWrapper.scrollLeft,
        y: this.gridWrapper.scrollTop,
      };
      return;
    }

    const pos = this.getPointerPosition(e, type);
    if (!pos) return;

    const noteEl = e.target.closest(".note");
    const isResizeHandle = e.target.classList.contains("note-resize-handle");

    if (noteEl) {
      const noteId = noteEl.dataset.id;
      const note = this.notes.find((n) => n.id === noteId);

      if (!note) return;

      if (type === "touch") {
        e.preventDefault();

        // Start long press timer for delete
        this.longPressTimer = setTimeout(() => {
          this.deleteNote(noteId);
          this.dragState = null;
        }, this.longPressDelay);
      }

      if (isResizeHandle) {
        const isLeft = e.target.classList.contains("left");
        this.dragState = {
          type: "resize",
          noteId,
          side: isLeft ? "left" : "right",
          startPos: pos,
          originalNote: { ...note },
        };
      } else {
        this.dragState = {
          type: "move",
          noteId,
          startPos: pos,
          originalNote: { ...note },
        };
      }

      noteEl.classList.add("dragging");
    } else if (e.target === this.canvas || e.target === this.notesContainer) {
      // Click on empty grid - prepare to add note
      if (type === "touch") {
        e.preventDefault();
      }

      const grid = this.positionToGrid(pos);

      this.dragState = {
        type: "create",
        startPos: pos,
        startGrid: grid,
      };
    }
  }

  handlePointerMove(e, type) {
    // Handle two-finger panning
    if (type === "touch" && this.isPanning && e.touches && e.touches.length >= 2) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      const deltaX = this.panStartTouch.x - currentCenter.x;
      const deltaY = this.panStartTouch.y - currentCenter.y;

      this.gridWrapper.scrollLeft = this.panStartScroll.x + deltaX;
      this.gridWrapper.scrollTop = this.panStartScroll.y + deltaY;
      return;
    }

    // If panning was active but now only one finger, don't create notes
    if (type === "touch" && this.isPanning) {
      return;
    }

    if (!this.dragState) return;

    const pos = this.getPointerPosition(e, type);
    if (!pos) return;

    // Cancel long press if moved
    if (this.longPressTimer) {
      const dx = Math.abs(pos.x - this.dragState.startPos.x);
      const dy = Math.abs(pos.y - this.dragState.startPos.y);
      if (dx > 5 || dy > 5) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    if (type === "touch") {
      e.preventDefault();
    }

    const effectiveColWidth = this.colWidth * this.zoom;

    if (this.dragState.type === "move") {
      const note = this.notes.find((n) => n.id === this.dragState.noteId);
      if (!note) return;

      const dx = pos.x - this.dragState.startPos.x;
      const dy = pos.y - this.dragState.startPos.y;

      const colDelta = Math.round(dx / effectiveColWidth);
      const rowDelta = Math.round(dy / this.rowHeight);

      note.startTime = Math.max(0, this.dragState.originalNote.startTime + colDelta);
      note.pitch = Math.min(this.highestNote, Math.max(this.lowestNote, this.dragState.originalNote.pitch - rowDelta));

      this.renderNotes();
      this.markDirty();
    } else if (this.dragState.type === "resize") {
      const note = this.notes.find((n) => n.id === this.dragState.noteId);
      if (!note) return;

      const dx = pos.x - this.dragState.startPos.x;
      const colDelta = Math.round(dx / effectiveColWidth);

      if (this.dragState.side === "right") {
        note.duration = Math.max(1, this.dragState.originalNote.duration + colDelta);
      } else {
        const newStart = this.dragState.originalNote.startTime + colDelta;
        const newDuration = this.dragState.originalNote.duration - colDelta;
        if (newStart >= 0 && newDuration >= 1) {
          note.startTime = newStart;
          note.duration = newDuration;
        }
      }

      this.renderNotes();
      this.markDirty();
    } else if (this.dragState.type === "create") {
      // Visual feedback for note being created could go here
    }
  }

  handlePointerUp(e, type) {
    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Reset panning state
    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (!this.dragState) return;

    const pos = this.getPointerPosition(e, type);

    // Remove dragging class from any notes
    document.querySelectorAll(".note.dragging").forEach((el) => {
      el.classList.remove("dragging");
    });

    if (this.dragState.type === "create" && pos) {
      const grid = this.positionToGrid(pos);
      const startCol = Math.min(this.dragState.startGrid.col, grid.col);
      const endCol = Math.max(this.dragState.startGrid.col, grid.col);
      const draggedDuration = endCol - startCol + 1;

      // Use lastNoteDuration for single clicks, dragged duration for drags
      const duration = draggedDuration <= 1 ? this.lastNoteDuration : draggedDuration;

      this.addNote({
        pitch: this.dragState.startGrid.pitch,
        startTime: startCol,
        duration: duration,
      });
    }

    if (this.dragState.type === "move" || this.dragState.type === "resize") {
      // Update lastNoteDuration when a note is resized
      if (this.dragState.type === "resize") {
        const note = this.notes.find((n) => n.id === this.dragState.noteId);
        if (note) {
          this.lastNoteDuration = note.duration;
        }
      }
      this.onNotesChange(this.notes);
    }

    this.dragState = null;
  }

  addNote(noteData) {
    // Validate pitch range
    if (noteData.pitch < this.lowestNote || noteData.pitch > this.highestNote) {
      return;
    }

    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pitch: noteData.pitch,
      startTime: Math.max(0, noteData.startTime),
      duration: Math.max(1, noteData.duration),
    };

    this.notes.push(note);
    this.lastNoteDuration = note.duration; // Remember duration for next note
    this.markDirty();
    this.updateTotalColumns();
    this.resizeCanvas();
    this.renderGrid();
    this.renderNotes();
    this.onNotesChange(this.notes);

    // Preview the note
    this.onNotePreview(note.pitch);
  }

  deleteNote(noteId) {
    const index = this.notes.findIndex((n) => n.id === noteId);
    if (index !== -1) {
      const deletedNote = this.notes[index];
      this.lastNoteDuration = deletedNote.duration; // Remember deleted note's duration
      this.notes.splice(index, 1);
      this.markDirty();
      this.renderNotes();
      this.onNotesChange(this.notes);
    }
  }

  markDirty() {
    this.isDirty = true;
  }

  clearDirty() {
    this.isDirty = false;
  }

  setZoom(newZoom) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    this.resizeCanvas();
    this.renderGrid();
    this.renderTimeline();
    this.renderNotes();
  }

  zoomIn() {
    this.setZoom(this.zoom * 1.25);
  }

  zoomOut() {
    this.setZoom(this.zoom / 1.25);
  }

  clear() {
    this.notes = [];
    this.isDirty = false;
    this.totalColumns = 100;
    this.resizeCanvas();
    this.renderGrid();
    this.renderNotes();
  }
}
