const body = document.body;
const header = document.querySelector('[data-header]');
const progress = document.querySelector('.progress span');
const modeButton = document.querySelector('[data-mode]');
const soundButton = document.querySelector('[data-sound]');
const footprintLayer = document.querySelector('[data-footprints]');
const clock = document.querySelector('[data-clock]');
const trailPath = document.querySelector('[data-trail-path]');
const trailBoard = document.querySelector('[data-trail-board]');
const quickContact = document.querySelector('[data-quick-contact]');
const gallery = document.querySelector('[data-gallery]');
const lightbox = document.querySelector('[data-lightbox]');
const lightboxImg = lightbox?.querySelector('img');
const lightboxCaption = lightbox?.querySelector('p');
const closeLightbox = document.querySelector('[data-close-lightbox]');
const mapNote = document.querySelector('[data-map-note]');
const pins = document.querySelectorAll('.pin');
const filters = document.querySelectorAll('[data-filter]');
const videoFrames = document.querySelectorAll('.video-frame');
const loadGalleryButton = document.querySelector('[data-load-gallery]');
const musicAudio = document.querySelector('[data-music-audio]');
const musicTracks = Array.from(document.querySelectorAll('[data-track-index]'));
const musicToggle = document.querySelector('[data-music-toggle]');
const musicPrev = document.querySelector('[data-music-prev]');
const musicNext = document.querySelector('[data-music-next]');
const musicTitle = document.querySelector('[data-music-title]');
const musicStatus = document.querySelector('[data-music-status]');
const musicDetail = document.querySelector('[data-music-detail]');
const musicPlayer = document.querySelector('[data-music-player]');

let audioContext;
let soundOn = false;
let lastFootprintScroll = 0;
let stepIndex = 0;
let scrollTicking = false;
let trailLength = 0;
let currentGalleryFilter = 'all';
let renderedGalleryCount = 0;
let activeTrackIndex = 0;
const galleryBatchSize = 18;
const maxFootprints = 10;

const stateKeys = {
  chaos: 'chaloSCF:chaos',
  sfx: 'chaloSCF:sfx'
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStored(key) {
  try {
    return localStorage.getItem(key) === 'true';
  } catch (error) {
    return false;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    // Private browsing or local file restrictions can block storage.
  }
}

function setControlText(control, text) {
  const label = control?.querySelector('span');
  if (label) {
    label.textContent = text;
  } else if (control) {
    control.textContent = text;
  }
}

function beep(type = 'tap') {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const tones = {
    tap: [360, 0.035, 0.04],
    shutter: [720, 0.04, 0.075],
    chaos: [150, 0.05, 0.09]
  };
  const [frequency, startGain, duration] = tones[type] || tones.tap;
  osc.type = type === 'chaos' ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(frequency * 1.7, now + duration);
  gain.gain.setValueAtTime(startGain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function setChaos(active, withBurst = false) {
  body.classList.toggle('chaos', active);
  modeButton.setAttribute('aria-pressed', String(active));
  setControlText(modeButton, active ? 'KAIDA' : 'CHAOS');
  setStored(stateKeys.chaos, active);
  if (withBurst) {
    body.classList.remove('chaos-burst');
    window.requestAnimationFrame(() => {
      body.classList.add('chaos-burst');
      window.setTimeout(() => body.classList.remove('chaos-burst'), 420);
    });
  }
}

function setSfx(active) {
  soundOn = active;
  body.classList.toggle('sound-on', active);
  soundButton.setAttribute('aria-pressed', String(active));
  setControlText(soundButton, active ? 'SFX ON' : 'SFX');
  setStored(stateKeys.sfx, active);
}

function applyStoredState() {
  setChaos(getStored(stateKeys.chaos));
  setSfx(getStored(stateKeys.sfx));
}

function dropFootprint() {
  if (!footprintLayer) return;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  if (Math.abs(scrollTop - lastFootprintScroll) < 240) return;
  lastFootprintScroll = scrollTop;
  const foot = document.createElement('span');
  foot.className = 'footprint';
  const side = stepIndex % 2 === 0 ? 0.37 : 0.63;
  const wobble = Math.sin(stepIndex * 1.7) * 70;
  foot.style.left = `${window.innerWidth * side + wobble}px`;
  foot.style.top = `${window.innerHeight * (0.62 + Math.sin(stepIndex) * 0.08)}px`;
  foot.style.setProperty('--step-rotation', `${stepIndex % 2 === 0 ? -15 : 15}deg`);
  footprintLayer.appendChild(foot);
  while (footprintLayer.children.length > maxFootprints) {
    footprintLayer.firstElementChild?.remove();
  }
  stepIndex += 1;
  window.setTimeout(() => foot.remove(), 2300);
}

function updateScrollState() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const scrolled = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
  progress.style.width = `${scrolled}%`;
  header.classList.toggle('is-scrolled', scrollTop > 20);

  if (trailPath && trailBoard) {
    const rect = trailBoard.getBoundingClientRect();
    const boardProgress = clamp((window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.15), 0, 1);
    trailPath.style.strokeDashoffset = trailLength * (1 - boardProgress);
  }

  dropFootprint();
}

function requestScrollUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    updateScrollState();
    scrollTicking = false;
  });
}

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
}

