// The readings loop (a port of the app's ReadingsLoop.tsx) and the nav underline.
(() => {
  // one reading per 5 s window; null = window skipped for movement. Ends where it starts, so it loops.
  const RAW = [0.22, 0.18, 0.25, 0.2, 0.24, 0.21, 0.27, 0.23, 0.26, 0.22, 0.2, 0.24,
    0.28, 0.34, 0.42, 0.5, 0.93, 0.58, 0.66, null, 0.78, 0.86, 0.9, 0.88, 0.84, 0.86, 0.88, 0.85,
    0.83, 0.86, 0.84, 0.82, 0.86, 0.84, 0.8, 0.72, 0.55, 0.42, 0.34, 0.26, 0.2, 0.18, 0.22, 0.19,
    0.24, 0.2, 0.22];
  // where a learner turn ends in that window: R a right answer, W a wrong or unsure one
  const TURN = RAW.map((_, i) => i === 3 || i === 11 ? 'R' : [8, 24, 29, 36, 44].includes(i) ? 'W' : '');
  const LOW = 0.38, HIGH = 0.65, ALPHA = 0.2, DWELL = 4, SHIELD = 18, TICK = 1500, W = 1000, TH = 96;
  const CAP = {
    advance1: 'Calm, and that answer was right. On to dots.',
    advance2: 'Still calm, right again. Now just the numbers.',
    retreat1: 'Still high, and that answer missed. Now it steps back to dots.',
    retreat0: 'Still too much. Back to things you can count.',
    arm: 'The load is high. The tutor slows down, and the picture waits for the learner to finish.',
    armed: 'Still high. A step back waits for the end of their turn.',
    shield: 'They got one right a moment ago, so the picture stays for now.',
    rightUnderLoad: 'High load, but that answer was right. The picture stays.',
    disarm: 'The load eased before their turn ended. Nothing to undo.',
    offer: 'Calm for a while. It may move on, once this one is answered.',
    offered: 'Still calm. It moves on as soon as this one is answered right.',
    notYet: 'Room to move on, but that answer missed. Not yet.',
    rising: 'Rising. The smoothed load has not crossed the line yet.',
    holdUp: 'Still high, but the picture just changed. Give it a moment.',
    holdDown: 'Easy again, but the picture just changed. Give it a moment.',
    patience: 'Calm once is not enough. It waits to be sure.',
    spike: 'One jumpy reading. Ignored.',
    skip: 'The hand moved, so that moment is skipped.',
    floor: 'As concrete as it gets. It stays here until things settle.',
    band: 'Comfortable. The lesson carries on.',
  };
  // events that take the caption line at once instead of waiting their turn
  const LOUD = /^(advance|retreat|arm$|offer|shield|rightUnderLoad|disarm)/;
  const ST = ['#FFC933', '#8A5A33', '#C9B6E8'], INK = ['#1B1B1B', '#FFFFFF', '#1B1B1B'], H = RAW.length + 1;
  const y = (v) => TH - 6 - v * (TH - 12), $ = (s) => document.querySelector(s);
  // the controller (EMA, band, patience, dwell) fires; the session decides, at a turn end, whether the picture moves
  const f = { ema: RAW[0], stage: 0, since: DWELL, below: 0, armed: false, offer: false, ok: false, w: 0, lastRight: -SHIELD };
  const move = (d) => {
    f.stage += d; f.since = 0; f.below = 0; f.armed = f.offer = f.ok = false;
    return (d > 0 ? 'advance' : 'retreat') + f.stage;
  };
  function step(r, turn) {
    f.w++;
    if (r === null) return 'skip';
    f.since++; f.ema = ALPHA * r + (1 - ALPHA) * f.ema;
    let ev = r > HIGH ? (r - f.ema > 0.3 ? 'spike' : 'rising') : 'band';
    if (f.ema >= HIGH) {
      f.below = 0;
      ev = f.stage === 0 ? 'floor' : f.since < DWELL ? 'holdUp' : 'retreat';
    } else if (f.ema <= LOW) {
      f.below++;
      ev = f.stage === 2 ? 'band' : f.below < 2 ? 'patience' : f.since < DWELL ? 'holdDown' : 'advance';
    } else f.below = 0;
    // the arm lasts only while the controller still sees overload
    if (f.armed && f.ema < HIGH) { f.armed = false; ev = 'disarm'; }
    if (ev === 'retreat' || ev === 'advance') {
      f.since = 0; f.below = 0;
      if (ev === 'advance') { f.armed = false; f.offer = true; ev = 'offer'; }
      else { ev = f.armed ? 'armed' : 'arm'; f.armed = true; f.offer = false; }
    } else if (f.armed) ev = 'armed';
    else if (f.offer && ev !== 'rising' && ev !== 'spike') ev = 'offered';
    if (!turn) return ev;
    // a turn end: the only moment the picture moves
    if (turn === 'R') { f.lastRight = f.w; f.ok = true; }
    if (f.armed) {
      if (turn === 'R') { f.armed = false; return 'rightUnderLoad'; }
      if (f.w - f.lastRight < SHIELD) return 'shield';
      return move(-1);
    }
    if (f.offer) return f.ok ? move(1) : 'notYet';
    return ev;
  }
  const hist = []; let k = 0;
  const push = () => {
    const i = k++ % RAW.length, ev = step(RAW[i], TURN[i]);
    hist.push({ ema: f.ema, ev, stage: f.stage, armed: f.armed });
    if (hist.length > H) hist.shift();
    return hist[hist.length - 1];
  };
  for (let i = 0; i < H; i++) push();   // a full, already-lived trace behind it

  const line = $('#rl-line'), pins = $('#rl-pins'), dot = $('#rl-dot'), val = $('#rl-val'), zone = $('#rl-zone'), arm = $('#rl-arm'), cap = $('#rl-cap');
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
  function draw(s) {
    trace();
    pins.innerHTML = hist.map((h, i) => moved(h.ev)
      ? `<span class="pin" style="left:${(i * 100 / (H - 1)).toFixed(2)}%;top:${y(h.ema).toFixed(1)}px;background:${ST[h.stage]};color:${INK[h.stage]}">${h.stage + 1}</span>` : '').join('');
    dot.style.top = y(s.ema).toFixed(1) + 'px';
    val.textContent = s.ema.toFixed(2);
    const z = s.ema > HIGH ? 'high' : s.ema < LOW ? 'easy' : 'keep';
    zone.textContent = z; zone.classList.toggle('high', z === 'high');
    arm.hidden = !s.armed;
    tabs.forEach((t, i) => t.classList.toggle('on', i === s.stage));
    arts.forEach((a, i) => a.classList.toggle('on', i === s.stage));
    // captions stay up long enough to read; a decision always takes the line
    if (LOUD.test(s.ev) || (++age >= 2 && cap.textContent !== CAP[s.ev])) { age = 0; cap.textContent = CAP[s.ev]; }
  }
  draw(push());
  // Reduce Motion: the loop rests on its opening frame.
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
