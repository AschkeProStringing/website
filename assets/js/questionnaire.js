(() => {
  'use strict';
  // Eingebettete Daten (data/data.js) erlauben das Öffnen per Doppelklick (file://); sonst JSON per fetch
  const loadData = () => window.SITE_DATA ? Promise.resolve([window.SITE_DATA.products, window.SITE_DATA.site])
    : Promise.all([fetch('data/products.json').then(r => r.json()), fetch('data/site.json').then(r => r.json())]);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const form = $('#form');
  let site = { email: 'besaitungsservice@aschke.net', whatsapp: 'https://wa.me/491626951862', handover: [] };

  const racketHtml = n => `
    <div class="racket" data-racket="${n}">
      <h4>Schläger ${n}</h4>
      <div class="row2">
        <div class="field"><label for="r${n}model">Marke / Modell *</label><input id="r${n}model" type="text" data-k="Schläger" placeholder="z.&nbsp;B. Head Speed MP"></div>
        <div class="field"><label for="r${n}grip">Griffstärke</label>
          <select id="r${n}grip" data-k="Griffstärke"><option value="">weiß nicht</option><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}string">Gewünschte Saite</label><input id="r${n}string" type="text" list="stringList" data-k="Saite" placeholder="aus dem Sortiment wählen oder tippen"><span class="hint">Eigene Saite? Dann einfach hier eintragen (17 € Arbeitspreis).</span></div>
        <div class="field"><label for="r${n}method">Besaitungsmethode</label>
          <select id="r${n}method" data-k="Methode"><option value="">nach Empfehlung</option><option>2 Knoten</option><option>4 Knoten</option><option>Hybrid (Längs-/Quersaite verschieden)</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}len">Spannung längs (kg)</label><input id="r${n}len" type="number" min="10" max="40" step="0.5" data-k="Spannung längs (kg)" inputmode="decimal"></div>
        <div class="field"><label for="r${n}cross">Spannung quer (kg)</label><input id="r${n}cross" type="number" min="10" max="40" step="0.5" data-k="Spannung quer (kg)" inputmode="decimal"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}grip2">Griffband</label>
          <select id="r${n}grip2" data-k="Griffband"><option value="">keine Änderung</option><option>Overgrip aufbringen</option><option>Basisgriffband erneuern</option><option>Ösenband erneuern</option></select></div>
        <div class="field"><label for="r${n}note">Bemerkung</label><input id="r${n}note" type="text" data-k="Bemerkung" placeholder="z.&nbsp;B. Grip-Farbe, Metortune-Vermessung erwünscht"></div>
      </div>
    </div>`;

  function renderRackets() {
    const n = +$('#count').value, box = $('#rackets');
    const old = [...box.querySelectorAll('[data-k]')].reduce((m, el) => (m[el.id] = el.value, m), {});
    box.innerHTML = Array.from({ length: n }, (_, i) => racketHtml(i + 1)).join('');
    box.querySelectorAll('[data-k]').forEach(el => { if (old[el.id] !== undefined) el.value = old[el.id]; });
  }
  $('#count').addEventListener('change', renderRackets);
  renderRackets();
  form.addEventListener('reset', () => setTimeout(() => { renderRackets(); $('#result').classList.remove('show'); }, 0));

  loadData().then(([data, s]) => {
    site = s;
    $('#stringList').innerHTML = data.products.filter(p => ['saitenrollen-tennis', 'saitensets', 'saitenrollen-badminton', 'saiten-squash'].includes(p.category) && p.stock !== 0)
      .map(p => `<option value="${esc(p.name)}"></option>`).join('');
    $('#handoverChoices').innerHTML = s.handover.map((h, i) => `<label class="choice"><input type="radio" name="handover" value="${esc(h.title)}" ${i === 0 ? 'checked' : ''}> ${esc(h.title)}</label>`).join('');
  });

  const val = n => (form.elements[n]?.value || '').trim();
  const checked = n => [...form.querySelectorAll(`[name="${n}"]:checked`)].map(e => e.value);

  function buildText() {
    const L = ['Neuauftrag – Aschke Besaitungsservice', ''];
    L.push(`Name: ${val('name')}`);
    if (val('phone')) L.push(`Telefon/WhatsApp: ${val('phone')}`);
    if (val('email')) L.push(`E-Mail: ${val('email')}`);
    L.push(`Bevorzugter Kontakt: ${val('contactWay')}`, `Sportart: ${checked('sport')[0]}`, '');
    const prof = [];
    if (val('level')) prof.push(`Spielstärke: ${val('level')}`);
    if (val('freq')) prof.push(`Spielhäufigkeit: ${val('freq')}`);
    if (checked('wants').length) prof.push(`Wichtig: ${checked('wants').join(', ')}`);
    if (checked('arm').length) prof.push('Beschwerden an Arm/Ellbogen/Schulter: ja');
    if (val('bisher')) prof.push(`Bisherige Saite/Erfahrung: ${val('bisher')}`);
    if (prof.length) L.push('Spielerprofil', ...prof, '');
    document.querySelectorAll('.racket').forEach(r => {
      L.push(`Schläger ${r.dataset.racket}`);
      r.querySelectorAll('[data-k]').forEach(el => { if (el.value.trim()) L.push(`  ${el.dataset.k}: ${el.value.trim()}`); });
    });
    L.push('', `Übergabe: ${checked('handover')[0] || '–'}`);
    if (val('until')) L.push(`Fertig bis: ${new Date(val('until')).toLocaleDateString('de-DE')}`);
    if (val('notes')) L.push(`Sonstiges: ${val('notes')}`);
    return L.join('\n');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = $('#error'); err.textContent = '';
    if (!val('name')) return fail('Bitte geben Sie Ihren Namen an.', 'name');
    if (!val('phone') && !val('email')) return fail('Bitte geben Sie Telefon/WhatsApp oder E-Mail an, damit ich Sie erreichen kann.', 'phone');
    const first = document.querySelector('.racket [data-k="Schläger"]');
    if (document.querySelectorAll('.racket [data-k="Schläger"]').length && [...document.querySelectorAll('.racket [data-k="Schläger"]')].some(i => !i.value.trim())) return fail('Bitte geben Sie für jeden Schläger Marke/Modell an.', first.id);
    if (!$('#privacy').checked) return fail('Bitte bestätigen Sie den Datenschutzhinweis.', 'privacy');
    const text = buildText();
    $('#preview').textContent = text;
    $('#sendWa').href = `${site.whatsapp}?text=${encodeURIComponent(text)}`;
    $('#sendMail').href = `mailto:${site.email}?subject=${encodeURIComponent('Neuauftrag Besaitung – ' + val('name'))}&body=${encodeURIComponent(text)}`;
    const res = $('#result'); res.classList.add('show'); res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  function fail(msg, id) { $('#error').textContent = msg; $('#' + id).focus(); }

  $('#copy').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText($('#preview').textContent); e.target.textContent = 'Kopiert ✓'; }
    catch { const r = document.createRange(); r.selectNodeContents($('#preview')); getSelection().removeAllRanges(); getSelection().addRange(r); e.target.textContent = 'Text markiert – bitte kopieren'; }
  });
})();
