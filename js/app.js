(() => {
  'use strict';

  const PASS = 0.7;            // soglia minima per superare un esercizio
  const STORE = 'ciaoamore1.progress.v1';
  const app = document.getElementById('app');

  /* ---------------- progressi ---------------- */
  let state = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || { ex: {}, notes: {} }; }
    catch (e) { return { ex: {}, notes: {} }; }
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

  const exercisesOf = sec => sec.blocks.filter(b => b.t === 'ex');
  const exPassed = id => !!(state.ex[id] && state.ex[id].passed);
  const sectionDone = sec => exercisesOf(sec).every(e => exPassed(e.id));
  const unitDone = u => u.sections.every(sectionDone);
  const unitUnlocked = idx => idx === 0 || unitDone(UNITS[idx - 1]);
  const sectionUnlocked = (u, i) => i === 0 || sectionDone(u.sections[i - 1]);
  const totalSections = UNITS.reduce((n, u) => n + u.sections.length, 0);
  const doneSections = () => UNITS.reduce((n, u) => n + u.sections.filter(sectionDone).length, 0);

  function nextStep() {
    for (let ui = 0; ui < UNITS.length; ui++) {
      const u = UNITS[ui];
      for (let si = 0; si < u.sections.length; si++) {
        if (!sectionDone(u.sections[si])) return { u, s: u.sections[si] };
      }
    }
    return null;
  }

  /* ---------------- utilità ---------------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const LOCK = '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor"/><circle cx="12" cy="15.2" r="1.6" fill="#fff"/></svg>';
  const CHECK = '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function norm(s) {
    return String(s).normalize('NFC').toLowerCase()
      .replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim()
      .replace(/[.!?;,:]+$/, '').trim();
  }
  function loose(s) {
    return norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/'/g, '').replace(/\s+/g, ' ');
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------------- router ---------------- */
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    window.scrollTo(0, 0);
    if (!parts.length) return renderHome();
    const m = parts[0].match(/^u(\d+)$/);
    if (!m) return renderHome();
    const n = +m[1];
    const ui = UNITS.findIndex(u => u.n === n);
    if (ui < 0) return renderLockedUnit(n);
    if (!unitUnlocked(ui)) return renderLockedUnit(n);
    const u = UNITS[ui];
    if (parts[1]) {
      const si = u.sections.findIndex(s => s.id === parts[1]);
      if (si < 0) return renderUnit(u);
      if (!sectionUnlocked(u, si)) return renderLockedSection(u, si);
      return renderSection(u, si);
    }
    renderUnit(u);
  }
  window.addEventListener('hashchange', route);

  function setNav(html) { document.getElementById('topnav').innerHTML = html || ''; }

  /* ---------------- home ---------------- */
  function renderHome() {
    setNav('');
    document.title = 'Ciao, amore! 1 · Italiano A1';
    const done = doneSections();
    const nxt = nextStep();
    const cta = nxt
      ? `<a class="btn" href="#/u${nxt.u.n}/${nxt.s.id}">${done ? 'Continua' : 'Comincia'}: Unità ${nxt.u.n}, ${nxt.s.letter}. ${esc(nxt.s.title)}</a>`
      : `<p class="allset">Hai completato le unità 1 e 2. Brava, bravo!</p>`;

    const cards = [
      ...UNITS.map((u, i) => unitCard(u.n, u.cover, unitUnlocked(i), u)),
      ...LOCKED_UNITS.map(l => unitCard(l.n, l.cover, false, null, l)),
    ].join('');

    app.innerHTML = `
      <section class="hero">
        <img class="hero-cover" src="img/cover.webp" alt="Copertina di Ciao, amore! 1, Italiano per stranieri, di Roberto Fader" width="849" height="1200">
        <div class="hero-text">
          <p class="script-label">Italiano A1</p>
          <h1>Impara l’italiano con Roberto e Natalia, tra Venezia, Firenze e Roma.</h1>
          <p class="lede">Leggi i dialoghi, fai gli esercizi e controlla subito le risposte. Ogni sezione superata apre la successiva; per passare all’unità dopo devi completare tutta l’unità.</p>
          <div class="meter" aria-label="Sezioni completate: ${done} su ${totalSections}">
            <div class="meter-bar"><span style="width:${(done / totalSections) * 100}%"></span></div>
            <p>${done} di ${totalSections} sezioni completate</p>
          </div>
          ${cta}
        </div>
      </section>
      <section class="shelf" aria-labelledby="shelf-h">
        <h2 id="shelf-h">Le unità</h2>
        <ol class="units">${cards}</ol>
      </section>`;
  }

  function unitCard(n, cover, open, u, locked) {
    let status, cls = '';
    if (open && u) {
      const d = u.sections.filter(sectionDone).length;
      status = unitDone(u) ? `${CHECK} Completata` : d ? `${d} di ${u.sections.length} sezioni` : 'Da cominciare';
      if (unitDone(u)) cls = 'is-done';
    } else {
      cls = 'is-locked';
      status = `${LOCK} Completa l’Unità ${n - 1}`;
    }
    const topic = u ? u.sections[0].title : locked.sections[0];
    return `
      <li class="unit ${cls}">
        <a href="#/u${n}" aria-label="Unità ${n}${open ? '' : ' (bloccata)'}">
          <span class="unit-art">
            <img src="${cover}" alt="" loading="lazy">
            <span class="unit-n">Unità ${n}</span>
            ${open ? '' : `<span class="lock-disc">${LOCK}</span>`}
          </span>
          <span class="unit-topic">${esc(topic)}</span>
          <span class="unit-status">${status}</span>
        </a>
      </li>`;
  }

  /* ---------------- unità ---------------- */
  function renderUnit(u) {
    setNav(`<a href="#/">Tutte le unità</a>`);
    document.title = `Unità ${u.n} · Ciao, amore! 1`;
    const rows = u.sections.map((s, i) => {
      const open = sectionUnlocked(u, i);
      const done = sectionDone(s);
      const exs = exercisesOf(s);
      const passed = exs.filter(e => exPassed(e.id)).length;
      const status = done ? `${CHECK} Completata` : open ? (passed ? `${passed} di ${exs.length} esercizi` : `${exs.length} ${exs.length === 1 ? 'esercizio' : 'esercizi'}`) : `${LOCK} Bloccata`;
      const inner = `<span class="sec-letter">${s.letter}</span><span class="sec-title">${esc(s.title)}</span><span class="sec-status">${status}</span>`;
      return `<li class="sec ${done ? 'is-done' : ''} ${open ? '' : 'is-locked'}">${open ? `<a href="#/u${u.n}/${s.id}">${inner}</a>` : `<div aria-disabled="true">${inner}</div>`}</li>`;
    }).join('');
    const d = u.sections.filter(sectionDone).length;
    const nextIdx = UNITS.indexOf(u) + 1;
    const after = unitDone(u)
      ? (nextIdx < UNITS.length
        ? `<a class="btn" href="#/u${UNITS[nextIdx].n}">Vai all’Unità ${UNITS[nextIdx].n}</a>`
        : `<p class="allset">Unità completata. L’Unità 3 arriverà presto.</p>`)
      : '';
    app.innerHTML = `
      <section class="unit-hero">
        <figure class="unit-cover">
          <img src="${u.cover}" alt="${esc(u.character)}, dal romanzo ${esc(u.novel)}">
        </figure>
        <div class="unit-head">
          <p class="script-label big">Unità ${u.n}</p>
          <blockquote>“${esc(u.quote)}”<cite>${esc(u.character)}, dal romanzo <i>${esc(u.novel)}</i> di Roberto Fader</cite></blockquote>
          <div class="meter"><div class="meter-bar"><span style="width:${(d / u.sections.length) * 100}%"></span></div><p>${d} di ${u.sections.length} sezioni completate</p></div>
          <ol class="secs">${rows}</ol>
          ${after}
        </div>
      </section>`;
  }

  function renderLockedUnit(n) {
    setNav(`<a href="#/">Tutte le unità</a>`);
    const l = LOCKED_UNITS.find(x => x.n === n) || UNITS.find(x => x.n === n);
    if (!l) return renderHome();
    const titles = typeof l.sections[0] === 'string'
      ? [...l.sections.map((t, i) => `${'ABC'[i]}. ${t}`), 'D. Grammatica', 'E. Cultura italiana', 'F. Fumetti', 'G. Note importanti']
      : l.sections.map(s => `${s.letter}. ${s.title}`);
    app.innerHTML = `
      <section class="locked-page">
        <div class="locked-art"><img src="${l.cover}" alt=""><span class="lock-disc big">${LOCK}</span></div>
        <div>
          <p class="script-label big">Unità ${n}</p>
          <h1>Questa unità è bloccata</h1>
          <p class="lede">Per aprirla devi completare tutte le sezioni dell’Unità ${n - 1}, dalla A alla G, compreso il ripasso finale.</p>
          <ul class="locked-list">${titles.map(t => `<li>${LOCK}<span>${esc(t)}</span></li>`).join('')}</ul>
          <a class="btn" href="#/u${Math.min(n - 1, UNITS[UNITS.length - 1].n)}">Vai all’Unità ${n - 1}</a>
        </div>
      </section>`;
  }

  function renderLockedSection(u, si) {
    setNav(`<a href="#/u${u.n}">Unità ${u.n}</a>`);
    const prev = u.sections[si - 1];
    app.innerHTML = `
      <section class="locked-page small">
        <div>
          <p class="script-label big">Unità ${u.n}</p>
          <h1>${LOCK} ${u.sections[si].letter}. ${esc(u.sections[si].title)}</h1>
          <p class="lede">Completa prima la sezione ${prev.letter}. ${esc(prev.title)}: devi superare tutti i suoi esercizi.</p>
          <a class="btn" href="#/u${u.n}/${prev.id}">Vai a ${prev.letter}. ${esc(prev.title)}</a>
        </div>
      </section>`;
  }

  /* ---------------- sezione ---------------- */
  function renderSection(u, si) {
    const s = u.sections[si];
    setNav(`<a href="#/u${u.n}">Unità ${u.n}</a>`);
    document.title = `${s.letter}. ${s.title} · Unità ${u.n}`;
    app.innerHTML = `
      <article class="page">
        <header class="page-head">
          <p class="crumbs"><a href="#/u${u.n}">Unità ${u.n}</a> <span aria-hidden="true">/</span> sezione ${s.letter} di ${u.sections.length}</p>
          <h1><span class="page-letter">${s.letter}.</span> ${esc(s.title)}</h1>
          ${s.frase ? `<p class="frase"><span class="sr">Frase del giorno: </span>${esc(s.frase)}</p>` : ''}
          <div class="page-steps" aria-hidden="true">${u.sections.map((x, i) => `<span class="${sectionDone(x) ? 'done' : ''} ${i === si ? 'here' : ''}"></span>`).join('')}</div>
        </header>
        <div class="page-body"></div>
        <footer class="page-foot"></footer>
      </article>`;
    const body = app.querySelector('.page-body');
    s.blocks.forEach(b => body.appendChild(renderBlock(b, u, s)));
    updateFoot(u, si);
  }

  function updateFoot(u, si) {
    const s = u.sections[si];
    const foot = app.querySelector('.page-foot');
    if (!foot) return;
    const exs = exercisesOf(s);
    const left = exs.filter(e => !exPassed(e.id)).length;
    const next = u.sections[si + 1];
    const ui = UNITS.indexOf(u);
    let html;
    if (left) {
      html = `<p class="foot-msg">${LOCK} Ti ${left === 1 ? 'manca 1 esercizio' : `mancano ${left} esercizi`} per completare la sezione.</p>`;
    } else if (next) {
      html = `<p class="foot-msg ok">${CHECK} Sezione completata.</p><a class="btn" href="#/u${u.n}/${next.id}">Avanti: ${next.letter}. ${esc(next.title)}</a>`;
    } else if (UNITS[ui + 1]) {
      html = `<p class="foot-msg ok">${CHECK} Hai completato l’Unità ${u.n}! L’Unità ${UNITS[ui + 1].n} è sbloccata.</p><a class="btn" href="#/u${UNITS[ui + 1].n}">Vai all’Unità ${UNITS[ui + 1].n}</a>`;
    } else {
      html = `<p class="foot-msg ok">${CHECK} Hai completato l’Unità ${u.n}! Le prossime unità arriveranno presto.</p><a class="btn" href="#/">Torna alle unità</a>`;
    }
    foot.innerHTML = html;
    app.querySelectorAll('.page-steps span').forEach((sp, i) => sp.classList.toggle('done', sectionDone(u.sections[i])));
  }

  function renderBlock(b, u, s) {
    switch (b.t) {
      case 'h': return el(`<h2 class="b-h">${esc(b.text)}</h2>`);
      case 'p': return el(`<p class="b-p">${b.html}</p>`);
      case 'img': return el(`<figure class="b-img ${b.w ? 'w-' + b.w : ''}"><img src="${b.src}" alt="${esc(b.alt)}" loading="lazy">${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}</figure>`);
      case 'gallery': return el(`<div class="b-gallery">${b.items.map(i => `<figure><img src="${i.src}" alt="${esc(i.alt)}" loading="lazy"><figcaption>${esc(i.cap)}</figcaption></figure>`).join('')}</div>`);
      case 'box': return el(`<aside class="b-box"><h3>${esc(b.title)}</h3>${b.html}</aside>`);
      case 'dialog': return el(`<div class="b-dialog">${b.title ? `<h3>${esc(b.title)}</h3>` : ''}${b.lines.map(([who, line]) => `<p><b class="who who-${who.toLowerCase()}">${esc(who)}</b><span>${esc(line)}</span></p>`).join('')}</div>`);
      case 'oral': return el(`<aside class="b-oral"><h3>${esc(b.title)}</h3><p class="note">Attività da fare a voce con un compagno: non serve per completare la sezione.</p><ul>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></aside>`);
      case 'write': return renderWrite(b);
      case 'conj': return el(`<div class="b-conj">${b.verbs.map(v => `<table><caption>${v.inf}</caption><tbody>${v.forms.map(f => `<tr><td>${f}</td></tr>`).join('')}</tbody></table>`).join('')}</div>`);
      case 'alphabet': {
        const L = 'ABCDEFGHILMNOPQRSTUVZ'.split('');
        const names = { A: 'a', B: 'bi', C: 'ci', D: 'di', E: 'e', F: 'effe', G: 'gi', H: 'acca', I: 'i', L: 'elle', M: 'emme', N: 'enne', O: 'o', P: 'pi', Q: 'cu', R: 'erre', S: 'esse', T: 'ti', U: 'u', V: 'vu', Z: 'zeta' };
        return el(`<div class="b-grid letters">${L.map(l => `<div><b>${l}</b><span>${l.toLowerCase()}</span><i>${names[l]}</i></div>`).join('')}</div>`);
      }
      case 'numbers': {
        const W = ['uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti'];
        return el(`<div class="b-grid numbers">${W.map((w, i) => `<div><b>${i + 1}</b><span>${w}</span></div>`).join('')}</div>`);
      }
      case 'ex': return renderExercise(b, u, s);
    }
    return el('<div></div>');
  }

  function renderWrite(b) {
    const node = el(`<aside class="b-write"><h3>${esc(b.title)}</h3>${b.html}<label class="sr" for="w-${b.id}">Il tuo testo</label><textarea id="w-${b.id}" rows="${b.lines || 4}" placeholder="Scrivi qui…"></textarea><p class="note">Esercizio libero: il testo resta salvato su questo dispositivo e non serve per completare la sezione.</p></aside>`);
    const ta = node.querySelector('textarea');
    ta.value = state.notes[b.id] || '';
    ta.addEventListener('input', () => { state.notes[b.id] = ta.value; save(); });
    return node;
  }

  /* ---------------- esercizi ---------------- */
  function renderExercise(ex, u, s) {
    const prev = state.ex[ex.id];
    const node = el(`
      <section class="ex ${prev && prev.passed ? 'is-passed' : ''}" id="${ex.id}">
        <header class="ex-head">
          <h3>${esc(ex.title)}</h3>
          <span class="ex-badge">${prev && prev.passed ? `${CHECK} Superato ${prev.best}/${ex.items.length}` : 'Da fare'}</span>
        </header>
        ${ex.instr ? `<p class="ex-instr">${esc(ex.instr)}</p>` : ''}
        <ol class="ex-items"></ol>
        ${ex.kind === 'fill' ? `<p class="accents"><span>Accenti:</span>${['à', 'è', 'é', 'ì', 'ò', 'ù', '’'].map(c => `<button type="button" data-c="${c}" aria-label="Inserisci ${c}">${c}</button>`).join('')}</p>` : ''}
        <div class="ex-actions">
          <button type="button" class="btn check">Controlla</button>
          <p class="ex-result" aria-live="polite"></p>
        </div>
      </section>`);
    const list = node.querySelector('.ex-items');
    ex.items.forEach((it, i) => list.appendChild(renderItem(ex, it, i)));

    let lastInput = null;
    list.addEventListener('focusin', e => { if (e.target.matches('input.blank')) lastInput = e.target; });
    node.querySelectorAll('.accents button').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        const inp = lastInput || list.querySelector('input.blank');
        if (!inp) return;
        const s = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? s;
        inp.value = inp.value.slice(0, s) + btn.dataset.c + inp.value.slice(en);
        inp.focus(); inp.setSelectionRange(s + 1, s + 1);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    let attempts = 0;
    node.querySelector('.check').addEventListener('click', () => {
      attempts++;
      let ok = 0, missing = 0;
      const items = [...list.children];
      items.forEach((li, i) => {
        const r = gradeItem(ex, ex.items[i], li);
        li.classList.remove('ok', 'ko', 'warn');
        const fb = li.querySelector('.fb');
        fb.textContent = '';
        if (r.empty) missing++;
        if (r.ok) {
          ok++; li.classList.add('ok');
          if (r.note) { li.classList.add('warn'); fb.textContent = r.note; }
        } else {
          li.classList.add('ko');
          if (attempts >= 2 && !r.empty) fb.textContent = `Risposta giusta: ${r.right}`;
        }
      });
      const total = ex.items.length;
      const need = ex.pass || PASS;
      const passed = ok / total >= need;
      const res = node.querySelector('.ex-result');
      const rec = state.ex[ex.id] || { best: 0, passed: false };
      rec.best = Math.max(rec.best, ok);
      const wasPassed = rec.passed;
      if (passed) rec.passed = true;
      state.ex[ex.id] = rec; save();

      if (passed) {
        res.className = 'ex-result good';
        res.textContent = ok === total ? `Perfetto! ${ok}/${total}.` : `Superato: ${ok}/${total}. Puoi correggere gli errori o andare avanti.`;
        node.classList.add('is-passed');
        node.querySelector('.ex-badge').innerHTML = `${CHECK} Superato ${rec.best}/${total}`;
      } else {
        res.className = 'ex-result bad';
        const min = Math.ceil(total * need);
        res.textContent = missing
          ? `${ok}/${total}. Rispondi a tutte le domande: servono almeno ${min} risposte giuste.`
          : `${ok}/${total}. Servono almeno ${min} risposte giuste. Correggi le risposte in rosso e controlla di nuovo.${attempts >= 2 ? '' : ' Al prossimo tentativo vedrai le soluzioni.'}`;
      }
      node.querySelector('.check').textContent = 'Controlla di nuovo';

      if (passed && !wasPassed) {
        const ui = UNITS.indexOf(u), si = u.sections.indexOf(s);
        updateFoot(u, si);
        if (unitDone(u)) toast(`Unità ${u.n} completata!${UNITS[ui + 1] ? ` L’Unità ${UNITS[ui + 1].n} è sbloccata.` : ''}`);
        else if (sectionDone(s)) toast(`Sezione ${s.letter} completata!`);
        else toast('Esercizio superato!');
      }
    });
    return node;
  }

  function splitQ(q) {
    const i = q.indexOf('___');
    return i < 0 ? [q, ''] : [q.slice(0, i), q.slice(i + 3)];
  }

  function renderItem(ex, it, i) {
    const li = document.createElement('li');
    const name = `${ex.id}-${i}`;
    if (ex.kind === 'choice') {
      li.innerHTML = `<p class="q">${esc(it.q)}</p><div class="opts" role="radiogroup" aria-label="${esc(it.q)}">${it.opts.map((o, j) => `<label class="opt"><input type="radio" name="${name}" value="${j}"><span>${esc(o)}</span></label>`).join('')}</div><p class="fb"></p>`;
    } else if (ex.kind === 'fill') {
      const [a, b] = splitQ(it.q);
      const width = Math.max(4, Math.min(22, Math.max(...it.a.map(x => x.length)) + 2));
      li.innerHTML = `<p class="q">${esc(a)}<input type="text" class="blank" style="--w:${width}ch" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Risposta ${i + 1}">${esc(b)}</p><p class="fb"></p>`;
    } else if (ex.kind === 'select') {
      const [a, b] = splitQ(it.q);
      li.innerHTML = `<p class="q">${esc(a)}<select class="blank-sel" aria-label="Risposta ${i + 1}"><option value="">scegli…</option>${ex.bank.map(w => `<option>${esc(w)}</option>`).join('')}</select>${esc(b)}</p><p class="fb"></p>`;
    }
    li.addEventListener('input', () => li.classList.remove('ok', 'ko', 'warn'));
    li.addEventListener('change', () => li.classList.remove('ok', 'ko', 'warn'));
    return li;
  }

  function gradeItem(ex, it, li) {
    if (ex.kind === 'choice') {
      const c = li.querySelector('input:checked');
      if (!c) return { ok: false, empty: true, right: it.opts[it.a] };
      return { ok: +c.value === it.a, right: it.opts[it.a] };
    }
    if (ex.kind === 'select') {
      const v = li.querySelector('select').value;
      if (!v) return { ok: false, empty: true, right: it.a };
      return { ok: v === it.a, right: it.a };
    }
    const v = li.querySelector('input').value;
    if (!v.trim()) return { ok: false, empty: true, right: it.a[0] };
    if (it.a.some(a => norm(a) === norm(v))) return { ok: true };
    if (it.a.some(a => loose(a) === loose(v))) return { ok: true, note: `Attenzione agli accenti e agli apostrofi: si scrive «${it.a[0]}».` };
    return { ok: false, right: it.a[0] };
  }

  /* ---------------- avvio ---------------- */
  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Vuoi davvero cancellare tutti i progressi? Le unità torneranno bloccate.')) {
      state = { ex: {}, notes: {} }; save(); location.hash = '#/'; route();
    }
  });
  route();
})();