if (trailPath) {
  trailLength = trailPath.getTotalLength();
  trailPath.style.strokeDasharray = trailLength;
  trailPath.style.strokeDashoffset = trailLength;
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
updateScrollState();
updateClock();
setInterval(updateClock, 1000);

modeButton.addEventListener('click', () => {
  const active = !body.classList.contains('chaos');
  setChaos(active, true);
  beep(active ? 'chaos' : 'tap');
});

soundButton.addEventListener('click', async () => {
  setSfx(!soundOn);
  if (soundOn) {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') await audioContext.resume();
    beep('shutter');
  }
});

function getFilteredGalleryItems() {
  if (!Array.isArray(window.CHALO_GALLERY)) return [];
  return window.CHALO_GALLERY.filter((item) => currentGalleryFilter === 'all' || item.category.includes(currentGalleryFilter));
}

function renderGallery(reset = false) {
  if (!gallery || !Array.isArray(window.CHALO_GALLERY)) return;
  if (reset) {
    renderedGalleryCount = 0;
    gallery.innerHTML = '';
  }
  const items = getFilteredGalleryItems();
  const nextItems = items.slice(renderedGalleryCount, renderedGalleryCount + galleryBatchSize);
  const html = nextItems.map((item, index) => {
    const shape = item.shape ? ` ${item.shape}` : '';
    const delay = Math.min(index * 12, 220);
    return `
      <button class="gallery-item${shape}" style="animation-delay:${delay}ms" data-category="${item.category}" data-full="${item.src}" data-title="${item.title}" type="button">
        <img src="${item.src}" alt="${item.title}" loading="lazy">
        <span>${item.meta}</span>
      </button>
    `;
  }).join('');
  gallery.insertAdjacentHTML('beforeend', html);
  renderedGalleryCount += nextItems.length;
  if (loadGalleryButton) {
    loadGalleryButton.hidden = renderedGalleryCount >= items.length;
  }
}

renderGallery(true);

document.addEventListener('click', (event) => {
  const target = event.target.closest('a, button');
  if (target) beep('tap');
});

videoFrames.forEach((frame) => {
  const video = frame.querySelector('video');
  frame.addEventListener('mouseenter', () => video.play());
  frame.addEventListener('focus', () => video.play());
  frame.addEventListener('mouseleave', () => video.pause());
  frame.addEventListener('blur', () => video.pause());
});

filters.forEach((button) => {
  button.addEventListener('click', () => {
    currentGalleryFilter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle('is-active', item === button));
    renderGallery(true);
  });
});

loadGalleryButton?.addEventListener('click', () => {
  renderGallery(false);
});

function getTrackData(index) {
  const track = musicTracks[index];
  if (!track) return null;
  return {
    element: track,
    src: track.dataset.src,
    title: track.dataset.title,
    mood: track.dataset.mood,
    duration: track.dataset.duration
  };
}

