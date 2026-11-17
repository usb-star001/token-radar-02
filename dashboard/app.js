// Token Radar dashboard (radar-3): renders window.RADAR, no network, no framework.
(function () {
  var D = window.RADAR;
  var $ = function (id) { return document.getElementById(id); };
  var state = { q: '', cat: '', chain: '', minTvl: 0, verdict: '', watch: false, live: false, sortKey: 'rank', sortDir: 1 };

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
    return '$' + Math.round(n);
  }
  function moneyFull(n) {
    if (n === null || n === undefined) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days < 365) return Math.round(days / 30.4) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- header numbers -------------------------------------------------
  $('topmeta').textContent = 'Snapshot ' + D.as_of + ' · DefiLlama protocol index · Model ' + D.model_version;
  $('r2pct').textContent = Math.round(D.fit_r2 * 100) + '%';
  $('compsN').textContent = D.comps_kept;
  $('bandLow').textContent = D.band_low.toFixed(2) + '×';
  $('bandHigh').textContent = D.band_high.toFixed(2) + '×';
  $('setAside').textContent = D.comps_set_aside;
  $('tradedN').textContent = D.comps_total;

  var looGain = Math.round((1 - D.loo_curve / D.loo_flat) * 100);
  var wfGain = Math.round((1 - D.walkforward_curve / D.walkforward_flat) * 100);
  $('stats').innerHTML =
    '<div class="stat"><span class="k">The fit</span><span class="v">ln(mcap) = ' + D.fit_intercept.toFixed(3) + ' + ' + D.fit_slope.toFixed(3) + ' · ln(TVL)</span><span class="s">R² ' + D.fit_r2.toFixed(2) + ' on ' + D.comps_kept + ' traded tokens</span></div>' +
    '<div class="stat"><span class="k">Leave-one-out</span><span class="v">' + D.loo_curve.toFixed(2) + ' vs ' + D.loo_flat.toFixed(2) + ' flat</span><span class="s">' + looGain + '% better than a flat multiple</span></div>' +
    '<div class="stat"><span class="k">Walk-forward</span><span class="v">' + D.walkforward_curve.toFixed(2) + ' vs ' + D.walkforward_flat.toFixed(2) + ' flat</span><span class="s">' + D.walkforward_train + ' older tokens fit, ' + D.walkforward_test + ' newer tested · ' + wfGain + '% better</span></div>' +
    '<div class="stat"><span class="k">Verdicts</span><span class="v"><b class="f">FARM ' + D.verdict_counts.FARM + '</b> · <b class="t">THIN ' + D.verdict_counts.THIN + '</b> · <b class="s2">SKIP ' + D.verdict_counts.SKIP + '</b></span><span class="s">of ' + D.board_size + ' rows · watchlist ' + D.watchlist_size + ' / ' + D.watchlist_size + '</span></div>';
  $('verdicts').innerHTML =
    '<span class="chip f">FARM — worth farming even at the low end: ' + D.verdict_counts.FARM + '</span>' +
    '<span class="chip t">THIN — pays only at the central estimate: ' + D.verdict_counts.THIN + '</span>' +
    '<span class="chip s">SKIP — no deposit up to $1,000 clears the cost: ' + D.verdict_counts.SKIP + '</span>';

  // ---- spotlight ------------------------------------------------------
  $('spotcards').innerHTML = D.rows.slice(0, 5).map(function (r) {
    return '<button class="card" data-slug="' + esc(r.slug) + '"><span class="rn">#' + r.rank + '</span>' +
      '<span class="nm">' + esc(r.name) + '</span><span class="iv">' + money(r.implied_value_usd) + ' implied</span>' +
      '<span class="mt">TVL ' + money(r.tvl_usd) + ' · ' + esc(r.category || '—') + '</span>' +
      '<span class="vd vd-' + r.verdict + '">' + r.verdict + '</span></button>';
  }).join('');

  // ---- filter options --------------------------------------------------
  var cats = {}, chains = {};
  D.rows.forEach(function (r) { if (r.category) cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
  Object.keys(cats).sort().forEach(function (c) { $('cat').appendChild(new Option(c, c)); });
  Object.keys(chains).sort().forEach(function (c) { $('chain').appendChild(new Option(c, c)); });

  // ---- method + blind tests + comps ------------------------------------
  $('methodBody').innerHTML =
    '<p>The price is one curve, fitted on the snapshot&rsquo;s own traded tokens: ' +
    '<strong>ln(market cap) = ' + D.fit_intercept.toFixed(3) + ' + ' + D.fit_slope.toFixed(3) + ' &times; ln(TVL)</strong>, ' +
    'fitted on ' + D.comps_kept + ' tokens that already trade (R&sup2; ' + D.fit_r2.toFixed(2) + '). ' +
    'A protocol&rsquo;s implied value is the curve&rsquo;s reading at its TVL. The band is what traded tokens ' +
    'actually fetched against the curve: the middle half runs ' + D.band_low.toFixed(2) + '&times; to ' + D.band_high.toFixed(2) + '&times; it. ' +
    'The curve survives two blind tests: leave-one-out (' + D.loo_curve.toFixed(2) + ' against ' + D.loo_flat.toFixed(2) + ' for a flat ' +
    'median multiple) and walk-forward — fitted on the ' + D.walkforward_train + ' tokens listed before ' + D.walkforward_split +
    ', tested on the ' + D.walkforward_test + ' listed after (' + D.walkforward_curve.toFixed(2) + ' against ' + D.walkforward_flat.toFixed(2) + ').</p>' +
    '<p>The comparables are the ' + D.comps_total + ' tokens that record a market cap and a TVL. ' + D.comps_set_aside +
    ' are set aside by a rule that names no protocol: a versioned pool, whose token is its parent&rsquo;s, or a ' +
    'market cap more than a hundredfold from its TVL either way — a prediction-market token whose TVL is not ' +
    'deposits, a token shared across versions, or a token that has stopped trading.</p>';
  $('blindTable').querySelector('tbody').innerHTML = D.blind_tests.map(function (t) {
    return '<tr><td>' + esc(t.model) + '</td><td>' + t.loo.toFixed(3) + '</td><td>' + (t.kept ? '<b>Kept</b>' : 'Rejected') + '</td></tr>';
  }).join('');
  $('compsTable').querySelector('tbody').innerHTML = D.comps.map(function (c) {
    return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.category || '—') + '</td><td>' + money(c.tvl_usd) + '</td><td>' + money(c.mcap_usd) + '</td><td>' + c.ratio.toFixed(3) + '</td></tr>';
  }).join('');

  // ---- table ------------------------------------------------------------
  function rowsFiltered() {
    var list = D.rows.filter(function (r) {
      if (state.watch && !r.watchlist) return false;
      if (state.verdict && r.verdict !== state.verdict) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.minTvl) return false;
      if (state.q) {
        var q = state.q.toLowerCase();
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    var k = state.sortKey, d = state.sortDir;
    list.sort(function (a, b) {
      var va = a[k], vb = b[k];
      if (typeof va === 'string') return va.localeCompare(vb) * d;
      return ((va === null ? -1 : va) - (vb === null ? -1 : vb)) * d;
    });
    return list;
  }

  function renderTable() {
    var body = $('rows');
    if (state.live) {
      var live = D.live.slice().sort(function (a, b) { return (b.mcap_usd || 0) - (a.mcap_usd || 0); });
      body.innerHTML = live.map(function (r) {
        return '<tr><td>—</td><td><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || '—') + ' · ' + esc(r.chains.slice(0, 3).join(', ')) + '</span></td>' +
          '<td>' + money(r.tvl_usd) + '</td><td>' + pct(r.change_7d) + '</td><td>' + money(r.mcap_usd) + '</td>' +
          '<td>' + (r.ratio === null ? '—' : r.ratio.toFixed(3)) + '</td><td>—</td><td>—</td><td>—</td></tr>';
      }).join('');
      $('shown').textContent = 'Live-token protocols, biggest market cap first. These already trade: the board shows the market\u2019s own value, not a model\u2019s.';
      return;
    }
    var list = rowsFiltered();
    body.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b>' + (r.watchlist ? ' <span class="watch">WATCH</span>' : '') +
        '<span class="sub">' + esc(r.category || '—') + ' · ' + esc(r.chains.slice(0, 3).join(', ')) + '</span></td>' +
        '<td>' + money(r.tvl_usd) + '</td><td class="' + (r.change_7d > 0 ? 'up' : r.change_7d < 0 ? 'dn' : '') + '">' + pct(r.change_7d) + '</td>' +
        '<td><span class="bartrack"><span class="bar" style="width:' + Math.max(4, Math.round(100 * Math.log10(r.implied_value_usd + 1) / Math.log10(D.rows[0].implied_value_usd + 1))) + '%"></span></span>' + money(r.implied_value_usd) + '</td>' +
        '<td>' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) + '</td>' +
        '<td>' + money(r.yield_per_1000_usd) + '</td>' +
        '<td><span class="vd vd-' + r.verdict + '">' + r.verdict + '</span></td>' +
        '<td>$' + r.deposit_usd + '</td></tr>';
    }).join('');
    $('shown').textContent = list.length + ' rows shown · pre-token protocols, strongest implied value first. Select a row for its model breakdown and farm plan.';
  }

  // ---- detail -----------------------------------------------------------
  function openDetail(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    var near = r.nearest.map(function (c) {
      return '<tr><td>' + esc(c.name) + '</td><td>' + money(c.tvl_usd) + '</td><td>' + money(c.mcap_usd) + '</td><td>' + c.ratio.toFixed(3) + '</td></tr>';
    }).join('');
    var steps = r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var verdictNote = r.verdict === 'FARM'
      ? 'Even at the low end of the band this plan expects more than it costs.'
      : r.verdict === 'THIN'
        ? 'It pays at the central estimate, not at the low end — farm it only if you accept the wide band.'
        : 'No deposit up to $1,000 covers the plan\u2019s cost at the central estimate. The biggest implied values are the worst farms per dollar: their TVL is already huge.';
    $('detail').innerHTML =
      '<button class="close" id="detailClose" type="button">Close</button>' +
      '<p class="crumb">Rank ' + r.rank + ' of ' + D.rows.length + (r.watchlist ? ' · WATCHLIST' : '') + ' · rank usually #' + r.rank_low + '–#' + r.rank_high + ' across 200 refits</p>' +
      '<h2>' + esc(r.name) + ' <span class="vd vd-' + r.verdict + '">' + r.verdict + '</span></h2>' +
      '<p class="sub2">' + esc(r.category || '—') + ' on ' + esc(r.chains.join(', ')) + ' · listed ' + (r.listed_at || 'unknown') + ' (' + ageText(r.age_days) + ' with no token) · 7d ' + pct(r.change_7d) + '</p>' +
      '<div class="grid">' +
      '<div class="box"><h3>Implied value</h3>' +
      '<p class="big">' + money(r.implied_value_usd) + '</p>' +
      '<p>exp(' + D.fit_intercept.toFixed(3) + ' + ' + D.fit_slope.toFixed(3) + ' × ln(' + money(r.tvl_usd) + '))</p>' +
      '<p>Band: ' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) + ' (middle half of traded tokens against the curve)</p>' +
      '<p>Yield: ' + money(r.yield_per_1000_usd) + ' of airdrop pool per $1,000 farmed, at the central estimate.</p></div>' +
      '<div class="box"><h3>The farm math</h3>' +
      '<p>Deposit <b>$' + r.deposit_usd + '</b> · plan cost <b>' + moneyFull(r.plan_cost_usd) + '</b> (gas, $2 bridge, 5% a year on the capital)</p>' +
      '<p>Expected airdrop: <b>' + moneyFull(r.expected_central_usd) + '</b> central · <b>' + moneyFull(r.expected_low_usd) + '</b> at the low end</p>' +
      '<p>Break-even: the airdrop must be worth at least <b>' + moneyFull(r.plan_cost_usd) + '</b>.</p>' +
      '<p>' + verdictNote + '</p></div>' +
      '</div>' +
      '<div class="box"><h3>Priced off these traded tokens — nearest by size</h3>' +
      '<table class="mini"><thead><tr><th>Token</th><th>TVL</th><th>Market cap</th><th>Mcap / TVL</th></tr></thead><tbody>' + near + '</tbody></table></div>' +
      '<div class="box"><h3>Farm plan — 8 steps</h3><ol class="steps">' + steps + '</ol></div>';
    $('detail').hidden = false;
    document.body.classList.add('detail-open');
    window.scrollTo(0, 0);
    $('detailClose').addEventListener('click', closeDetail);
  }
  function closeDetail() {
    $('detail').hidden = true;
    document.body.classList.remove('detail-open');
    history.replaceState(null, '', location.pathname);
  }

  // ---- events -----------------------------------------------------------
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) { openDetail(tr.getAttribute('data-slug')); history.replaceState(null, '', '#detail=' + tr.getAttribute('data-slug')); }
  });
  $('spotcards').addEventListener('click', function (e) {
    var b = e.target.closest('[data-slug]');
    if (b) { openDetail(b.getAttribute('data-slug')); history.replaceState(null, '', '#detail=' + b.getAttribute('data-slug')); }
  });
  document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-sort');
      if (state.sortKey === k) state.sortDir = -state.sortDir;
      else { state.sortKey = k; state.sortDir = k === 'name' || k === 'verdict' ? 1 : -1; }
      renderTable();
    });
  });
  function bind(id, fn) { $(id).addEventListener('input', fn); $(id).addEventListener('change', fn); }
  bind('q', function () { state.q = $('q').value; renderTable(); });
  bind('cat', function () { state.cat = $('cat').value; renderTable(); });
  bind('chain', function () { state.chain = $('chain').value; renderTable(); });
  bind('minTvl', function () { state.minTvl = Number($('minTvl').value); renderTable(); });
  bind('verdict', function () { state.verdict = $('verdict').value; renderTable(); });
  bind('watch', function () { state.watch = $('watch').checked; renderTable(); });
  function setTab(live) {
    state.live = live;
    $('tabPre').classList.toggle('on', !live);
    $('tabLive').classList.toggle('on', live);
    $('board').classList.toggle('live', live);
    renderTable();
  }
  $('tabPre').addEventListener('click', function () { setTab(false); });
  $('tabLive').addEventListener('click', function () { setTab(true); });

  // ---- hash routing ------------------------------------------------------
  function route() {
    var h = location.hash || '';
    var m = h.match(/detail=([\w-]+)/);
    if (m) { openDetail(m[1]); return; }
    var v = h.match(/verdict=(FARM|THIN|SKIP)/);
    if (v) { state.verdict = v[1]; $('verdict').value = v[1]; }
    if (h.indexOf('live') >= 0) setTab(true);
  }
  renderTable();
  route();
  renderTable();
})();
