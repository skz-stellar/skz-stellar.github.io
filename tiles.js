(() => {
  const tiles = document.querySelector('.tiles');
  if (!tiles || !('ResizeObserver' in window)) return;

  const cards = [...tiles.children];
  const desktop = window.matchMedia('(min-width: 801px)');
  let frame;

  function layout() {
    const masonry = desktop.matches;
    // Measure natural card heights before enabling the small grid rows.
    const gap = parseFloat(getComputedStyle(tiles).getPropertyValue('--tile-gap'));
    const spans = cards.map(card => Math.ceil(card.getBoundingClientRect().height + gap));
    cards.forEach((card, index) => {
      card.style.gridRowEnd = masonry ? `span ${spans[index]}` : '';
    });
    tiles.classList.toggle('masonry', masonry);
  }

  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layout);
  }

  const observer = new ResizeObserver(schedule);
  cards.forEach(card => observer.observe(card));
  desktop.addEventListener('change', schedule);
  layout();
})();
