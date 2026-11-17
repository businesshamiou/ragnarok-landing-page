'use strict';

// The host integration is deliberately isolated: one activation, one event.
// No analytics SDK, cookies, identifiers, page-view or media events.
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const offer = event.target.closest('a[data-offer]');
  if (!offer || offer.getAttribute('href') !== '#go2offer#') return;
  document.dispatchEvent(new CustomEvent('go2offer'));
});

// Media controls are functional UI, never conversion/analytics events.
const heroVideo = document.querySelector('#hero-video');
const mediaToggle = document.querySelector('.media-toggle');
const poster = document.querySelector('.hero-poster');
const mediaStatus = document.querySelector('.media-status');

if (heroVideo instanceof HTMLVideoElement && mediaToggle instanceof HTMLButtonElement && poster && mediaStatus) {
  let sourcesAttached = false;
  let loadFailed = false;
  let failedSources = 0;
  let sourceCount = 0;
  mediaToggle.hidden = false;
  const showLabel = (key) => {
    mediaToggle.textContent = mediaToggle.dataset[key] || mediaToggle.dataset.play;
  };
  const showFailure = () => {
    loadFailed = true;
    heroVideo.pause();
    mediaToggle.disabled = false;
    heroVideo.hidden = true;
    poster.hidden = false;
    mediaStatus.textContent = mediaToggle.dataset.error || '';
    showLabel('play');
  };
  mediaToggle.addEventListener('click', async () => {
    if (!heroVideo.paused) {
      heroVideo.pause();
      return;
    }
    mediaToggle.disabled = true;
    mediaStatus.textContent = '';
    if (!sourcesAttached) {
      const candidates = [];
      if (window.matchMedia('(max-width: 600px)').matches) {
        candidates.push([heroVideo.dataset.mobileH264, 'video/mp4; codecs="avc1.64001f"']);
      } else {
        if (heroVideo.canPlayType('video/mp4; codecs="av01.0.08M.08"')) {
          candidates.push([heroVideo.dataset.desktopAv1, 'video/mp4; codecs="av01.0.08M.08"']);
        }
        candidates.push([heroVideo.dataset.desktopH264, 'video/mp4; codecs="avc1.640028"']);
      }
      sourceCount = candidates.length;
      for (const [path, type] of candidates) {
        if (!path) continue;
        const source = document.createElement('source');
        source.src = path;
        source.type = type;
        source.addEventListener('error', () => {
          failedSources += 1;
          if (failedSources >= sourceCount) showFailure();
        });
        heroVideo.append(source);
      }
      sourcesAttached = true;
      heroVideo.load();
    }
    if (loadFailed || heroVideo.error) {
      failedSources = 0;
      loadFailed = false;
      heroVideo.load();
    }
    if (heroVideo.ended) heroVideo.currentTime = 0;
    heroVideo.hidden = true;
    poster.hidden = false;
    try {
      await heroVideo.play();
    } catch (error) {
      // Pausing or leaving the viewport can cancel pending playback normally.
      if (error.name !== 'AbortError') showFailure();
    } finally {
      mediaToggle.disabled = false;
    }
  });
  heroVideo.addEventListener('play', () => showLabel('pause'));
  heroVideo.addEventListener('playing', () => {
    heroVideo.hidden = false;
    poster.hidden = true;
  });
  heroVideo.addEventListener('pause', () => showLabel(heroVideo.ended ? 'replay' : 'resume'));
  heroVideo.addEventListener('ended', () => showLabel('replay'));
  heroVideo.addEventListener('error', showFailure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) heroVideo.pause();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) heroVideo.pause();
    }).observe(heroVideo.closest('.hero-media'));
  }
}
