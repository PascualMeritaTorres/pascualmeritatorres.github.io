/**
 * MIDI Export - Generate downloadable .mid files
 */

class MidiExport {
  constructor() {
    this.ticksPerBeat = 128;
  }

  /**
   * Export notes to MIDI file
   * @param {Array} notes - Array of note objects
   * @param {string} filename - Base filename (without extension)
   * @param {number} bpm - Tempo in BPM
   */
  export(notes, filename = "text2midiart", bpm = 120) {
    if (!notes || notes.length === 0) {
      console.warn("No notes to export");
      return;
    }

    // Check if MidiWriter is available
    if (typeof MidiWriter === "undefined") {
      console.error("MidiWriter library not loaded");
      alert("MIDI export not available. Please refresh the page.");
      return;
    }

    // Create a new MIDI track
    const track = new MidiWriter.Track();

    // Set tempo
    track.setTempo(bpm);

    // Set time signature (4/4)
    track.setTimeSignature(4, 4);

    // Sort notes by start time
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);

    // Group notes by start time for chords
    const noteGroups = new Map();
    sortedNotes.forEach((note) => {
      const key = note.startTime;
      if (!noteGroups.has(key)) {
        noteGroups.set(key, []);
      }
      noteGroups.get(key).push(note);
    });

    // Convert to MIDI events
    let currentTick = 0;

    // Get all unique start times, sorted
    const startTimes = [...noteGroups.keys()].sort((a, b) => a - b);

    startTimes.forEach((startTime) => {
      const group = noteGroups.get(startTime);

      // Calculate wait time (delta) from previous position
      // Each 16th note = ticksPerBeat / 4
      const ticksPerSixteenth = this.ticksPerBeat / 4;
      const targetTick = startTime * ticksPerSixteenth;
      const wait = targetTick - currentTick;

      // Create note event for the chord
      const pitches = group.map((n) => n.pitch);
      const duration = group[0].duration; // Use first note's duration

      // Duration in ticks
      const durationTicks = duration * ticksPerSixteenth;

      // Convert duration to MIDI-Writer-JS format
      // T + number = ticks
      const durationString = `T${durationTicks}`;

      const noteEvent = new MidiWriter.NoteEvent({
        pitch: pitches,
        duration: durationString,
        velocity: 100,
        wait: `T${wait}`,
      });

      track.addEvent(noteEvent);

      // Update current position
      currentTick = targetTick + durationTicks;
    });

    // Generate the MIDI file
    const write = new MidiWriter.Writer(track);

    // Create download
    this.download(write.dataUri(), `${filename}.mid`);
  }

  /**
   * Trigger file download
   * @param {string} dataUri - Data URI of the file
   * @param {string} filename - Filename with extension
   */
  download(dataUri, filename) {
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generate filename from text
   * @param {string} text - Input text
   * @returns {string} Safe filename
   */
  generateFilename(text) {
    if (!text || text.trim().length === 0) {
      return "text2midiart";
    }

    // Clean up text for filename
    const clean = text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    return `text2midiart-${clean}`;
  }
}
