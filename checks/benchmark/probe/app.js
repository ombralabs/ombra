(function () {
  'use strict';

  var STORAGE_KEY = 'ombra-fp-probe/v1';
  var MAX_SNAPSHOTS = 100;

  var STATUS = {
    same: { label: 'совпадает', cls: 'same' },
    changed: { label: 'изменилось', cls: 'changed' },
    noisy: { label: 'шум', cls: 'noisy' },
    missing: { label: 'нет в базе', cls: 'missing' },
    skipped: { label: 'пропущено', cls: 'absent' },
    absent: { label: 'нет API', cls: 'absent' },
    volatile: { label: 'волатильно', cls: 'volatile' }
  };

  var state = {
    snapshots: [],
    baselineId: null,
    profile: 'default',
    strict: false,
    doubleRun: true,
    filter: 'all',
    search: '',
    busy: false,
    lastCompare: null
  };

  var $ = function (id) { return document.getElementById(id); };
  var toastTimer = null;

  // ------------------------------------------------------------------ storage

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.snapshots)) return;
      state.snapshots = data.snapshots.filter(function (snapshot) {
        return snapshot && typeof snapshot.id === 'string' && snapshot.probes && typeof snapshot.probes === 'object';
      });
      state.snapshots.sort(byDate);
      if (typeof data.baselineId === 'string') state.baselineId = data.baselineId;
      if (typeof data.profile === 'string' && data.profile) state.profile = data.profile;
      if (typeof data.strict === 'boolean') state.strict = data.strict;
      if (typeof data.doubleRun === 'boolean') state.doubleRun = data.doubleRun;
    } catch (error) {
      console.warn('loadStore:', error);
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schema: 1,
        savedAt: new Date().toISOString(),
        baselineId: state.baselineId,
        profile: state.profile,
        strict: state.strict,
        doubleRun: state.doubleRun,
        snapshots: state.snapshots
      }));
    } catch (error) {
      toast('Не удалось сохранить в localStorage: ' + (error.message || error) + '. Экспортируйте слепки и удалите старые.', true);
    }
  }

  function byDate(a, b) {
    var ta = Date.parse(a.createdAt) || 0;
    var tb = Date.parse(b.createdAt) || 0;
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  }

  function currentSnapshot() {
    return state.snapshots.length ? state.snapshots[state.snapshots.length - 1] : null;
  }

  function baselineSnapshot() {
    if (!state.snapshots.length) return null;
    for (var i = 0; i < state.snapshots.length; i++) {
      if (state.snapshots[i].id === state.baselineId) return state.snapshots[i];
    }
    return state.snapshots[0];
  }

  // ------------------------------------------------------------------ helpers

  function formatDate(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return String(iso);
    return date.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  }

  function shortHash(hash, length) {
    if (!hash) return '—';
    return hash.slice(0, length || 12) + '…';
  }

  function formatValue(value, maxLength) {
    var limit = maxLength || 220;
    var text;
    if (value === undefined) text = 'undefined';
    else if (value === null) text = 'null';
    else if (typeof value === 'string') text = value;
    else {
      try { text = JSON.stringify(value); } catch (error) { text = String(value); }
    }
    if (text.length > limit) text = text.slice(0, limit) + '… (' + text.length + ' симв.)';
    return text;
  }

  function valuePreview(probe) {
    if (!probe) return '—';
    if (!probe.ok) return 'error: ' + (probe.err || 'unavailable');
    var skipReason = (typeof probe.s === 'string' && probe.s)
      ? probe.s
      : (probe.v && typeof probe.v === 'object' && typeof probe.v.skipped === 'string' ? probe.v.skipped : null);
    if (skipReason) return 'пропущено (' + skipReason + ')';
    if (!Object.prototype.hasOwnProperty.call(probe, 'v')) {
      return probe.h ? ('hash=' + probe.h + ' (скрыто)') : '(скрыто)';
    }
    var value = probe.v;
    if (value && typeof value === 'object' && typeof value.url === 'string' && value.url.indexOf('data:image/') === 0) {
      return 'canvas ' + value.width + '×' + value.height + ' · ' + value.url.length + ' симв.';
    }
    if (value && typeof value === 'object' && value.available === false) return 'нет API';
    return formatValue(value, 180);
  }

  function statusForRow(row) {
    return STATUS[row.status] || { label: row.status, cls: '' };
  }

  function cmp() {
    var base = baselineSnapshot();
    var current = currentSnapshot();
    if (!base || !current) return null;
    if (base.id === current.id) return null;
    return window.FPAudit.compare(base, current, { strict: state.strict });
  }

  function toast(message, isError) {
    var element = $('toast');
    if (!element) return;
    element.textContent = message;
    element.className = 'show' + (isError ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      element.className = '';
    }, isError ? 7000 : 3200);
  }

  // ------------------------------------------------------------------ render

  function ensureBaseline() {
    if (!state.snapshots.length) {
      state.baselineId = null;
      return;
    }
    if (!state.baselineId || !state.snapshots.some(function (item) { return item.id === state.baselineId; })) {
      state.baselineId = state.snapshots[0].id;
    }
  }

  function renderAll() {
    ensureBaseline();
    var current = currentSnapshot();
    var base = baselineSnapshot();

    $('versionBadge').textContent = 'v' + window.FPAudit.version;

    renderBaselineSelect();
    renderStats(base, current);
    renderVerdict(base, current);
    renderDiff(base, current);
    renderProbes(base, current);
    renderHistory(base);
  }

  function renderBaselineSelect() {
    var select = $('baselineSelect');
    select.textContent = '';
    if (!state.snapshots.length) {
      var option = document.createElement('option');
      option.textContent = 'нет слепков';
      option.value = '';
      select.appendChild(option);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    var base = baselineSnapshot();
    for (var i = 0; i < state.snapshots.length; i++) {
      var snapshot = state.snapshots[i];
      var item = document.createElement('option');
      item.value = snapshot.id;
      item.textContent = (snapshot.label || 'без метки') + ' · ' + formatDate(snapshot.createdAt) +
        ' · ' + shortHash(snapshot.hardHash, 8);
      if (base && snapshot.id === base.id) item.selected = true;
      select.appendChild(item);
    }
  }

  function renderStats(base, current) {
    var hardPct = $('statHardPct');
    var hardMeta = $('statHardMeta');
    var contextPct = $('statContextPct');
    var contextMeta = $('statContextMeta');
    var noise = $('statNoise');
    var noiseMeta = $('statNoiseMeta');
    var probes = $('statProbes');
    var hash = $('statHash');

    if (!current) {
      hardPct.textContent = '—';
      hardPct.className = 'value';
      hardMeta.textContent = 'нет данных';
      contextPct.textContent = '—';
      contextPct.className = 'value';
      contextMeta.textContent = 'нет данных';
      noise.textContent = '—';
      noise.className = 'value';
      noiseMeta.textContent = 'двойной прогон';
      probes.textContent = '—';
      hash.textContent = '—';
      return;
    }

    var result = cmp();
    if (result) {
      hardPct.textContent = result.hard.pct + '%';
      hardPct.className = 'value ' + (result.hard.pct === 100 ? 'ok' : result.hard.pct >= 95 ? 'warn' : 'bad');
      hardMeta.textContent = result.hard.same + ' / ' + result.hard.denominator + ' hard · шум ' +
        (current.hardNoisy ? current.hardNoisy.length : 0) + ' · ошибки ' +
        (current.hardErr ? current.hardErr.length : 0);

      contextPct.textContent = result.context.pct + '%';
      contextPct.className = 'value ' + (result.context.pct === 100 ? 'ok' : 'warn');
      contextMeta.textContent = result.context.same + ' / ' + result.context.denominator + ' context';
    } else {
      hardPct.textContent = 'BASE';
      hardPct.className = 'value';
      hardMeta.textContent = (current.counts ? current.counts.hard : 0) + ' hard-проб · это база';
      contextPct.textContent = '—';
      contextPct.className = 'value';
      contextMeta.textContent = 'сравнение после второго слепка';
    }

    var noisyCount = (current.noise || []).length;
    var errorCount = (current.hardErr || []).length;
    noise.textContent = String(noisyCount) + (errorCount ? ' / ' + errorCount : '');
    noise.className = 'value ' + (noisyCount || errorCount ? 'warn' : 'ok');
    noiseMeta.textContent = noisyCount ? 'шумят: ' + current.noise.slice(0, 3).join(', ') : 'шума нет';

    probes.textContent = String(current.counts ? current.counts.total : Object.keys(current.probes || {}).length);
    hash.textContent = shortHash(current.hardHash, 16);
    hash.title = current.hardHash || '';
  }

  function renderVerdict(base, current) {
    var panel = $('verdictPanel');
    var badge = $('verdictBadge');
    var title = $('verdictTitle');
    var text = $('verdictText');
    var mini = $('verdictMini');

    panel.className = 'panel verdict';
    if (!current) {
      badge.textContent = 'WAIT';
      title.textContent = 'Снимите первый слепок';
      text.textContent = 'После первого слепка он станет базой. Второй и последующие слепки будут сравниваться с базой по каждой пробе.';
      mini.textContent = '';
      return;
    }

    if (!base || base.id === current.id) {
      var baseNoisy = (current.hardNoisy || []).length;
      var baseErr = (current.hardErr || []).length;
      var baseSkipped = (current.hardSkipped || []).length;
      if (baseNoisy) {
        panel.classList.add('unstable');
        badge.textContent = 'BASE / NOISE';
        title.textContent = 'База содержит шумные hard-пробы';
        text.textContent = 'Уже на двойном прогоне базы обнаружен шум (' + current.hardNoisy.slice(0, 4).join(', ') + '). Разберите причину до сравнения с последующими стартами.';
      } else if (baseErr || baseSkipped) {
        panel.classList.add('context');
        badge.textContent = 'BASE / GAPS';
        title.textContent = 'База снята с пропусками или ошибками';
        text.textContent = 'Часть hard-проб недоступна или пропущена (ошибок: ' + baseErr + ', пропущено: ' + baseSkipped + '). Для полного baseline используйте локальный HTTP-сервер.';
      } else {
        panel.classList.add('stable');
        badge.textContent = 'BASE';
        title.textContent = 'Это база';
        text.textContent = 'Первый слепок зафиксирован. Полностью закройте браузер, запустите снова и снимите второй слепок с той же меткой профиля.';
      }
      mini.textContent = 'hard ' + (current.counts ? current.counts.hardStable + '/' + current.counts.hard : '—') +
        (baseSkipped ? ' · пропущено ' + baseSkipped : '') +
        ' · hash ' + current.hardHash;
      return;
    }

    var result = window.FPAudit.compare(base, current, { strict: state.strict });
    state.lastCompare = result;

    var cls = 'stable';
    var label = 'STABLE';
    var heading = 'Отпечаток стабилен';
    var body = 'Все hard-пробы совпали с базой. Шумных hard-проб нет.';

    if (result.verdict === 'UNSTABLE') {
      cls = 'unstable';
      label = 'UNSTABLE';
      heading = 'Отпечаток нестабилен';
      body = 'Изменилась хотя бы одна hard-проба или она шумит. Сайт увидит другой отпечаток. Разберите изменения ниже.';
      if (result.hardBad.length) {
        body += ' Первые изменения: ' + result.hardBad.slice(0, 4).map(function (row) { return row.id; }).join(', ') + '.';
      }
    } else if (result.verdict === 'INCOMPLETE') {
      cls = 'incomplete';
      label = 'INCOMPLETE';
      heading = 'Неполное сравнение';
      body = 'В одном из слепков не хватает проб. Скорее всего, чекер обновился. Снимите новый baseline.';
    } else if (result.verdict === 'REVIEW') {
      cls = 'context';
      label = 'REVIEW';
      heading = 'Строгий режим: context изменился';
      body = 'Hard-пробы совпали, но включён строгий режим и изменились context-пробы. Проверьте, что это ожидаемо (окно, зум, монитор, разрешения).';
    } else if (result.verdict === 'STABLE_CONTEXT_CHANGED') {
      cls = 'context';
      label = 'STABLE / CONTEXT';
      heading = 'Hard стабилен, context изменился';
      body = 'Это нормально, если вы меняли окно, зум, монитор, сеть или разрешения. Если нет — разберите context-изменения.';
    }

    panel.classList.add(cls);
    badge.textContent = label;
    title.textContent = heading;
    text.textContent = body;
    mini.textContent = 'hard ' + result.hard.pct + '% (' + result.hard.same + '/' + result.hard.denominator + ')' +
      ' · context ' + result.context.pct + '%' +
      ' · шум ' + (current.noise || []).length +
      ' · ' + shortHash(current.hardHash, 12);
  }

  function renderDiff(base, current) {
    var list = $('diffList');
    var hint = $('diffHint');
    list.textContent = '';

    if (!current) {
      hint.textContent = 'Снимите первый слепок.';
      return;
    }
    if (!base || base.id === current.id) {
      hint.textContent = 'Это база. Снимите второй слепок, чтобы увидеть расхождения.';
      return;
    }

    var result = state.lastCompare || window.FPAudit.compare(base, current, { strict: state.strict });
    var rows = (result.hardMissing || []).concat(result.hardBad).concat(result.contextBad);
    if (!rows.length) {
      hint.textContent = 'Расхождений нет: все hard и context пробы совпали.';
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Чисто. Следующий шаг — ещё один холодный старт.';
      list.appendChild(empty);
      return;
    }

    hint.textContent = 'Hard: ' + result.hardBad.length + (result.hardMissing && result.hardMissing.length ? ' · нет в базе: ' + result.hardMissing.length : '') +
      ' · context: ' + result.contextBad.length +
      '. Жёлтые context-изменения допустимы, если объяснимы.';

    var header = document.createElement('div');
    header.className = 'change change-head';
    var h1 = document.createElement('div'); h1.textContent = 'Проба';
    var h2 = document.createElement('div'); h2.textContent = 'База';
    var h3 = document.createElement('div'); h3.textContent = 'Сейчас';
    header.appendChild(h1);
    header.appendChild(h2);
    header.appendChild(h3);
    list.appendChild(header);

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var item = document.createElement('div');
      item.className = 'change';

      var name = document.createElement('div');
      name.className = 'pid';
      name.textContent = row.id;
      var small = document.createElement('small');
      small.textContent = row.title + ' · ' + (STATUS[row.status] ? STATUS[row.status].label : row.status);
      name.appendChild(small);

      var oldValue = document.createElement('div');
      oldValue.className = 'old';
      oldValue.textContent = row.base ? valuePreview(row.base) : '—';

      var newValue = document.createElement('div');
      newValue.className = 'new';
      newValue.textContent = row.cur ? valuePreview(row.cur) : '—';

      item.appendChild(name);
      item.appendChild(oldValue);
      item.appendChild(newValue);
      list.appendChild(item);
    }
  }

  function renderProbes(base, current) {
    var container = $('probeList');
    container.textContent = '';
    if (!current) {
      $('probeCount').textContent = '0 / 0';
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Пока нет слепков.';
      container.appendChild(empty);
      return;
    }

    var result = (base && base.id !== current.id)
      ? (state.lastCompare || window.FPAudit.compare(base, current, { strict: state.strict }))
      : null;
    var statusById = {};
    if (result) {
      for (var r = 0; r < result.rows.length; r++) statusById[result.rows[r].id] = result.rows[r].status;
    }

    var search = state.search.trim().toLowerCase();
    var groups = {};
    var order = [];
    var shown = 0;
    var total = 0;

    var definitions = window.FPAudit.probes;
    for (var i = 0; i < definitions.length; i++) {
      var definition = definitions[i];
      var probe = current.probes[definition.id];
      if (!probe) continue;
      total++;

      var isSkipped = !!(probe.s || (probe.v && typeof probe.v === 'object' && probe.v.skipped));
      var status = statusById[definition.id] || (probe.ok ? (isSkipped ? 'skipped' : (probe.n ? 'noisy' : 'same')) : 'absent');
      if (state.filter === 'hard' && definition.cls !== 'hard') continue;
      if (state.filter === 'changes' && ['changed', 'noisy', 'missing'].indexOf(status) === -1) continue;
      if (state.filter === 'noisy' && status !== 'noisy') continue;
      if (search && definition.id.toLowerCase().indexOf(search) === -1 &&
          definition.title.toLowerCase().indexOf(search) === -1) continue;

      if (!groups[definition.group]) {
        groups[definition.group] = [];
        order.push(definition.group);
      }
      groups[definition.group].push({ definition: definition, probe: probe, status: status });
      shown++;
    }

    $('probeCount').textContent = shown + ' / ' + total;
    if (!shown) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Под фильтр ничего не попало.';
      container.appendChild(empty);
      return;
    }

    for (var g = 0; g < order.length; g++) {
      var groupId = order[g];
      var group = document.createElement('div');
      group.className = 'probe-group';
      var heading = document.createElement('h3');
      heading.textContent = window.FPAudit.groups[groupId] || groupId;
      var count = document.createElement('span');
      count.textContent = ' · ' + groups[groupId].length;
      heading.appendChild(count);
      group.appendChild(heading);

      for (var k = 0; k < groups[groupId].length; k++) {
        group.appendChild(buildProbe(groups[groupId][k]));
      }
      container.appendChild(group);
    }
  }

  function buildProbe(item) {
    var definition = item.definition;
    var probe = item.probe;
    var info = STATUS[item.status] || { label: item.status, cls: '' };
    var details = document.createElement('details');
    details.className = 'probe ' + info.cls;

    var summary = document.createElement('summary');

    var dot = document.createElement('span');
    dot.className = 'dot';

    var name = document.createElement('span');
    name.className = 'pid';
    name.textContent = definition.id;
    var title = document.createElement('small');
    title.textContent = definition.title + ' · ' + definition.cls + ' · ' + info.label;
    name.appendChild(title);

    var value = document.createElement('span');
    value.className = 'val';
    value.textContent = valuePreview(probe);

    var hash = document.createElement('span');
    hash.className = 'hash';
    hash.textContent = probe.h ? probe.h.slice(0, 10) : '—';

    summary.appendChild(dot);
    summary.appendChild(name);
    summary.appendChild(value);
    summary.appendChild(hash);

    var body = document.createElement('div');
    body.className = 'body';
    var meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = 'class=' + definition.cls +
      ' · status=' + item.status +
      ' · ok=' + probe.ok +
      ' · noise=' + !!probe.n +
      ' · ms=' + probe.ms +
      ' · hash=' + (probe.h || '—') +
      (probe.err ? ' · error=' + probe.err : '');
    var pre = document.createElement('pre');
    pre.textContent = Object.prototype.hasOwnProperty.call(probe, 'v')
      ? formatValue(probe.v, 4000)
      : ('[redacted value · hash=' + (probe.h || '—') + ']');
    body.appendChild(meta);
    body.appendChild(pre);

    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  function renderHistory(base) {
    var list = $('historyList');
    list.textContent = '';
    if (!state.snapshots.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'История пуста. Снимите первый слепок.';
      list.appendChild(empty);
      return;
    }

    for (var i = state.snapshots.length - 1; i >= 0; i--) {
      var snapshot = state.snapshots[i];
      var isBase = base && snapshot.id === base.id;
      var item = document.createElement('div');
      item.className = 'history-item' + (isBase ? ' base' : '');

      var title = document.createElement('div');
      title.className = 'title';
      title.textContent = snapshot.label || 'Без метки';
      var sub = document.createElement('small');
      sub.textContent = (snapshot.profile || 'default') + ' · ' + formatDate(snapshot.createdAt) +
        ' · ' + (snapshot.counts ? snapshot.counts.hard : 0) + ' hard';
      title.appendChild(sub);

      var hash = document.createElement('div');
      hash.className = 'h';
      hash.textContent = 'hard ' + shortHash(snapshot.hardHash, 12);
      hash.title = snapshot.hardHash || '';

      var score = document.createElement('div');
      score.className = 'score';
      if (isBase) {
        score.textContent = 'BASE';
        score.classList.add('ok');
      } else if (base) {
        var result = window.FPAudit.compare(base, snapshot, { strict: state.strict });
        score.textContent = result.hard.pct + '% · ' + result.verdict;
        score.classList.add(result.hard.pct === 100 ? 'ok' : result.hard.pct >= 95 ? 'warn' : 'bad');
      } else {
        score.textContent = '—';
      }

      var ops = document.createElement('div');
      ops.className = 'ops';
      if (!isBase) {
        var makeBase = document.createElement('button');
        makeBase.type = 'button';
        makeBase.className = 'small ghost';
        makeBase.textContent = 'В базу';
        makeBase.addEventListener('click', function (id) {
          return function () {
            state.baselineId = id;
            saveStore();
            renderAll();
            toast('База обновлена.');
          };
        }(snapshot.id));
        ops.appendChild(makeBase);
      }
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'small danger';
      remove.textContent = 'Удалить';
      remove.addEventListener('click', function (id) {
        return function () { removeSnapshot(id); };
      }(snapshot.id));
      ops.appendChild(remove);

      item.appendChild(title);
      item.appendChild(hash);
      item.appendChild(score);
      item.appendChild(ops);
      list.appendChild(item);
    }
  }

  // ------------------------------------------------------------------ actions

  async function takeSnapshot() {
    if (state.busy) return;
    if (!window.FPAudit) {
      toast('fp-core.js не загрузился.', true);
      return;
    }

    var profile = $('profileInput').value.trim() || 'default';
    var label = $('labelInput').value.trim() || ('слепок ' + (state.snapshots.length + 1));
    var doubleRun = $('doubleRun').checked;

    state.profile = profile;
    state.doubleRun = doubleRun;
    state.busy = true;
    setBusy(true);
    showProgress(true);
    $('progressBar').style.width = '0%';
    $('progressText').textContent = 'Подготовка…';

    try {
      var snapshot = await window.FPAudit.run({
        label: label,
        profile: profile,
        doubleRun: doubleRun,
        onProgress: function (event) {
          var phaseOffset = event.phase === 'pass2' ? event.total : 0;
          var total = doubleRun ? event.total * 2 : event.total;
          var done = event.done + phaseOffset;
          var percent = Math.round((done / total) * 100);
          $('progressBar').style.width = percent + '%';
          $('progressText').textContent = 'Проба ' + event.done + '/' + event.total +
            ' · ' + event.id + ' · проход ' + (event.phase === 'pass2' ? '2/2' : '1/2');
        }
      });

      snapshot.profile = profile;
      state.snapshots.push(snapshot);
      state.snapshots.sort(byDate);
      if (state.snapshots.length > MAX_SNAPSHOTS) {
        state.snapshots = state.snapshots.slice(state.snapshots.length - MAX_SNAPSHOTS);
      }
      if (!state.baselineId) state.baselineId = snapshot.id;
      state.lastCompare = null;
      saveStore();
      $('labelInput').value = '';
      renderAll();
      toast('Слепок сохранён. hard=' + snapshot.hardHash.slice(0, 12) +
        (snapshot.noise.length ? ' · шумных проб: ' + snapshot.noise.length : ''));
    } catch (error) {
      console.error(error);
      toast('Ошибка слепка: ' + (error.message || error), true);
    } finally {
      state.busy = false;
      setBusy(false);
      showProgress(false);
    }
  }

  function setBusy(busy) {
    var ids = ['takeBtn', 'exportBtn', 'importBtn', 'copyBtn', 'clearBtn', 'baselineSelect', 'strictMode', 'doubleRun'];
    for (var i = 0; i < ids.length; i++) {
      var element = $(ids[i]);
      if (element) element.disabled = busy;
    }
    $('takeBtn').textContent = busy ? 'Считаю…' : 'Снять слепок';
  }

  function showProgress(visible) {
    $('progress').hidden = !visible;
  }

  function removeSnapshot(id) {
    var snapshot = null;
    for (var i = 0; i < state.snapshots.length; i++) {
      if (state.snapshots[i].id === id) { snapshot = state.snapshots[i]; break; }
    }
    if (!snapshot) return;
    if (!confirm('Удалить слепок «' + (snapshot.label || 'без метки') + '»? Это действие нельзя отменить.')) return;
    state.snapshots = state.snapshots.filter(function (item) { return item.id !== id; });
    if (state.baselineId === id) state.baselineId = state.snapshots.length ? state.snapshots[0].id : null;
    state.lastCompare = null;
    saveStore();
    renderAll();
    toast('Слепок удалён.');
  }

  function clearAll() {
    if (!state.snapshots.length) return;
    if (!confirm('Удалить ВСЕ слепки из этого браузера? Сначала сделайте экспорт, если они нужны.')) return;
    state.snapshots = [];
    state.baselineId = null;
    state.lastCompare = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    renderAll();
    toast('История очищена.');
  }

  function exportJson() {
    if (!state.snapshots.length) {
      toast('Нет слепков для экспорта.', true);
      return;
    }
    var payload = {
      schema: 1,
      app: 'FP Stability Auditor',
      version: window.FPAudit.version,
      exportedAt: new Date().toISOString(),
      baselineId: state.baselineId,
      strict: state.strict,
      snapshots: state.snapshots
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'fp-audit-' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('Экспортировано слепков: ' + state.snapshots.length);
  }

  function importJson(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var snapshots = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.snapshots)
              ? data.snapshots
              : (data && data.checks && Array.isArray(data.checks.runs) ? data.checks.runs : null));
        if (!snapshots) throw new Error('ожидался объект с массивом snapshots или checks.runs');
        var reportProfile = data && data.environment && data.environment.mode
          ? 'benchmark-' + data.environment.mode
          : null;
        var valid = snapshots.filter(function (snapshot) {
          return snapshot && typeof snapshot.id === 'string' && snapshot.probes && typeof snapshot.probes === 'object';
        }).map(function (snapshot) {
          if (!snapshot.profile && reportProfile) {
            return Object.assign({}, snapshot, { profile: reportProfile });
          }
          return snapshot;
        });
        if (!valid.length) throw new Error('в файле нет валидных слепков');

        var map = {};
        state.snapshots.forEach(function (snapshot) { map[snapshot.id] = snapshot; });
        valid.forEach(function (snapshot) { map[snapshot.id] = snapshot; });
        state.snapshots = Object.keys(map).map(function (key) { return map[key]; }).sort(byDate);
        if (state.snapshots.length > MAX_SNAPSHOTS) {
          state.snapshots = state.snapshots.slice(state.snapshots.length - MAX_SNAPSHOTS);
        }
        if (!state.baselineId && state.snapshots.length) state.baselineId = state.snapshots[0].id;
        if (data && typeof data.baselineId === 'string' &&
            state.snapshots.some(function (snapshot) { return snapshot.id === data.baselineId; })) {
          state.baselineId = data.baselineId;
        }
        state.lastCompare = null;
        saveStore();
        renderAll();
        toast('Импортировано слепков: ' + valid.length);
      } catch (error) {
        toast('Импорт не удался: ' + (error.message || error), true);
      }
    };
    reader.onerror = function () { toast('Не удалось прочитать файл.', true); };
    reader.readAsText(file);
  }

  function buildMarkdownReport() {
    var base = baselineSnapshot();
    var current = currentSnapshot();
    if (!base || !current || base.id === current.id) {
      return '# FP stability report\n\nНет второго слепка для сравнения.\n';
    }
    var result = window.FPAudit.compare(base, current, { strict: state.strict });
    var lines = [];
    lines.push('# FP stability report');
    lines.push('');
    lines.push('- Профиль: `' + (current.profile || 'default') + '`');
    lines.push('- База: ' + (base.label || 'без метки') + ' · ' + base.createdAt + ' · `' + base.hardHash + '`');
    lines.push('- Текущий: ' + (current.label || 'без метки') + ' · ' + current.createdAt + ' · `' + current.hardHash + '`');
    lines.push('- Вердикт: **' + result.verdict + '**');
    lines.push('- Hard: ' + result.hard.pct + '% (' + result.hard.same + '/' + result.hard.denominator + ')');
    lines.push('- Context: ' + result.context.pct + '% (' + result.context.same + '/' + result.context.denominator + ')');
    lines.push('- Шумных проб: ' + (current.noise || []).length);
    lines.push('');
    if ((result.hardMissing && result.hardMissing.length) || result.hardBad.length || result.contextBad.length) {
      lines.push('## Изменения');
      lines.push('');
      lines.push('| Класс | Проба | Статус | База | Текущее |');
      lines.push('|---|---|---|---|---|');
      var rows = (result.hardMissing || []).concat(result.hardBad).concat(result.contextBad);
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        lines.push('| ' + row.cls + ' | `' + row.id + '` | ' + row.status + ' | ' +
          mdCell(valuePreview(row.base)) + ' | ' + mdCell(valuePreview(row.cur)) + ' |');
      }
      lines.push('');
    }
    if (result.hardSkipped && result.hardSkipped.length) {
      lines.push('## Пропущенные hard-пробы');
      lines.push('');
      for (var s = 0; s < result.hardSkipped.length; s++) {
        lines.push('- `' + result.hardSkipped[s].id + '` (' + valuePreview(result.hardSkipped[s].cur) + ')');
      }
      lines.push('');
    }
    if ((current.noise || []).length) {
      lines.push('## Шумные пробы');
      lines.push('');
      for (var n = 0; n < current.noise.length; n++) lines.push('- `' + current.noise[n] + '`');
      lines.push('');
    }
    lines.push('## Как воспроизвести');
    lines.push('');
    lines.push('1. Полностью закрыть браузер, запустить снова с тем же профилем и окном.');
    lines.push('2. Открыть локальный чекер и снять слепок.');
    lines.push('3. Сравнить hard-пробы; hard должен быть 100%, шум — 0.');
    return lines.join('\n');
  }

  function mdCell(value) {
    return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  function copyReport() {
    var markdown = buildMarkdownReport();
    function fallback() {
      var textarea = document.createElement('textarea');
      textarea.value = markdown;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); toast('Отчёт скопирован.'); }
      catch (error) { toast('Не удалось скопировать. Откройте консоль и скопируйте вручную.', true); }
      textarea.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(markdown).then(function () {
        toast('Отчёт скопирован в буфер обмена.');
      }, fallback);
    } else {
      fallback();
    }
  }

  // ------------------------------------------------------------------ init

  function bindEvents() {
    $('takeBtn').addEventListener('click', takeSnapshot);
    $('exportBtn').addEventListener('click', exportJson);
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (event) {
      importJson(event.target.files && event.target.files[0]);
      event.target.value = '';
    });
    $('copyBtn').addEventListener('click', copyReport);
    $('clearBtn').addEventListener('click', clearAll);

    $('baselineSelect').addEventListener('change', function (event) {
      state.baselineId = event.target.value || null;
      state.lastCompare = null;
      saveStore();
      renderAll();
    });

    $('strictMode').addEventListener('change', function (event) {
      state.strict = event.target.checked;
      state.lastCompare = null;
      saveStore();
      renderAll();
    });

    $('doubleRun').addEventListener('change', function (event) {
      state.doubleRun = event.target.checked;
      saveStore();
    });

    $('profileInput').addEventListener('change', function (event) {
      state.profile = event.target.value.trim() || 'default';
      saveStore();
    });

    $('probeSearch').addEventListener('input', function (event) {
      state.search = event.target.value;
      renderProbes(baselineSnapshot(), currentSnapshot());
    });

    var filters = document.querySelectorAll('[data-filter]');
    for (var i = 0; i < filters.length; i++) {
      filters[i].addEventListener('click', function (event) {
        state.filter = event.currentTarget.getAttribute('data-filter');
        for (var j = 0; j < filters.length; j++) filters[j].classList.remove('active');
        event.currentTarget.classList.add('active');
        renderProbes(baselineSnapshot(), currentSnapshot());
      });
    }

    $('statHash').addEventListener('click', function () {
      var current = currentSnapshot();
      if (!current || !current.hardHash) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(current.hardHash).then(function () {
          toast('hard hash скопирован.');
        }, function () { toast(current.hardHash); });
      } else {
        toast(current.hardHash);
      }
    });
  }

  function init() {
    loadStore();
    $('profileInput').value = state.profile;
    $('strictMode').checked = state.strict;
    $('doubleRun').checked = state.doubleRun;
    $('statHash').title = 'Нажмите, чтобы скопировать hard hash';
    bindEvents();
    renderAll();

    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('autorun') === '1') {
        setTimeout(takeSnapshot, 120);
      }
    } catch (error) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
