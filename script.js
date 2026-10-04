const navToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#primary-nav");

navToggle.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  nav.classList.toggle("is-open", !isOpen);
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    navToggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }
});

const waveform = document.querySelector("#waveform");
const trackSelect = document.querySelector("#track-select");
const playButton = document.querySelector("#play-button");
const playerTime = document.querySelector("#player-time");
const playerNote = document.querySelector("#player-note");
const trackTitle = document.querySelector("#track-title");
const trackStyle = document.querySelector("#track-style");
const barCount = 62;

for (let index = 0; index < barCount; index += 1) {
  const bar = document.createElement("span");
  const shape = Math.abs(Math.sin(index * 0.33) * Math.cos(index * 0.11));
  bar.style.setProperty("--bar-height", `${18 + shape * 78}%`);
  bar.style.setProperty("--bar-speed", `${0.22 + (index % 9) * 0.035}s`);
  bar.style.setProperty("--bar-delay", `${(index % 12) * -0.06}s`);
  waveform.append(bar);
}

const tracks = {
  dubstep: { title: "Concrete Kisses", style: "DUBSTEP / 140 BPM", tempo: 140 },
  techno: { title: "No Soft Edges", style: "TECHNO / 150 BPM", tempo: 150 },
};

let audioContext;
let masterGain;
let scheduler;
let nextBeatTime = 0;
let beatNumber = 0;
let elapsedSeconds = 0;
let clock;

function playKick(time, frequency = 95) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.13);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.65, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start(time);
  oscillator.stop(time + 0.21);
}

function playHat(time, accent = 0.035) {
  const bufferSize = Math.floor(audioContext.sampleRate * 0.035);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = 7200;
  gain.gain.value = accent;
  source.connect(filter).connect(gain).connect(masterGain);
  source.start(time);
}

function playBass(time, step) {
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const notes = [55, 55, 65.41, 49, 55, 73.42, 65.41, 49];
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(notes[step % notes.length], time);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(trackSelect.value === "dubstep" ? 180 : 360, time);
  filter.frequency.exponentialRampToValueAtTime(trackSelect.value === "dubstep" ? 95 : 210, time + 0.18);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.19, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
  oscillator.connect(filter).connect(gain).connect(masterGain);
  oscillator.start(time);
  oscillator.stop(time + 0.23);
}

function scheduleBeat() {
  const track = tracks[trackSelect.value];
  const stepLength = 60 / track.tempo / 2;
  while (nextBeatTime < audioContext.currentTime + 0.12) {
    if (beatNumber % 4 === 0) playKick(nextBeatTime, trackSelect.value === "dubstep" ? 100 : 125);
    if (beatNumber % 2 === 1 || trackSelect.value === "techno") playHat(nextBeatTime, beatNumber % 4 === 3 ? 0.05 : 0.025);
    if (beatNumber % 2 === 0) playBass(nextBeatTime, beatNumber / 2);
    nextBeatTime += stepLength;
    beatNumber += 1;
  }
}

function updatePlayerTime() {
  elapsedSeconds += 1;
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  playerTime.textContent = `${minutes}:${seconds}`;
}

async function startPlayer() {
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      playerNote.textContent = "Your browser does not support the audio player. Try a recent version of Chrome, Firefox, or Safari.";
      return;
    }
    audioContext = new AudioContextConstructor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.34;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") await audioContext.resume();
  beatNumber = 0;
  nextBeatTime = audioContext.currentTime + 0.04;
  scheduler = window.setInterval(scheduleBeat, 25);
  clock = window.setInterval(updatePlayerTime, 1000);
  waveform.classList.add("is-playing");
  playButton.setAttribute("aria-pressed", "true");
  playButton.setAttribute("aria-label", `Pause ${tracks[trackSelect.value].title}`);
  playButton.querySelector(".play-symbol").textContent = "Ⅱ";
  playButton.querySelector(".play-label").textContent = "PAUSE THE BEAT";
  playerNote.textContent = "Live from your browser. Press pause to stop the transmission.";
}

function stopPlayer() {
  window.clearInterval(scheduler);
  window.clearInterval(clock);
  waveform.classList.remove("is-playing");
  playButton.setAttribute("aria-pressed", "false");
  playButton.setAttribute("aria-label", `Play ${tracks[trackSelect.value].title}`);
  playButton.querySelector(".play-symbol").textContent = "▶";
  playButton.querySelector(".play-label").textContent = "PLAY THE BEAT";
  playerNote.textContent = "A little original rhythm, made in your browser. Turn it up.";
}

playButton.addEventListener("click", async () => {
  if (playButton.getAttribute("aria-pressed") === "true") {
    stopPlayer();
    return;
  }
  playButton.disabled = true;
  try {
    await startPlayer();
  } catch (error) {
    playerNote.textContent = "Audio could not start. Check your browser's sound settings and try again.";
    console.error("Unable to start the beat player:", error);
  } finally {
    playButton.disabled = false;
  }
});

trackSelect.addEventListener("change", () => {
  const track = tracks[trackSelect.value];
  trackTitle.textContent = track.title;
  trackStyle.textContent = track.style;
  if (playButton.getAttribute("aria-pressed") === "true") {
    stopPlayer();
    startPlayer().catch((error) => {
      playerNote.textContent = "Audio could not start. Check your browser's sound settings and try again.";
      console.error("Unable to switch the beat:", error);
    });
  }
  playButton.setAttribute("aria-label", `Play ${track.title}`);
});

document.querySelector("#booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const details = new FormData(form);
  const subject = `Booking enquiry from ${details.get("name")}`;
  const body = [
    `Name: ${details.get("name")}`,
    `Email: ${details.get("email")}`,
    "",
    details.get("message"),
  ].join("\n");
  const mailto = `mailto:booking@pinknoise.dj?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.querySelector("#form-status").textContent = "Your email app is opening with your booking details.";
  window.location.href = mailto;
});

document.querySelector("#year").textContent = String(new Date().getFullYear());
