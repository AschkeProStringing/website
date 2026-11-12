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

  // Eingebettete Daten (data/data.js) erlauben das Öffnen per Doppelklick (file://); sonst JSON per fetch
  const loadData = () => window.SITE_DATA ? Promise.resolve([window.SITE_DATA.products, window.SITE_DATA.site])
    : Promise.all([fetch('data/products.json').then(r => r.json()), fetch('data/site.json').then(r => r.json())]);
  const catalog = $('#catalog');
  if (!catalog) return;

  loadData()
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
    const state = { q: '', cat: 'all', tag: '', sort: 'name', material: '', shape: '', color: '', soldout: false };
    const shapeById = Object.fromEntries(data.shapes.map(x => [x.id, x]));
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
    $('#material').innerHTML += data.materials.map(m => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join('');
    $('#shape').innerHTML += data.shapes.map(m => `<option value="${esc(m.id)}">${esc(m.title)}</option>`).join('');
    $('#material').addEventListener('change', e => { state.material = e.target.value; render(); });
    $('#color').innerHTML += [...new Set(products.map(p => p.color).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'de')).map(c => `<option>${esc(c)}</option>`).join('');
    $('#color').addEventListener('change', e => { state.color = e.target.value; render(); });
    $('#soldout').addEventListener('change', e => { state.soldout = e.target.checked; render(); });
    $('#shape').addEventListener('change', e => { state.shape = e.target.value; render(); });

    const stockBadge = p => {
      if (p.stock === undefined) return '';
      if (p.stock <= 0) return '<span class="stock out">ausverkauft</span>';
      if (p.stock <= 2) return `<span class="stock low">nur ${p.stock} da</span>`;
      return '<span class="stock ok">verfügbar</span>';
    };
    // Querschnitt der Saite: Kreis oder regelmäßiges Vieleck
    const shapeSvg = sides => {
      const c = 12, r = 9;
      if (!sides) return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}"/></svg>`;
      const pts = Array.from({ length: sides }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / sides; return (c + r * Math.cos(a)).toFixed(2) + ',' + (c + r * Math.sin(a)).toFixed(2); }).join(' ');
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${pts}"/></svg>`;
    };
    const swatch = p => {
      if (!p.colorHex) return '';
      const bg = p.colorHex.length > 1 ? `linear-gradient(135deg, ${p.colorHex[0]} 50%, ${p.colorHex[1]} 50%)` : p.colorHex[0];
      return `<span class="chip-info"><i class="swatch" style="background:${esc(bg)}" aria-hidden="true"></i>${esc(p.color)}</span>`;
    };
    const cardHtml = p => {
      const cat = catById[p.category];
      const meta = [p.colorHex ? '' : p.color, p.weight].filter(Boolean).join(' · ');
      const sh = p.shape && shapeById[p.shape];
      const props = [swatch(p), p.material ? `<span class="chip-info">${esc(p.material)}</span>` : '',
        sh ? `<span class="chip-info shape" title="Saitenform: ${esc(sh.title)}">${shapeSvg(sh.sides)}${esc(sh.title)}</span>` : ''].join('');
      const priceNote = cat.priceNote ? `<small class="meta">${esc(cat.priceNote)}</small>` : '';
      return `<article class="product${p.stock === 0 ? ' soldout' : ''}" data-cat="${esc(p.category)}">
        <div class="pic">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : '<span class="ph" aria-hidden="true">◎</span>'}</div>
        <div class="body">
          <span class="brand-l">${esc(p.brand)}</span>
          <h4>${esc(p.name)}</h4>
          ${props ? `<div class="props">${props}</div>` : ''}
          ${p.structureImage ? `<figure class="structure"><img src="${esc(p.structureImage)}" alt="Saitenstruktur ${esc(p.name)}" loading="lazy"><figcaption>Saitenaufbau</figcaption></figure>` : ''}
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
        if (state.material && p.material !== state.material) return false;
        if (state.shape && p.shape !== state.shape) return false;
        if (state.color && p.color !== state.color) return false;
        if (p.stock === 0 && !state.soldout) return false;
        if (state.q) {
          const hay = norm([p.brand, p.name, p.color, p.comment, ...(p.tags || []), catById[p.category].title, p.sub, p.material, p.shape].filter(Boolean).join(' '));
          if (!state.q.split(/\s+/).every(w => hay.includes(w))) return false;
        }
        return true;
      });
      const byName = (a, b) => a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' });
      const cmp = { name: byName, 'price-asc': (a, b) => a.price - b.price || byName(a, b), 'price-desc': (a, b) => b.price - a.price || byName(a, b) }[state.sort];
      $('#count').textContent = list.length + (list.length === 1 ? ' Produkt' : ' Produkte');
      if (!list.length) { catalog.innerHTML = '<p class="empty">Nichts gefunden. Probieren Sie einen anderen Suchbegriff – oder fragen Sie mich einfach direkt an.</p>'; return; }
      catalog.innerHTML = categories.map(c => {
        const items = list.filter(p => p.category === c.id).sort(cmp);
        if (!items.length) return '';
        const subs = c.subcategories || [{ id: undefined, title: '' }];
        const groups = subs.map(sc => ({ sc, list: items.filter(p => p.sub === sc.id) })).filter(g => g.list.length);
        return `<section class="cat-block" aria-labelledby="h-${esc(c.id)}"><h3 id="h-${esc(c.id)}">${esc(c.title)}</h3>${c.subtitle ? `<p class="sub">${esc(c.subtitle)}</p>` : ''}${groups.map(g => `${g.sc.title ? `<h4 class="subcat">${esc(g.sc.title)} <span>${g.list.length}</span></h4>` : ''}<div class="products">${g.list.map(cardHtml).join('')}</div>`).join('')}</section>`;
      }).join('');
    }
    render();
  }
})();
