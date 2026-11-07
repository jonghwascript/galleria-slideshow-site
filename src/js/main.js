const gallery = document.querySelector('.c-gallery');

if (gallery) {
  const cards = [...gallery.querySelectorAll('.c-artwork-card')];
  let frame;

  function layoutMasonry() {
    // 이전 열 위치를 지워 분기점 변경 시 암시적 열이 생기지 않도록 한다.
    cards.forEach(card => {
      card.style.gridColumn = '';
      card.style.gridRow = '';
    });

    const styles = getComputedStyle(gallery);
    const rowHeight = parseFloat(styles.gridAutoRows);
    const gap = parseFloat(styles.columnGap);
    const columnCount = parseInt(styles.getPropertyValue('--columns'), 10);
    const items = cards.map((card, index) => ({
      card,
      index,
      span: Math.ceil((card.getBoundingClientRect().height + gap) / rowHeight),
    }));
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

    columns.forEach((column, index) => {
      let row = 1;
      column.items.sort((a, b) => a.index - b.index).forEach(item => {
        item.card.style.gridColumn = `${index + 1}`;
        item.card.style.gridRow = `${row} / span ${item.span}`;
        row += item.span;
      });
    });
  }

  function scheduleLayout() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layoutMasonry);
  }

  gallery.classList.add('is-masonry');

  // 이미지, 글꼴, 화면 폭 변화로 카드 높이가 바뀌면 다시 배치한다.
  const observer = new ResizeObserver(scheduleLayout);
  cards.forEach(card => observer.observe(card));
  gallery.querySelectorAll('img').forEach(image => {
    image.addEventListener('load', scheduleLayout);
    image.addEventListener('error', scheduleLayout);
  });
  window.addEventListener('resize', scheduleLayout);
  document.fonts.ready.then(scheduleLayout);
  scheduleLayout();
}
