(() => {
  'use strict';
  // Eingebettete Daten (data/data.js) erlauben das Öffnen per Doppelklick (file://); sonst JSON per fetch
  const loadData = () => window.SITE_DATA ? Promise.resolve([window.SITE_DATA.products, window.SITE_DATA.site])
    : Promise.all([fetch('data/products.json').then(r => r.json()), fetch('data/site.json').then(r => r.json())]);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const form = $('#form');
  let site = { email: 'besaitungsservice@aschke.net', whatsapp: 'https://wa.me/491626951862', handover: [] };
  let strings = [];

  const racketHtml = n => `
    <div class="racket" data-racket="${n}">
      <h4>Schläger ${n}</h4>
      <div class="row2">
        <div class="field"><label for="r${n}model">Marke / Modell *</label><input id="r${n}model" type="text" data-k="Schläger" placeholder="z.&nbsp;B. Head Speed MP"></div>
        <div class="field"><label for="r${n}grip">Griffstärke</label>
          <select id="r${n}grip" data-k="Griffstärke"><option value="">weiß nicht</option><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}string">Gewünschte Saite</label>
          <div class="string-picker"><input id="r${n}string" type="text" data-k="Saite" placeholder="aus dem Sortiment wählen oder tippen" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="r${n}stringList" aria-describedby="r${n}stringHint"><ul id="r${n}stringList" class="cdd-list string-list" role="listbox" aria-label="Passende Saiten" hidden></ul></div>
          <span class="hint" id="r${n}stringHint">Eigene Saite? Dann einfach hier eintragen (17 € Arbeitspreis).</span>
          <label class="choice" style="margin-top:.5rem"><input type="checkbox" id="r${n}pick" data-k="Saitenwahl" value="Bitte eine passende Saite für mich aussuchen"> Bitte eine passende Saite für mich aussuchen</label></div>
        <div class="field"><label for="r${n}method">Besaitungsmethode</label>
          <select id="r${n}method" data-k="Methode"><option value="">nach Empfehlung</option><option>2 Knoten</option><option>4 Knoten</option><option>Hybrid (Längs-/Quersaite verschieden)</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}cur">Welche Saite spielst du aktuell?</label><input id="r${n}cur" type="text" data-k="Aktuelle Saite" placeholder="unbekannt ist kein Problem"><span class="hint">Wurde der Schläger bei mir besaitet, habe ich die Daten.</span></div>
        <div class="field"><label for="r${n}pat">Saitenbild des Schlägers</label>
          <select id="r${n}pat" data-k="Saitenbild"><option value="">weiß nicht / bei dir besaitet</option>${['14x18', '16x17', '16x18', '16x19', '16x20', '18x16', '18x19', '18x20', '20x18', '22x20', '22x21', '22x22', '22x23', '22x24'].map(o => `<option>${o}</option>`).join('')}<option value="__other">anderes Saitenbild …</option></select>
          <input id="r${n}patOther" type="text" data-k="Saitenbild" data-other="1" hidden placeholder="Saitenbild eintragen, z.&nbsp;B. 16x15" aria-label="Anderes Saitenbild" style="margin-top:.5rem"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}hard">Welche Härte (Spannung) spielst du aktuell?</label><input id="r${n}hard" type="text" data-k="Bisherige Härte/Spannung" placeholder="z.&nbsp;B. 24 kg, eher hart – unbekannt ist ok"></div>
        <div class="field"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}len">Spannung längs (kg)</label><input id="r${n}len" type="number" min="10" max="40" step="0.5" data-k="Spannung längs (kg)" inputmode="decimal"></div>
        <div class="field"><label for="r${n}cross">Spannung quer (kg)</label><input id="r${n}cross" type="number" min="10" max="40" step="0.5" data-k="Spannung quer (kg)" inputmode="decimal"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="r${n}grip2">Griffband</label>
          <select id="r${n}grip2" data-k="Griffband"><option value="">keine Änderung</option><option>Overgrip</option><option>Basisgriffband</option><option>Beides (wenn nötig)</option></select>
          <label class="choice" style="margin-top:.5rem"><input type="checkbox" id="r${n}eyelet" data-k="Ösenband" value="erneuern"> Ösenband erneuern</label></div>
        <div class="field"><label for="r${n}note">Bemerkung</label><input id="r${n}note" type="text" data-k="Bemerkung" placeholder="z.&nbsp;B. Grip-Farbe, Metortune-Vermessung erwünscht"></div>
      </div>
    </div>`;

  function renderRackets() {
    const n = +$('#count').value, box = $('#rackets');
    const old = [...box.querySelectorAll('[data-k]')].reduce((m, el) => (m[el.id] = el.type === 'checkbox' ? el.checked : el.value, m), {});
    box.innerHTML = Array.from({ length: n }, (_, i) => racketHtml(i + 1)).join('');
    box.querySelectorAll('[data-k]').forEach(el => {
      if (old[el.id] === undefined) return;
      if (el.type === 'checkbox') el.checked = old[el.id]; else el.value = old[el.id];
    });
    box.querySelectorAll('select[data-k="Saitenbild"]').forEach(syncPattern);
    box.querySelectorAll('.string-picker').forEach(setupStringPicker);
  }

  function setupStringPicker(picker) {
    const input = $('input', picker), list = $('ul', picker);
    let active = -1, interacting = false;
    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function show() {
      const query = input.value.trim().toLocaleLowerCase('de');
      const matches = strings.filter(name => name.toLocaleLowerCase('de').includes(query));
      list.innerHTML = matches.map((name, i) => `<li id="${list.id}-${i}" role="option" aria-selected="false">${esc(name)}</li>`).join('');
      active = -1;
      input.removeAttribute('aria-activedescendant');
      list.hidden = !matches.length;
      input.setAttribute('aria-expanded', String(!!matches.length));
    }
    function choose(option) {
      input.value = option.textContent;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }
    input.addEventListener('focus', show);
    input.addEventListener('click', () => { if (list.hidden) show(); });
    input.addEventListener('input', show);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !list.hidden) {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) show();
        const options = [...list.children];
        if (!options.length) return;
        e.preventDefault();
        active = active < 0 ? (e.key === 'ArrowDown' ? 0 : options.length - 1)
          : Math.max(0, Math.min(options.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
        options.forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
        input.setAttribute('aria-activedescendant', options[active].id);
        options[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && !list.hidden && active >= 0) {
        e.preventDefault();
        choose(list.children[active]);
      }
    });
    list.addEventListener('pointerdown', e => {
      interacting = true;
      if (e.pointerType === 'mouse') e.preventDefault();
    });
    const endInteraction = () => setTimeout(() => {
      interacting = false;
      if (document.activeElement !== input) close();
    }, 0);
    list.addEventListener('pointerup', endInteraction);
    list.addEventListener('pointercancel', endInteraction);
    list.addEventListener('click', e => {
      const option = e.target.closest('[role="option"]');
      if (option) choose(option);
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (!interacting && document.activeElement !== input) close();
    }, 0));
  }
  // Freitextfeld nur bei "anderes Saitenbild" anzeigen
  function syncPattern(sel) {
    const other = sel.parentElement.querySelector('[data-other]');
    other.hidden = sel.value !== '__other';
    if (other.hidden) other.value = '';
  }
  $('#rackets').addEventListener('change', e => { if (e.target.matches('select[data-k="Saitenbild"]')) syncPattern(e.target); });
  $('#count').addEventListener('change', renderRackets);
  renderRackets();
  function syncCustomerDetails() {
    const unchanged = $('#existingCustomer').checked;
    $('#billingDetails').hidden = unchanged;
    $('#playerProfile').hidden = unchanged;
    $('#result').classList.remove('show');
  }
  $('#existingCustomer').addEventListener('change', syncCustomerDetails);
  form.addEventListener('reset', () => setTimeout(() => { renderRackets(); syncCustomerDetails(); }, 0));

  loadData().then(([data, s]) => {
    site = s;
    strings = data.products.filter(p => ['saitenrollen-tennis', 'saitensets', 'saitenrollen-badminton', 'saiten-squash'].includes(p.category) && p.stock !== 0)
      .map(p => p.name);
    const focusedPicker = document.activeElement.closest('.string-picker');
    if (focusedPicker) document.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    $('#handoverChoices').innerHTML = s.handover.map((h, i) => `<label class="choice"><input type="radio" name="handover" value="${esc(h.title)}" ${i === 0 ? 'checked' : ''}> ${esc(h.title)}</label>`).join('');
  });

  const val = n => (form.elements[n]?.value || '').trim();
  const checked = n => [...form.querySelectorAll(`[name="${n}"]:checked`)].map(e => e.value);

  function buildText() {
    const L = ['Neuauftrag – Aschke Besaitungsservice', ''];
    L.push(`Name: ${val('name')}`);
    if (val('phone')) L.push(`Telefon/WhatsApp: ${val('phone')}`);
    if (val('email')) L.push(`E-Mail: ${val('email')}`);
    const unchanged = $('#existingCustomer').checked;
    if (unchanged) L.push('Bestandskunde: Rechnungsadresse und Spielerprofil unverändert');
    else {
      const addr = [val('street'), [val('zip'), val('city')].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      if (addr) L.push(`Rechnungsadresse: ${addr}`);
    }
    L.push(`Bevorzugter Kontakt: ${val('contactWay')}`, `Sportart: ${checked('sport')[0]}`, '');
    const prof = [];
    if (!unchanged) {
      if (val('level')) prof.push(`Spielstärke: ${val('level')}`);
      if (val('freq')) prof.push(`Spielhäufigkeit: ${val('freq')}`);
      [['arm', 'Arm-/Schulterprobleme'], ['power', 'Kontrolle oder Power'], ['spin', 'Spin oder flach'], ['length', 'Mehr Länge gewünscht'],
        ['logo', 'Kostenloses Herstellerlogo'], ['colormatch', 'Saitenfarbe passend zum Schläger'], ['hand', 'Spielhand']]
        .forEach(([k, t]) => { if (checked(k).length) prof.push(`${t}: ${checked(k)[0]}`); });
      if (val('bisher')) prof.push(`Sonstige Wünsche / Erfahrungen: ${val('bisher')}`);
    }
    if (prof.length) L.push('Spielerprofil', ...prof, '');
    document.querySelectorAll('.racket').forEach(r => {
      L.push(`Schläger ${r.dataset.racket}`);
      r.querySelectorAll('[data-k]').forEach(el => {
        if (el.type === 'checkbox' && !el.checked) return;
        if (el.value === '__other') return;
        if (el.value.trim()) L.push(`  ${el.dataset.k}: ${el.value.trim()}`);
      });
    });
    L.push('', `Übergabe: ${checked('handover')[0] || '–'}`);
    if (val('until')) L.push(`Fertigstellung gewünscht bis: ${new Date(val('until')).toLocaleDateString('de-DE')}`);
    if (val('notes')) L.push(`Sonstige Lieferwünsche: ${val('notes')}`);
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
