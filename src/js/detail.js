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

function artworkSlug(artwork) {
  return artwork.slug;
}

function artworkUrl(index, playing = false) {
  const url = new URL('./detail.html', location.href);
  url.searchParams.set('artwork', artworkSlug(artworks[index]));
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
  if (currentIndex === artworks.length - 1) renderArtwork(0, true);
  slideshowButton.textContent = 'STOP SLIDESHOW';
  history.replaceState(null, '', artworkUrl(currentIndex, true));
  slideshowTimer = setInterval(() => {
    if (currentIndex === artworks.length - 1) {
      stopSlideshow();
      return;
    }
    renderArtwork(currentIndex + 1, true);
  }, 5000);
}

async function loadDetail() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok)
      throw new Error(`Artwork request failed: ${response.status}`);
    artworks = await response.json();
    if (
      !Array.isArray(artworks) ||
      artworks.length === 0 ||
      artworks.some(
        (artwork) =>
          typeof artworkSlug(artwork) !== 'string' ||
          !/^[a-z0-9-]+$/.test(artworkSlug(artwork)) ||
          !Array.isArray(artwork.titleLines) ||
          artwork.titleLines.length === 0 ||
          artwork.titleLines.some(
            (line) => typeof line !== 'string' || !line.trim(),
          ) ||
          artwork.titleLines.join(' ').toLocaleLowerCase('en') !==
            artwork.name.toLocaleLowerCase('en'),
      ) ||
      new Set(artworks.map(artworkSlug)).size !== artworks.length
    ) {
      throw new Error('Invalid artwork data');
    }

    const slug =
      new URLSearchParams(location.search).get('artwork') ??
      artworkSlug(artworks[0]);
    const index = artworks.findIndex(
      (artwork) => artworkSlug(artwork) === slug,
    );
    if (index < 0) {
      detail.replaceChildren(
        document.createTextNode('Artwork not found. Return to the gallery.'),
      );
      return;
    }

    document.querySelector('.c-footer__progress').max = artworks.length;
    renderArtwork(index);
    if (new URLSearchParams(location.search).get('play') === '1')
      startSlideshow();
    else slideshowButton.textContent = 'START SLIDESHOW';
  } catch (error) {
    detail.replaceChildren(
      document.createTextNode(
        'Unable to load artwork. Please refresh the page to try again.',
      ),
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
  const index = artworks.findIndex((artwork) => artworkSlug(artwork) === slug);
  if (index >= 0) renderArtwork(index);
});

loadDetail();
