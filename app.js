(function () {
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var REG = { northamerica: 'https://app.connect.trimble.com', na: 'https://app.connect.trimble.com', europe: 'https://app21.connect.trimble.com',
              asia: 'https://app31.connect.trimble.com', australia: 'https://app32.connect.trimble.com' };
  var files = [], ready = false, period = 'day', who = 'all', typ = 'all', ctx = null, api = null;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var tag = function (t) { return '<span class="tag ' + t + '">' + (t === 'job' ? 'JOB' : 'CSV') + '</span>'; };
  var fmt = function (d) { return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };

  function status(m) { $('status').textContent = m || ''; }
  function surveyors() { var m = {}; files.forEach(function (f) { m[f.key] = f.who; });
    return Object.keys(m).map(function (k) { return { key: k, name: m[k] }; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  function list() { return files.filter(function (f) { return (who === 'all' || f.key === who) && (typ === 'all' || f.t === typ); }); }
  function monday(x) { var y = new Date(x); y.setHours(0, 0, 0, 0); y.setDate(y.getDate() - ((y.getDay() + 6) % 7)); return y; }
  function count(days, key, t) { var a = new Date(today); a.setDate(a.getDate() - days + 1);
    return files.filter(function (f) { return f.d >= a && (key === undefined || f.key === key) && (t === undefined || f.t === t); }).length; }
  var num = function (n) { return ready ? n : '–'; };

  function buckets() {
    var out = [], L = list(), i, s, e, m;
    if (period === 'day') { for (i = 13; i >= 0; i--) { s = new Date(today); s.setDate(s.getDate() - i); e = new Date(s); e.setDate(e.getDate() + 1); out.push({ l: s.getDate() + ' ' + MON[s.getMonth()], a: s, b: e }); } }
    else if (period === 'week') { m = monday(today); for (i = 11; i >= 0; i--) { s = new Date(m); s.setDate(s.getDate() - 7 * i); e = new Date(s); e.setDate(e.getDate() + 7); out.push({ l: 'Wk ' + s.getDate() + ' ' + MON[s.getMonth()], a: s, b: e }); } }
    else { for (i = 5; i >= 0; i--) { s = new Date(today.getFullYear(), today.getMonth() - i, 1); e = new Date(today.getFullYear(), today.getMonth() - i + 1, 1); out.push({ l: MON[s.getMonth()] + ' ' + s.getFullYear(), a: s, b: e }); } }
    out.forEach(function (o) { o.v = L.filter(function (f) { return f.d >= o.a && f.d < o.b; }).length; });
    return out;
  }

  function render() {
    var b = buckets(), mx = Math.max(1, Math.max.apply(null, b.map(function (o) { return o.v; })));
    $('chart').innerHTML = b.map(function (o) { return '<div class="col"><em>' + (ready ? o.v : '') + '</em><i data-h="' + (ready ? Math.round(o.v / mx * 100) : 0) + '"></i></div>'; }).join('');
    [].forEach.call(document.querySelectorAll('#chart i'), function (el) { el.style.height = el.getAttribute('data-h') + '%'; });
    $('labels').innerHTML = b.map(function (o) { return '<div><span>' + esc(o.l) + '</span></div>'; }).join('');
    var sv = surveyors(), cur = (sv.filter(function (x) { return x.key === who; })[0] || {}).name;
    $('cap').textContent = { day: 'Last 14 days', week: 'Last 12 weeks', month: 'Last 6 months' }[period] + ' · ' + (cur || 'all surveyors');

    $('kToday').textContent = num(count(1)); $('kWeek').textContent = num(count(7)); $('kMonth').textContent = num(count(30));
    $('kActive').textContent = num(sv.filter(function (s) { return count(30, s.key) > 0; }).length);

    $('tbody').innerHTML = !sv.length ? '<tr><td colspan="4" class="empty">No data yet.</td></tr>' :
      sv.map(function (s) { return '<tr><td>' + esc(s.name) + '</td><td>' + count(30, s.key, 'job') + '</td><td>' + count(30, s.key, 'csv') + '</td><td>' + count(30, s.key) + '</td></tr>'; }).join('') +
      '<tr><td><b>Total</b></td><td><b>' + count(30, undefined, 'job') + '</b></td><td><b>' + count(30, undefined, 'csv') + '</b></td><td><b>' + count(30) + '</b></td></tr>';

    var recent = files.slice().sort(function (a, c) { return c.d - a.d; }).slice(0, 6);
    $('recent').innerHTML = !recent.length ? '<li class="empty">No uploads to show.</li>' :
      recent.map(function (f) { return '<li><span>' + tag(f.t) + esc(f.name) + ' <small>· ' + esc(f.who) + '</small></span><small>' + fmt(f.d) + '</small></li>'; }).join('');

    $('csv').innerHTML = !sv.length ? '<div class="empty">' + (ready ? 'No job or CSV files found in this project.' : 'No data loaded.') + '</div>' :
      sv.map(function (s) {
        var mine = files.filter(function (f) { return f.key === s.key; }).sort(function (a, c) { return c.d - a.d; });
        var j = mine.filter(function (f) { return f.t === 'job'; }).length, c2 = mine.length - j;
        return '<details><summary><b>' + esc(s.name) + '</b><span>' + j + ' job · ' + c2 + ' CSV</span></summary><ul>' +
          mine.map(function (f) { return '<li><span>' + tag(f.t) + esc(f.name) + '<br><small>' + esc(f.path || '/') + '</small></span><small>' + fmt(f.d) + '</small></li>'; }).join('') + '</ul></details>';
      }).join('');

    var sel = $('sel');
    sel.innerHTML = '<option value="all">All surveyors</option>' + sv.map(function (s) { return '<option value="' + esc(s.key) + '">' + esc(s.name) + '</option>'; }).join('');
    sel.value = who;
  }

  function get(base, token, path) {
    return fetch(base + path, { headers: { Authorization: 'Bearer ' + token } }).then(function (r) {
      if (r.ok) return r.json();
      return r.text().then(function (t) {
        var m = ''; try { var o = JSON.parse(t); m = o.message || o.error_description || o.error || ''; } catch (x) { m = ''; }
        throw new Error('Trimble Connect API returned ' + r.status + (m ? ' (' + String(m).slice(0, 100) + ')' : ''));
      });
    });
  }
  function clean(t) { return String(t || '').replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim(); }
  function tokenInfo(t) { return ' [token: ' + String(t || '').length + ' chars' + (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(t || '') ? ', JWT format' : ', not JWT format') + ']'; }

  var BASES = ['https://app.connect.trimble.com', 'https://app21.connect.trimble.com', 'https://app31.connect.trimble.com', 'https://app32.connect.trimble.com'];
  function findBase(token, p) {
    var first = REG[String(p.location || '').toLowerCase()] || REG.na, errs = [];
    var all = [first].concat(BASES.filter(function (x) { return x !== first; }));
    function next(i) {
      if (i >= all.length) return Promise.reject(new Error('No Trimble region accepted the request (' + errs.join('; ') + ')'));
      var b = all[i] + '/tc/api/2.0';
      return get(b, token, '/projects/' + p.id).then(function (pr) { return { base: b, pr: pr }; })
        .catch(function (e) { errs.push(all[i].replace('https://', '').replace('.connect.trimble.com', '') + ' → ' + e.message.replace('Trimble Connect API returned ', '')); return next(i + 1); });
    }
    return next(0);
  }

  function load(API, token) {
    token = clean(token);
    status('Loading files from Trimble Connect…');
    return API.project.getCurrentProject().then(function (p) {
      return findBase(token, p).then(function (r) {
        var base = r.base, queue = [], found = [];
        if (!r.pr.rootId) throw new Error('Project root folder not found');
        queue.push({ id: r.pr.rootId, path: '' });
        function worker() {
          if (!queue.length) return Promise.resolve();
          var f = queue.shift();
          return get(base, token, '/folders/' + f.id + '/items').then(function (items) {
            (items || []).forEach(function (it) {
              var n = it.name || '';
              if (it.type === 'FOLDER') { queue.push({ id: it.id, path: f.path + '/' + it.name }); return; }
              var t = /\.(job|jxl)$/i.test(n) ? 'job' : /\.csv$/i.test(n) ? 'csv' : null;
              if (!t) return;
              var u = it.createdBy || it.modifiedBy || {};
              var nm = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unknown';
              found.push({ name: n, t: t, path: f.path, who: nm, key: u.id || u.email || nm, d: new Date(it.createdOn || it.modifiedOn || Date.now()) });
            });
          }).then(worker);
        }
        return Promise.all([worker(), worker(), worker(), worker()]).then(function () {
          files = found; ready = true; status(''); render();
        });
      });
    }).catch(function (e) { ready = false; status('Could not load data: ' + e.message + tokenInfo(token)); render(); });
  }

  function start() {
    if (window.parent === window || !window.TrimbleConnectWorkspace) {
      status('Open this page inside Trimble Connect (Project Settings → Apps & Capabilities) to load your project’s uploads.');
      return;
    }
    var API = null;
    TrimbleConnectWorkspace.connect(window.parent, function (ev, args) {
      if (ev === 'extension.accessToken' && args && typeof args.data === 'string' && !/^(pending|denied)$/i.test(args.data) && API) { ctx = args.data; load(API, ctx); }
    }, 30000).then(function (a) {
      API = a; api = a;
      a.ui.setMenu({ title: 'Upload Monitor', icon: new URL('icon.png', location.href).href, command: 'sbd_home' });
      a.ui.setActiveMenuItem('sbd_home');
      return a.extension.requestPermission('accesstoken');
    }).then(function (t) {
      if (t === 'pending') status('Please approve access in the Trimble Connect message to load your data.');
      else if (t === 'denied') status('Access was denied. Reset consent in the extension settings to load data.');
      else if (typeof t === 'string' && t.length > 20) { ctx = t; load(API, t); }
    }).catch(function (e) { status('Could not connect to Trimble Connect: ' + e.message); });
  }

  $('sel').onchange = function () { who = this.value; render(); };
  $('typ').onchange = function () { typ = this.value; render(); };
  $('seg').onclick = function (e) { var p = e.target.getAttribute('data-p'); if (!p) return; period = p;
    [].forEach.call(this.children, function (b) { b.className = b.getAttribute('data-p') === p ? 'on' : ''; }); render(); };
  $('refresh').onclick = function () { if (api && ctx) load(api, ctx); };
  render(); start();
})();
