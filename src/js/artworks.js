// 갤러리와 상세 페이지가 함께 쓰는 작품 데이터 로더.
// 두 페이지가 같은 규칙으로 데이터를 검사해야, 갤러리에서는 보이는데 상세 페이지에서는
// 실패하는 데이터가 생기지 않는다. 필드를 새로 쓰기 시작하면 isArtwork에도 추가한다.

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isArtwork(artwork) {
  return (
    isNonEmptyString(artwork?.name) &&
    Array.isArray(artwork.titleLines) &&
    artwork.titleLines.length > 0 &&
    artwork.titleLines.every(isNonEmptyString) &&
    // 상세 페이지 제목은 titleLines를 공백으로 이어 붙여 표시하므로 이름과 같아야 한다.
    artwork.titleLines.join(' ').toLocaleLowerCase('en') ===
      artwork.name.toLocaleLowerCase('en') &&
    typeof artwork.slug === 'string' &&
    SLUG_PATTERN.test(artwork.slug) &&
    Number.isInteger(artwork.year) &&
    isNonEmptyString(artwork.description) &&
    isNonEmptyString(artwork.source) &&
    isNonEmptyString(artwork.artist?.name) &&
    isNonEmptyString(artwork.artist.image) &&
    isNonEmptyString(artwork.images?.thumbnail) &&
    Number.isFinite(artwork.images.thumbnailHeight) &&
    artwork.images.thumbnailHeight > 0 &&
    isNonEmptyString(artwork.images.hero?.small) &&
    isNonEmptyString(artwork.images.hero.large) &&
    isNonEmptyString(artwork.images.gallery)
  );
}

// 빈 목록은 올바른 데이터로 보고, 표시할 작품이 없을 때의 처리는 각 페이지가 정한다.
export function isArtworkList(artworks) {
  return (
    Array.isArray(artworks) &&
    artworks.every(isArtwork) &&
    new Set(artworks.map((artwork) => artwork.slug)).size === artworks.length
  );
}

export async function fetchArtworks() {
  const response = await fetch('./data.json');
  if (!response.ok)
    throw new Error(`Artwork request failed: ${response.status}`);
  const artworks = await response.json();
  if (!isArtworkList(artworks)) throw new Error('Invalid artwork data');
  return artworks;
}
