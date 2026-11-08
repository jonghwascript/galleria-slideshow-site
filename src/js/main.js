const gallery = document.querySelector('.c-gallery');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

if (gallery) {
  loadArtworks();
}

async function loadArtworks() {
  const status = gallery.querySelector('[role="status"]');
  const template = document.querySelector('#artwork-card-template');
  const heading = gallery.querySelector('h1');
  gallery.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading artworks…';

  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error(`Artwork request failed: ${response.status}`);
    const artworks = await response.json();
    if (!Array.isArray(artworks)) throw new Error('Expected an artwork list');

    const fragment = document.createDocumentFragment();
    artworks.forEach(artwork => {
      if (
        typeof artwork?.name !== 'string' ||
        typeof artwork?.artist?.name !== 'string' ||
        typeof artwork?.images?.thumbnail !== 'string' ||
        !Number.isFinite(artwork?.images?.thumbnailHeight) ||
        artwork.images.thumbnailHeight <= 0
      ) {
        throw new Error('Invalid artwork data');
      }
      const card = template.content.cloneNode(true);
      card.querySelector('.c-artwork-card').style.setProperty('--thumbnail-height', `${artwork.images.thumbnailHeight}px`);
      card.querySelector('.c-artwork-card__thumbnail').src = artwork.images.thumbnail;
      card.querySelector('.c-artwork-card__title').textContent = artwork.name;
      card.querySelector('.c-artwork-card__artist').textContent = artwork.artist.name;
      fragment.append(card);
    });

    if (artworks.length === 0) {
      status.textContent = 'No artworks are available.';
      return;
    }

    gallery.classList.add('is-loading');
    gallery.replaceChildren(heading, status, fragment);
    await Promise.all([
      ...[...gallery.querySelectorAll('img')].map(image => image.decode().catch(() => {})),
      document.fonts.ready,
    ]);
    status.remove();
    const revealCards = initializeMasonry();
    gallery.classList.remove('is-loading');
    revealCards();
  } catch (error) {
    gallery.classList.remove('is-masonry', 'is-loading');
    status.textContent = 'Unable to load artworks. Please refresh the page to try again.';
    gallery.replaceChildren(heading, status);
    console.error('Unable to load gallery:', error);
  } finally {
    gallery.setAttribute('aria-busy', 'false');
  }
}

function initializeMasonry() {
  const cards = [...gallery.querySelectorAll('.c-artwork-card')];
  const animations = new Map();
  let previousRects = [];
  let frame;
  let resizeTimer;
  let resizing = false;
  let columns = [];
  let balancePending = false;
  let previousColumnCount = 0;
  let previousMeasurements = '';

  function getRect(card) {
    const rect = card.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  }

  function animateCard(card, keyframes, duration) {
    const animation = card.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    animations.set(card, animation);
    animation.onfinish = () => {
      if (animations.get(card) === animation) animations.delete(card);
    };
  }

  function layoutMasonry(rebalance = false) {
    const firstRects = cards.map((card, index) => animations.has(card) ? getRect(card) : previousRects[index]);
    const styles = getComputedStyle(gallery);
    const columnCount = parseInt(styles.getPropertyValue('--columns'), 10);
    const columnsChanged = columnCount !== previousColumnCount;

    // 이전 열 위치를 지워 분기점 변경 시 암시적 열이 생기지 않도록 한다.
    if (columnsChanged) {
      cards.forEach(card => {
        card.style.gridColumn = '';
        card.style.gridRow = '';
      });
    }

    const rowHeight = parseFloat(styles.gridAutoRows);
    const gap = parseFloat(styles.columnGap);
    const items = cards.map((card, index) => ({
      card,
      index,
      span: Math.ceil((parseFloat(getComputedStyle(card).height) + gap) / rowHeight),
    }));
    const measurements = `${columnCount}/${rowHeight}/${gap}/${items.map(item => item.span).join(',')}`;
    if (measurements === previousMeasurements && !(rebalance && balancePending)) {
      if (animations.size === 0) previousRects = cards.map(getRect);
      return;
    }
    previousMeasurements = measurements;
    previousColumnCount = columnCount;

    if (columnsChanged || rebalance || !resizing) {
      columns = balanceColumns(items, columnCount);
      balancePending = false;
    } else {
      // 같은 열 수로 리사이즈하는 동안에는 열 배정을 유지한다.
      columns.forEach(column => {
        column.items = column.items.map(item => items[item.index]);
      });
      balancePending = true;
    }

    animations.forEach(animation => animation.cancel());
    animations.clear();

    columns.forEach((column, index) => {
      let row = 1;
      column.items.forEach(item => {
        item.card.style.gridColumn = `${index + 1}`;
        item.card.style.gridRow = `${row} / span ${item.span}`;
        row += item.span;
      });
    });

    previousRects = cards.map(getRect);
    if (!motionPreference.matches) {
      cards.forEach((card, index) => {
        const first = firstRects[index];
        if (!first) return;
        const dx = first.left - previousRects[index].left;
        const dy = first.top - previousRects[index].top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        animateCard(card, [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ], 450);
      });
    }
  }

  function balanceColumns(items, columnCount) {
    const columns = Array.from({ length: columnCount }, () => ({ items: [], height: 0 }));

    // 높은 카드부터 가장 짧은 열에 배분한다. 1열에서는 원래 순서를 유지한다.
    const orderedItems = columnCount === 1 ? items : [...items].sort((a, b) => b.span - a.span);
    orderedItems.forEach(item => {
      const shortest = columns.reduce((a, b) => a.height <= b.height ? a : b);
      shortest.items.push(item);
      shortest.height += item.span;
    });

    // 두 열의 카드를 교환해 높이 차이가 더 작아지는 동안 균형을 개선한다.
    let improved = true;
    while (improved) {
      improved = false;
      for (let a = 0; a < columns.length; a++) {
        for (let b = a + 1; b < columns.length; b++) {
          const left = columns[a];
          const right = columns[b];
          for (let i = 0; i < left.items.length; i++) {
            for (let j = 0; j < right.items.length; j++) {
              const difference = left.items[i].span - right.items[j].span;
              if (Math.abs(left.height - right.height - 2 * difference) >= Math.abs(left.height - right.height)) continue;
              [left.items[i], right.items[j]] = [right.items[j], left.items[i]];
              left.height -= difference;
              right.height += difference;
              improved = true;
            }
          }
        }
      }
    }

    columns.forEach(column => column.items.sort((a, b) => a.index - b.index));
    return columns;
  }

  function scheduleLayout() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => layoutMasonry());
  }

  gallery.classList.add('is-masonry');

  // 첫 배치는 숨겨진 상태에서 동기적으로 완료한다.
  layoutMasonry();

  // 카드 크기가 실제로 달라졌을 때만 다시 배치한다.
  const observer = new ResizeObserver(scheduleLayout);
  cards.forEach(card => observer.observe(card));
  gallery.querySelectorAll('img').forEach(image => {
    image.addEventListener('load', scheduleLayout);
    image.addEventListener('error', scheduleLayout);
  });
  window.addEventListener('resize', () => {
    resizing = true;
    clearTimeout(resizeTimer);
    scheduleLayout();
    resizeTimer = setTimeout(() => {
      resizing = false;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => layoutMasonry(true));
    }, 150);
  });

  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    }
  });

  return () => {
    if (!motionPreference.matches) {
      cards.forEach(card => animateCard(card, [{ opacity: 0 }, { opacity: 1 }], 300));
    }
  };
}
