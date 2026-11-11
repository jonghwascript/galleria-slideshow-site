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
let slideshowTimer;

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
    history.pushState(null, '', artworkUrl(index, Boolean(slideshowTimer)));
}

function stopSlideshow(updateUrl = true) {
  clearInterval(slideshowTimer);
  slideshowTimer = undefined;
  slideshowButton.textContent = 'START SLIDESHOW';
  if (updateUrl) history.replaceState(null, '', artworkUrl(currentIndex));
}

function startSlideshow() {
  let restartAfterLastArtwork = currentIndex === artworks.length - 1;
  slideshowButton.textContent = 'STOP SLIDESHOW';
  history.replaceState(null, '', artworkUrl(currentIndex, true));
  slideshowTimer = setInterval(() => {
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
  }, 5000);
}

// 작품을 보여 줄 수 없을 때 본문을 안내 문구로 바꾸고, 더는 쓸 수 없는 컨트롤을 정리한다.
// artworks를 비워 두면 남아 있는 이벤트 핸들러도 아무 동작을 하지 않는다.
function showUnavailable(message) {
  clearInterval(slideshowTimer);
  slideshowTimer = undefined;
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
  if (slideshowTimer) stopSlideshow();
  else if (artworks.length) startSlideshow();
});
viewImageButton.addEventListener('click', () => {
  if (artworks.length) imageDialog.showModal();
});
closeDialogButton.addEventListener('click', () => imageDialog.close());
window.addEventListener('popstate', () => {
  if (slideshowTimer) stopSlideshow(false);
  const slug = new URLSearchParams(location.search).get('artwork');
  const index = artworks.findIndex((artwork) => artwork.slug === slug);
  if (index >= 0) renderArtwork(index);
});

loadDetail();
