// The readings loop (a port of the app's ReadingsLoop.tsx) and the nav underline.
(() => {
  const RAW = [0.22, 0.18, 0.25, 0.2, 0.24, 0.21, 0.27, 0.23, 0.26, 0.3, 0.38, 0.44, 0.93, 0.46, 0.5, null, 0.62, 0.78, 0.88, 0.93, 0.9, 0.88, 0.84, 0.86, 0.8, 0.72, 0.55, 0.42, 0.34, 0.26, 0.2, 0.18, 0.22, 0.19, 0.24], LOW = 0.38, HIGH = 0.65, ALPHA = 0.2, DWELL = 4, TICK = 1500, W = 1000, TH = 96;
  const CAP = {"advance1": "Calm for a while — on to dots.", "advance2": "Still easy. Now just the numbers.", "retreat1": "The answer is still right, but the load climbed. Back to dots.", "retreat0": "Still too much. Back to things you can count.", "holdUp": "Still high — but it just changed. Give it a moment.", "holdDown": "Easy again — but it just changed. Give it a moment.", "patience": "Calm once is not enough. It waits to be sure.", "spike": "One jumpy reading. Ignored.", "skip": "The hand moved — that moment is skipped.", "floor": "As concrete as it gets. It stays here until things settle.", "band": "Comfortable. The lesson carries on."}, ST = ["#FFC933", "#8A5A33", "#C9B6E8"], INK = ["#1B1B1B", "#FFFFFF", "#1B1B1B"], H = RAW.length + 1;
  const y = (v) => TH - 6 - v * (TH - 12), $ = (s) => document.querySelector(s);
  const f = { ema: RAW[0], stage: 0, since: DWELL, below: 0 };
  function step(r) {
    if (r === null) return 'skip';
    f.since++; f.ema = ALPHA * r + (1 - ALPHA) * f.ema;
    if (f.ema >= HIGH) {
      f.below = 0;
      if (f.stage === 0) return 'floor';
      if (f.since < DWELL) return 'holdUp';
      f.stage--; f.since = 0; return 'retreat' + f.stage;
    }
    if (f.ema <= LOW) {
      f.below++;
      if (f.stage === 2) return 'band';
      if (f.below < 2) return 'patience';
      if (f.since < DWELL) return 'holdDown';
      f.stage++; f.since = 0; f.below = 0; return 'advance' + f.stage;
    }
    f.below = 0;
    return r > HIGH ? 'spike' : 'band';
  }
  const hist = []; let k = 0;
  const push = () => {
    const ev = step(RAW[k++ % RAW.length]);
    hist.push({ ema: f.ema, ev, stage: f.stage });
    if (hist.length > H) hist.shift();
    return hist[hist.length - 1];
  };
  for (let i = 0; i < H; i++) push();   // the same first frame the page was built with

  const line = $('#rl-line'), pins = $('#rl-pins'), dot = $('#rl-dot'), val = $('#rl-val'), zone = $('#rl-zone'), cap = $('#rl-cap');
  const tabs = document.querySelectorAll('.rtab'), arts = document.querySelectorAll('.rart > div');
  const moved = (ev) => /^(advance|retreat)/.test(ev);
  let age = 2;
  // the hand-drawn wobble lives in the points, fixed to the screen like the old SVG filter (filters render soft on phones)
  const wob = (x) => 0.75 * Math.sin(x * 0.031) + 0.45 * Math.sin(x * 0.083 + 1.3);
  const trace = () => {
    const pts = [], dx = W / (H - 1);
    hist.forEach((h, i) => {
      for (let t = 0; t < (i < H - 1 ? 1 : 0.01); t += 1 / 3) {
        const x = (i + t) * dx, v = t ? h.ema + (hist[i + 1].ema - h.ema) * t : h.ema;
        pts.push(x.toFixed(1) + ',' + (y(v) + wob(x)).toFixed(1));
      }
    });
    line.setAttribute('points', pts.join(' '));
  };
  trace();
  function draw(s) {
    trace();
    pins.innerHTML = hist.map((h, i) => moved(h.ev)
      ? `<span class="pin" style="left:${(i * 100 / (H - 1)).toFixed(2)}%;top:${y(h.ema).toFixed(1)}px;background:${ST[h.stage]};color:${INK[h.stage]}">${h.stage + 1}</span>` : '').join('');
    dot.style.top = y(s.ema).toFixed(1) + 'px';
    val.textContent = s.ema.toFixed(2);
    const z = s.ema > HIGH ? 'high' : s.ema < LOW ? 'easy' : 'keep';
    zone.textContent = z; zone.classList.toggle('high', z === 'high');
    tabs.forEach((t, i) => t.classList.toggle('on', i === s.stage));
    arts.forEach((a, i) => a.classList.toggle('on', i === s.stage));
    // captions stay up long enough to read; a stage change always takes the line
    if (moved(s.ev) || (++age >= 2 && cap.textContent !== CAP[s.ev])) { age = 0; cap.textContent = CAP[s.ev]; }
  }
  // Reduce Motion: the loop rests on its first frame, as in the app.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => draw(push()), TICK);

  const strip = $('.links'), links = strip.querySelectorAll('a');
  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => {
      const on = a.hash === '#' + e.target.id;
      a.classList.toggle('on', on);
      // on phones the links are a swipeable strip: bring the current one to its middle
      if (on && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2, behavior: smooth });
    });
  }), { rootMargin: '-45% 0px -54% 0px' });
  document.querySelectorAll('main section').forEach((s) => io.observe(s));
})();
