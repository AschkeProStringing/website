(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = n => n.toLocaleString('de-DE', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';

  // Navigation
  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
  }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // Einblend-Animation
  document.documentElement.classList.add('js');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));

  const catalog = $('#catalog');
  if (!catalog) return;

  Promise.all([fetch('data/products.json').then(r => r.json()), fetch('data/site.json').then(r => r.json())])
    .then(([data, site]) => { renderSite(site); initCatalog(data, site); })
    .catch(() => { catalog.innerHTML = '<p class="empty">Das Sortiment konnte nicht geladen werden. Bitte Seite neu laden oder <a href="Angebot.pdf">das Angebot als PDF</a> öffnen.</p>'; });

  function renderSite(site) {
    $('#handover').innerHTML = site.handover.map(h => `<article class="card"><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></article>`).join('');
    $('#services').innerHTML = site.services.map(s => `<div class="price-row"><span>${esc(s.title)}<small>${esc(s.note)}</small></span><strong>${esc(s.price)}</strong></div>`).join('');
    $('#priceNote').textContent = site.priceNote;
    $('#kulanzIntro').textContent = site.kulanz.intro;
    $('#kulanzRows').innerHTML = site.kulanz.rows.map(r => `<tr><td>${esc(r.reason)}</td><td>${esc(r.result)}</td></tr>`).join('');
    $('#kulanzGrip').textContent = site.kulanz.grip;
    $('#diademNote').textContent = site.diademNote;
  }

  function initCatalog(data, site) {
    const { categories, products } = data;
    const state = { q: '', cat: 'all', tag: '', sort: 'name', onlyStock: false };
    const catById = Object.fromEntries(categories.map(c => [c.id, c]));
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const brands = [...new Set(products.filter(p => ['saitenrollen-tennis', 'saitensets'].includes(p.category)).map(p => p.brand))].sort((a, b) => a.localeCompare(b));
    $('#brands').innerHTML = brands.map(b => `<li><button type="button" data-brand="${esc(b)}">${esc(b)}</button></li>`).join('');
    $('#brands').addEventListener('click', e => {
      const b = e.target.closest('[data-brand]'); if (!b) return;
      $('#search').value = b.dataset.brand; state.q = norm(b.dataset.brand); render();
      $('#search').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#updated').textContent = 'Stand der Preise und Bestände: ' + new Date(data.updated).toLocaleDateString('de-DE') + '. Änderungen und Irrtümer vorbehalten.';

    const catChips = $('#catChips');
    catChips.innerHTML = [`<button class="chip" data-cat="all" aria-pressed="true">Alle</button>`]
      .concat(categories.map(c => `<button class="chip" data-cat="${esc(c.id)}" aria-pressed="false">${esc(c.title)}</button>`)).join('');
    catChips.addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      state.cat = b.dataset.cat;
      catChips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b));
      render();
    });

    const tags = [...new Set(products.flatMap(p => p.tags || []))].sort((a, b) => a.localeCompare(b, 'de'));
    const tagChips = $('#tagChips');
    tagChips.innerHTML = tags.map(t => `<button class="chip small" data-tag="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('');
    tagChips.addEventListener('click', e => {
      const b = e.target.closest('[data-tag]'); if (!b) return;
      state.tag = state.tag === b.dataset.tag ? '' : b.dataset.tag;
      tagChips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.tag === state.tag));
      render();
    });

    $('#search').addEventListener('input', e => { state.q = norm(e.target.value.trim()); render(); });
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
    $('#onlyStock').addEventListener('change', e => { state.onlyStock = e.target.checked; render(); });

    const stockBadge = p => {
      if (p.stock === undefined) return '';
      if (p.stock <= 0) return '<span class="stock out">ausverkauft</span>';
      if (p.stock <= 2) return `<span class="stock low">nur ${p.stock} da</span>`;
      return '<span class="stock ok">verfügbar</span>';
    };
    const cardHtml = p => {
      const cat = catById[p.category];
      const meta = [p.type, p.color, p.weight && p.weight].filter(Boolean).join(' · ');
      const priceNote = cat.priceNote ? `<small class="meta">${esc(cat.priceNote)}</small>` : '';
      return `<article class="product${p.stock === 0 ? ' soldout' : ''}">
        <div class="pic">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : '<span class="ph" aria-hidden="true">◎</span>'}</div>
        <div class="body">
          <span class="brand-l">${esc(p.brand)}</span>
          <h4>${esc(p.name)}</h4>
          ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
          ${p.tags ? `<div class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.comment ? `<div class="meta">${esc(p.comment)}</div>` : ''}
          ${p.deposit ? `<div class="meta">Kaution ${eur(p.deposit)}</div>` : ''}
          <div class="foot"><div><span class="price">${eur(p.price)}</span>${priceNote ? '<br>' + priceNote : ''}</div>${stockBadge(p)}</div>
        </div></article>`;
    };

    function render() {
      let list = products.filter(p => {
        if (state.cat !== 'all' && p.category !== state.cat) return false;
        if (state.tag && !(p.tags || []).includes(state.tag)) return false;
        if (state.onlyStock && p.stock === 0) return false;
        if (state.q) {
          const hay = norm([p.brand, p.name, p.color, p.type, p.comment, ...(p.tags || []), catById[p.category].title].filter(Boolean).join(' '));
          if (!state.q.split(/\s+/).every(w => hay.includes(w))) return false;
        }
        return true;
      });
      const cmp = { name: (a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }), 'price-asc': (a, b) => a.price - b.price || a.name.localeCompare(b.name, 'de'), 'price-desc': (a, b) => b.price - a.price || a.name.localeCompare(b.name, 'de') }[state.sort];
      $('#count').textContent = list.length + (list.length === 1 ? ' Produkt' : ' Produkte');
      if (!list.length) { catalog.innerHTML = '<p class="empty">Nichts gefunden. Probieren Sie einen anderen Suchbegriff – oder fragen Sie mich einfach direkt an.</p>'; return; }
      catalog.innerHTML = categories.map(c => {
        const items = list.filter(p => p.category === c.id).sort(cmp);
        if (!items.length) return '';
        return `<section class="cat-block" aria-labelledby="h-${esc(c.id)}"><h3 id="h-${esc(c.id)}">${esc(c.title)}</h3>${c.subtitle ? `<p class="sub">${esc(c.subtitle)}</p>` : ''}<div class="products">${items.map(cardHtml).join('')}</div></section>`;
      }).join('');
    }
    render();
  }
})();
