/**
 * Playback - Tone.js audio engine
 */

class Playback {
  constructor(options = {}) {
    this.bpm = options.bpm || 120;
    this.notes = [];
    this.isPlaying = false;
    this.synth = null;
    this.scheduledEvents = [];

    // Callbacks
    this.onPlayStateChange = options.onPlayStateChange || (() => {});
    this.onPlayheadUpdate = options.onPlayheadUpdate || (() => {});
    this.onLoopRestart = options.onLoopRestart || (() => {});

    // Playhead animation
    this.animationFrame = null;
    this.loopEnd = 0;

    this.init();
  }

  async init() {
    // Create synth with piano-like sound
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8,
      },
    }).toDestination();

    // Set volume
    this.synth.volume.value = -6;

    // Set BPM
    Tone.Transport.bpm.value = this.bpm;

    // Handle loop
    Tone.Transport.loop = true;
  }

  setNotes(notes) {
    this.notes = notes;
    this.updateLoopEnd();
  }

  updateLoopEnd() {
    if (this.notes.length === 0) {
      this.loopEnd = 64; // Default 4 bars (64 sixteenth notes)
    } else {
      const maxEnd = Math.max(...this.notes.map((n) => n.startTime + n.duration));
      // Add a little padding and round up to nearest beat
      this.loopEnd = Math.ceil((maxEnd + 2) / 4) * 4;
    }

    // Convert 16th notes to beats for Transport
    const loopEndBeats = this.loopEnd / 4;
    Tone.Transport.loopEnd = `0:${loopEndBeats}:0`;
  }

  midiToNoteName(midi) {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    const noteName = noteNames[midi % 12];
    return `${noteName}${octave}`;
  }

  scheduleNotes() {
    // Clear any existing scheduled events
    this.clearScheduledEvents();

    // Schedule each note
    this.notes.forEach((note) => {
      // Convert 16th note position to time
      const startTime = Tone.Time(`0:0:${note.startTime}`).toSeconds();
      const duration = Tone.Time(`0:0:${note.duration}`).toSeconds();
      const noteName = this.midiToNoteName(note.pitch);

      const eventId = Tone.Transport.schedule((time) => {
        this.synth.triggerAttackRelease(noteName, duration, time);
      }, startTime);

      this.scheduledEvents.push(eventId);
    });
  }

  clearScheduledEvents() {
    this.scheduledEvents.forEach((id) => {
      Tone.Transport.clear(id);
    });
    this.scheduledEvents = [];
  }

  async play() {
    // Ensure audio context is started (required for user gesture)
    await Tone.start();

    if (this.isPlaying) {
      this.pause();
      return;
    }

    this.scheduleNotes();
    this.updateLoopEnd();

    Tone.Transport.start();
    this.isPlaying = true;
    this.onPlayStateChange(true);

    this.startPlayheadAnimation();
  }

  pause() {
    Tone.Transport.pause();
    this.isPlaying = false;
    this.onPlayStateChange(false);
    this.stopPlayheadAnimation();
  }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.clearScheduledEvents();
    this.isPlaying = false;
    this.onPlayStateChange(false);
    this.stopPlayheadAnimation();
    this.onPlayheadUpdate(0);
  }

  startPlayheadAnimation() {
    const animate = () => {
      if (!this.isPlaying) return;

      // Get current position in 16th notes
      const position = Tone.Transport.position;
      const parts = position.split(":");
      const bars = parseInt(parts[0]) || 0;
      const beats = parseInt(parts[1]) || 0;
      const sixteenths = parseFloat(parts[2]) || 0;

      const totalSixteenths = bars * 16 + beats * 4 + sixteenths;
      this.onPlayheadUpdate(totalSixteenths);

      this.animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  stopPlayheadAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Preview a single note
  async previewNote(midi) {
    await Tone.start();
    const noteName = this.midiToNoteName(midi);
    this.synth.triggerAttackRelease(noteName, "8n");
  }

  // Set tempo
  setTempo(bpm) {
    this.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  // Set loop state
  setLoop(enabled) {
    Tone.Transport.loop = enabled;
  }

  dispose() {
    this.stop();
    if (this.synth) {
      this.synth.dispose();
    }
  }
}
