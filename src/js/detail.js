import { fetchArtworks } from './artworks.js';

const detail = document.querySelector('.c-detail');
const slideshowButton = document.querySelector('.c-header__slideshow-button');
const previousButton = document.querySelector('.c-footer__link--previous');
const nextButton = document.querySelector('.c-footer__link--next');
const viewImageButton = document.querySelector('.c-detail__view');
const imageDialog = document.querySelector('.c-dialog');
const dialogImage = imageDialog.querySelector('.c-dialog__image');
const closeDialogButton = imageDialog.querySelector('.c-dialog__close');
let artworks = [];
let currentIndex = 0;
// 재생 상태(버튼 문구·URL의 play=1)와 실제 타이머를 따로 둔다.
// 이미지 dialog가 열린 동안에는 재생 상태를 유지한 채 타이머만 멈춘다.
let slideshowPlaying = false;
let slideshowTimer;
let restartAfterLastArtwork = false;

function artworkUrl(index, playing = false) {
  const url = new URL('./detail.html', location.href);
  url.searchParams.set('artwork', artworks[index].slug);
  if (playing) url.searchParams.set('play', '1');
  return url;
}

function renderArtwork(index, updateHistory = false) {
  currentIndex = index;
  const artwork = artworks[index];
  const source = detail.querySelector('.c-detail__picture source');
  const hero = detail.querySelector('.c-detail__hero');

  source.srcset = artwork.images.hero.large;
  hero.src = artwork.images.hero.small;
  hero.alt = `${artwork.name} by ${artwork.artist.name}`;
  dialogImage.src = artwork.images.gallery;
  dialogImage.alt = hero.alt;
  imageDialog.setAttribute('aria-label', `${artwork.name} image`);
  const title = detail.querySelector('.c-detail__name');
  title.replaceChildren(
    ...artwork.titleLines.flatMap((line, lineIndex) => {
      const span = document.createElement('span');
      span.className = 'c-detail__name-line';
      span.textContent = line;
      return lineIndex ? [document.createTextNode(' '), span] : [span];
    }),
  );
  detail.querySelector('.c-detail__artist-name').textContent =
    artwork.artist.name;
  detail.querySelector('.c-detail__artist-thumbnail').src =
    artwork.artist.image;
  detail.querySelector('.c-detail__year').textContent = artwork.year;
  detail.querySelector('.c-detail__text').textContent = artwork.description;
  detail.querySelector('.c-detail__link').href = artwork.source;
  document.querySelector('.c-footer__title').textContent = artwork.name;
  document.querySelector('.c-footer__artist').textContent = artwork.artist.name;
  document.querySelector('.c-footer__progress').value = index + 1;
  previousButton.disabled = index === 0;
  nextButton.disabled = index === artworks.length - 1;
  previousButton.setAttribute(
    'aria-label',
    `Previous artwork: ${artworks[index - 1]?.name ?? 'none'}`,
  );
  nextButton.setAttribute(
    'aria-label',
    `Next artwork: ${artworks[index + 1]?.name ?? 'none'}`,
  );
  document.title = `${artwork.name} | Galleria`;

  if (updateHistory)
    history.pushState(null, '', artworkUrl(index, slideshowPlaying));
}

function showNextSlide() {
  if (currentIndex === artworks.length - 1) {
    if (restartAfterLastArtwork) {
      restartAfterLastArtwork = false;
      renderArtwork(0, true);
      return;
    }
    stopSlideshow();
    return;
  }
  renderArtwork(currentIndex + 1, true);
}

// 다음 작품까지 5초를 처음부터 다시 센다.
function runSlideshowTimer() {
  clearInterval(slideshowTimer);
  slideshowTimer = setInterval(showNextSlide, 5000);
}

function pauseSlideshowTimer() {
  clearInterval(slideshowTimer);
  slideshowTimer = undefined;
}

function stopSlideshow(updateUrl = true) {
  slideshowPlaying = false;
  pauseSlideshowTimer();
  slideshowButton.textContent = 'START SLIDESHOW';
  if (updateUrl) history.replaceState(null, '', artworkUrl(currentIndex));
}

function startSlideshow() {
  slideshowPlaying = true;
  restartAfterLastArtwork = currentIndex === artworks.length - 1;
  slideshowButton.textContent = 'STOP SLIDESHOW';
  history.replaceState(null, '', artworkUrl(currentIndex, true));
  runSlideshowTimer();
}

// 작품을 보여 줄 수 없을 때 본문을 안내 문구로 바꾸고, 더는 쓸 수 없는 컨트롤을 정리한다.
// artworks를 비워 두면 남아 있는 이벤트 핸들러도 아무 동작을 하지 않는다.
function showUnavailable(message) {
  slideshowPlaying = false;
  pauseSlideshowTimer();
  artworks = [];
  detail.replaceChildren(document.createTextNode(message));
  slideshowButton.textContent = 'START SLIDESHOW';
  slideshowButton.disabled = true;
  previousButton.disabled = true;
  nextButton.disabled = true;
  // 푸터는 HTML 기본 작품 정보와 진행 막대만 담고 있어 오류 상태에서는 숨긴다.
  document.querySelector('.c-footer').hidden = true;
}

async function loadDetail() {
  try {
    artworks = await fetchArtworks();
    if (artworks.length === 0) throw new Error('No artworks are available');

    const slug =
      new URLSearchParams(location.search).get('artwork') ?? artworks[0].slug;
    const index = artworks.findIndex((artwork) => artwork.slug === slug);
    if (index < 0) {
      showUnavailable('Artwork not found. Return to the gallery.');
      return;
    }

    document.querySelector('.c-footer__progress').max = artworks.length;
    renderArtwork(index);
    if (new URLSearchParams(location.search).get('play') === '1')
      startSlideshow();
    else slideshowButton.textContent = 'START SLIDESHOW';
  } catch (error) {
    showUnavailable(
      'Unable to load artwork. Please refresh the page to try again.',
    );
    console.error('Unable to load artwork:', error);
  }
}

previousButton.addEventListener('click', () => {
  if (currentIndex > 0) renderArtwork(currentIndex - 1, true);
});
nextButton.addEventListener('click', () => {
  if (currentIndex < artworks.length - 1) renderArtwork(currentIndex + 1, true);
});
slideshowButton.addEventListener('click', () => {
  if (slideshowPlaying) stopSlideshow();
  else if (artworks.length) startSlideshow();
});
viewImageButton.addEventListener('click', () => {
  if (!artworks.length) return;
  // 보고 있는 작품이 dialog 안에서 바뀌지 않도록 열려 있는 동안 넘기지 않는다.
  pauseSlideshowTimer();
  imageDialog.showModal();
});
closeDialogButton.addEventListener('click', () => imageDialog.close());
// 닫기 버튼과 Esc 모두 close 이벤트를 보낸다. 재생 중이었다면 5초를 새로 세어 이어 간다.
imageDialog.addEventListener('close', () => {
  if (slideshowPlaying) runSlideshowTimer();
});
window.addEventListener('popstate', () => {
  if (slideshowPlaying) stopSlideshow(false);
  const slug = new URLSearchParams(location.search).get('artwork');
  const index = artworks.findIndex((artwork) => artwork.slug === slug);
  if (index >= 0) renderArtwork(index);
});

loadDetail();