function setActiveTrack(index) {
  if (!musicTracks.length) return;
  activeTrackIndex = (index + musicTracks.length) % musicTracks.length;
  const data = getTrackData(activeTrackIndex);
  musicTracks.forEach((track, trackIndex) => {
    track.classList.toggle('is-active', trackIndex === activeTrackIndex);
  });
  if (musicTitle) musicTitle.textContent = data.title;
  if (musicStatus) musicStatus.textContent = `Selected / ${data.duration}`;
  if (musicDetail) musicDetail.textContent = data.mood;
  if (musicPlayer) musicPlayer.dataset.currentTrack = String(activeTrackIndex + 1).padStart(2, '0');
}

async function playActiveTrack() {
  if (!musicAudio) return;
  const data = getTrackData(activeTrackIndex);
  if (!data) return;
  const currentSrc = musicAudio.getAttribute('src') || '';
  if (!currentSrc.endsWith(data.src)) {
    musicAudio.src = data.src;
  }
  musicAudio.volume = 0.82;
  try {
    await musicAudio.play();
    body.classList.add('track-playing');
    setControlText(musicToggle, 'Pause');
    if (musicStatus) musicStatus.textContent = `Playing / ${data.duration}`;
  } catch (error) {
    body.classList.remove('track-playing');
    setControlText(musicToggle, 'Play');
    if (musicStatus) musicStatus.textContent = 'Tap play to start audio';
  }
}

function pauseMusic() {
  if (!musicAudio) return;
  musicAudio.pause();
  body.classList.remove('track-playing');
  setControlText(musicToggle, 'Play');
  const data = getTrackData(activeTrackIndex);
  if (musicStatus && data) musicStatus.textContent = `Paused / ${data.duration}`;
}

musicTracks.forEach((track, index) => {
  track.addEventListener('click', () => {
    setActiveTrack(index);
    playActiveTrack();
  });
});

musicToggle?.addEventListener('click', () => {
  if (!musicAudio || musicAudio.paused) {
    playActiveTrack();
  } else {
    pauseMusic();
  }
});

musicPrev?.addEventListener('click', () => {
  const wasPlaying = musicAudio && !musicAudio.paused;
  setActiveTrack(activeTrackIndex - 1);
  if (wasPlaying) playActiveTrack();
});

musicNext?.addEventListener('click', () => {
  const wasPlaying = musicAudio && !musicAudio.paused;
  setActiveTrack(activeTrackIndex + 1);
  if (wasPlaying) playActiveTrack();
});

musicAudio?.addEventListener('ended', () => {
  setActiveTrack(activeTrackIndex + 1);
  playActiveTrack();
});

musicAudio?.addEventListener('pause', () => {
  if (!musicAudio.ended) {
    body.classList.remove('track-playing');
    setControlText(musicToggle, 'Play');
  }
});

setActiveTrack(0);

gallery?.addEventListener('click', (event) => {
  const item = event.target.closest('.gallery-item');
  if (!item) return;
  lightboxImg.src = item.dataset.full;
  lightboxImg.alt = item.querySelector('img')?.alt || item.dataset.title;
  lightboxCaption.textContent = item.dataset.title;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  beep('shutter');
});

function hideLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

closeLightbox?.addEventListener('click', hideLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) hideLightbox();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !lightbox.hidden) hideLightbox();
});

pins.forEach((pin) => {
  const activate = () => {
    pins.forEach((item) => item.classList.toggle('is-active', item === pin));
    mapNote.textContent = pin.dataset.note;
    beep('tap');
  };
  pin.addEventListener('mouseenter', activate);
  pin.addEventListener('focus', activate);
  pin.addEventListener('click', activate);
});

quickContact.addEventListener('click', () => {
  window.open('https://wa.me/917757076639?text=Hey%20chaloSCF%2C%20I%20found%20your%20website.', '_blank', 'noopener,noreferrer');
});

const revealItems = document.querySelectorAll('.music-player, .music-track, .trail-stop, .about-media, .about-copy, .video-frame, .gallery-item, .motion-copy, .reel-stack, .pin, .service-list a, .notes-grid article');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => {
  item.style.opacity = '0';
  item.style.transform = 'translateY(24px)';
  item.style.transition = 'opacity .7s ease, transform .7s ease';
  observer.observe(item);
});

const style = document.createElement('style');
style.textContent = `.is-visible{opacity:1!important;transform:translateY(0)!important}`;
document.head.appendChild(style);

applyStoredState();
