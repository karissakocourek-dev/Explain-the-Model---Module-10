// Starter app for GitHub Pages: three plain sections that show the right numbers.
// Replace each section's display with your own explainer; keep the numbers.
import * as m10 from "./m10.js";

const LABELS = { glucose: "Fasting glucose", sbp: "Blood pressure", fev1: "Lung function (FEV₁)" };
const state = { key: "glucose", person: "P1", values: null };
const $ = (id) => document.getElementById(id);
const fmt = (v, d = 1) => Number(v).toFixed(d);
const signed = (v, d = 1) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d);

function section() {
  const s = location.hash.slice(1);
  return ["linear", "forest", "boosting"].includes(s) ? s : "linear";
}

async function setup() {
  $("dataset").innerHTML = m10.DATASETS.map((k) => `<option value="${k}">${LABELS[k]}</option>`).join("");
  $("dataset").onchange = async (e) => { state.key = e.target.value; state.person = "P1"; await loadPeople(); render(); };
  $("person").onchange = (e) => { state.person = e.target.value; state.values = null; render(); };
  window.onhashchange = render;
  await loadPeople();
  render();
}

async function loadPeople() {
  const b = await m10.loadBundle(state.key);
  $("person").innerHTML = b.people.map((p) => `<option value="${p.id}">${p.label}: ${p.description}</option>`).join("");
  $("person").value = state.person;
  state.values = null;
}

async function render() {
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.hash === "#" + section()));
  const b = await m10.loadBundle(state.key);
  const person = b.people.find((p) => p.id === state.person);
  if (!state.values) state.values = { ...person.values };
  const draw = { linear: renderLinear, forest: renderForest, boosting: renderBoosting }[section()];
  await draw(b, person);
}

const starterNote = (text) => `<p class="starter">Starter display: ${text} Replace it with your own explainer.</p>`;
const featureLabel = (b, name) => (b.features.find((f) => f.name === name) || { label: name }).label;

// ---- Push & Pull: the receipt -------------------------------------------------
// Every number comes from the bundle or m10.linearExplain. Nothing is re-estimated.
// Round like check.md (toFixed), then add thousands separators.
const num = (v, d = 1) => {
  const [i, f] = Number(v).toFixed(d).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (f ? "." + f : "");
};
const signedNum = (v, d = 1) => (v >= 0 ? "+" : "−") + num(Math.abs(v), d);
const coefNum = (v) => {
  const a = Math.abs(v);
  return a >= 10 ? num(v, 1) : a >= 1 ? num(v, 2) : num(v, 3);
};
const perUnit = (units) => ({ years: "year", "kg/m²": "kg/m²", cm: "cm", "%": "% point", ratio: "1.0 of the ratio" }[units] || units);
const valueText = (f, v) => (f.units === "years" ? num(v, 0) : num(v, f.units === "ratio" ? 2 : 1)) + (f.units === "%" ? "%" : " " + f.units);

function linearGroups(b) {
  const grouped = new Set(b.categorical_groups.flatMap((g) => g.levels.filter((lv) => lv.column).map((lv) => lv.column)));
  return { groups: b.categorical_groups, numeric: b.features.filter((f) => !grouped.has(f.name)) };
}

function renderLinear(b, person) {
  const u = b.units;
  const { groups, numeric } = linearGroups(b);
  $("section").innerHTML = `
    <h2>Push &amp; Pull: how a linear regression builds one prediction</h2>
    <p class="lead">A linear regression doesn't guess from scratch. It <strong>starts from one number</strong>, the prediction for a
      perfectly average person in the training data, then adds <strong>one push per feature</strong>. A push is positive (up) or
      negative (down), measured in ${u}. Add the starting point and every push, and you get the prediction.
      Read it like a receipt: the starting point is the base price, and each feature is a line item.</p>

    <div class="linear-grid">
      <div class="panel">
        <h3>1. The person</h3>
        <p class="note">${person.label} is a real survey participant. Change any value and watch the receipt update.</p>
        <div class="inputs one-col">
          ${numeric.map((f) => {
            const s = b.feature_stats[f.name];
            return `<label>${f.label} (${f.units})<input type="number" data-f="${f.name}" value="${state.values[f.name]}" min="${s.min}" max="${s.max}" step="any"></label>`;
          }).join("")}
          ${groups.map((g) => `<label>${g.label}<select data-g="${g.name}">${g.levels
            .map((lv) => `<option ${lv.label === m10.categoryOf(b, g.name, state.values) ? "selected" : ""}>${lv.label}</option>`)
            .join("")}</select></label>`).join("")}
        </div>
        <button id="reset-person" type="button">Reset to ${person.label}</button>
      </div>
      <div>
        <h3>2. The receipt</h3>
        <div id="receipt"></div>
      </div>
    </div>

    <div class="panel">
      <h3>3. A coefficient is not a push</h3>
      <div class="two-cards">
        <div class="card"><strong>Coefficient: the model's rule, the same for everyone.</strong>
          How much the prediction changes for each 1-unit increase in a feature, holding the other features fixed.
          Its units are <em>${u} per unit of the feature</em>. Example: <span id="coef-example"></span></div>
        <div class="card"><strong>Push: what that rule does for one person.</strong>
          Push = coefficient × (this person's value − training average). A person exactly at the average gets a push of 0,
          even though the coefficient isn't 0. <span id="push-example"></span></div>
      </div>
      <p class="callout">⚠️ One person's biggest push is <strong>not</strong> "the most important feature overall". A push is big when this
        person is unusually far from average on that feature. To compare features in general, use the typical effects below.</p>
    </div>

    <div class="panel">
      <h3>4. In general, across everyone (not about this person)</h3>
      <p class="note">Raw coefficients can't be compared with each other, because features have different units (per year, per cm…).
        The <strong>typical effect</strong> puts them on one scale: coefficient × one standard deviation, i.e. how much the
        prediction moves when a feature goes up by a typical amount. These numbers don't change when you change the person.</p>
      <div id="typical"></div>
    </div>

    <p class="note">These are patterns (associations) the model learned from NHANES survey data, not causes. Read a push as "people with this value
      tend to get a higher (or lower) prediction", never as "changing this value would change the result".</p>`;

  const rerender = () => updateLinear(b, person);
  document.querySelectorAll("[data-f]").forEach((el) =>
    (el.oninput = () => { if (el.value !== "") { state.values[el.dataset.f] = Number(el.value); rerender(); } }));
  document.querySelectorAll("[data-g]").forEach((el) =>
    (el.onchange = () => { Object.assign(state.values, m10.categoryInputs(b, el.dataset.g, el.value)); rerender(); }));
  $("reset-person").onclick = () => { state.values = { ...person.values }; renderLinear(b, person); };
  rerender();
  renderTypical(b);
}

function updateLinear(b, person) {
  const u = b.units;
  const lin = b.linear;
  const { groups, numeric } = linearGroups(b);
  const x = state.values;
  const ex = m10.linearExplain(b, x);
  const edited = Object.keys(person.values).some((k) => Math.abs(person.values[k] - x[k]) > 1e-9);

  const entries = Object.entries(ex.groupedPushes);
  const biggestUp = entries.filter(([, v]) => v > 0).sort((a, b2) => b2[1] - a[1])[0]?.[0];
  const biggestDown = entries.filter(([, v]) => v < 0).sort((a, b2) => a[1] - b2[1])[0]?.[0];

  const lines = entries.map(([name, v]) => {
    const g = groups.find((gr) => gr.name === name);
    let title, detail;
    if (g) {
      const level = m10.categoryOf(b, name, x);
      const cols = g.levels.filter((lv) => lv.column);
      const own = cols.find((lv) => lv.label === level);
      const ownCoef = own ? lin.coefficients[own.column] : 0;
      title = `${g.label}: ${level}`;
      if (cols.length === 1) {
        const c = cols[0].column;
        detail = `Training people were ${num(100 * lin.reference[c], 0)}% ${cols[0].label.toLowerCase()}. Coefficient: ${cols[0].label} vs ${g.reference}
          (reference group) = ${signedNum(lin.coefficients[c], 1)} ${u}. Push = ${coefNum(lin.coefficients[c])} × (${x[c]} − ${num(lin.reference[c], 2)})`;
      } else {
        detail = `Compared with the training mix of all groups. Coefficient: ${level} vs ${g.reference} (reference group) =
          ${signedNum(ownCoef, 1)} ${u}; the push is smaller because the starting point already includes the average mix of groups.`;
      }
    } else {
      const f = numeric.find((ff) => ff.name === name);
      const c = lin.coefficients[name], ref = lin.reference[name], diff = x[name] - ref;
      title = `${f.label}: ${valueText(f, x[name])}`;
      detail = `${valueText(f, Math.abs(diff))} ${diff >= 0 ? "above" : "below"} average (${valueText(f, ref)})
        × coefficient ${coefNum(c)} ${u} per ${perUnit(f.units)}`;
    }
    const tag = name === biggestUp ? `<span class="tag up-bg">biggest push up</span>`
      : name === biggestDown ? `<span class="tag down-bg">biggest push down</span>` : "";
    return `<div class="r-line">
      <div class="r-item">${title} ${tag}<div class="r-detail">${detail}</div></div>
      <div class="r-amt ${v >= 0 ? "up" : "down"}">${v >= 0 ? "▲" : "▼"} ${signedNum(v)}</div>
    </div>`;
  });

  const sumText = `${num(ex.baseline)} ${entries.map(([, v]) => (v >= 0 ? "+ " : "− ") + num(Math.abs(v))).join(" ")} = <strong>${num(ex.prediction)} ${u}</strong>`;
  const measured = edited
    ? `<p class="note">You edited this person, so there's no measured value to compare with.</p>`
    : `<p class="note">Measured value for ${person.label}: <strong>${num(person.observed)} ${u}</strong>
        (the model is off by ${num(Math.abs(ex.prediction - person.observed))} ${u}).</p>`;
  const lineWarning = state.key === "fev1" && x.age < 18
    ? `<p class="callout">👀 Notice how far off the line is for a child. Lungs grow through childhood and shrink slowly later.
        A linear model gets one straight-line rule for age (${coefNum(lin.coefficients.age)} ${u} per year), so it can't bend to follow
        both. That's a real limit of linear regression, not a bug.</p>` : "";

  $("receipt").innerHTML = `
    <div class="receipt">
      <div class="r-head">PREDICTION RECEIPT · ${b.target_label}</div>
      <div class="r-line r-start">
        <div class="r-item">STARTING POINT<div class="r-detail">The prediction for a perfectly average training person
          (every feature at its training average). Not the intercept: the intercept is the prediction when every feature is 0, e.g. age 0 and BMI 0.</div></div>
        <div class="r-amt">${num(ex.baseline)}</div>
      </div>
      <div class="r-sub">+ one push per feature (${u})</div>
      ${lines.join("")}
      <div class="r-line r-total">
        <div class="r-item">PREDICTION</div>
        <div class="r-amt">${num(ex.prediction)} ${u}</div>
      </div>
      <div class="r-sum">Check: ${sumText}</div>
    </div>
    ${measured}
    ${lineWarning}`;

  // Coefficient vs push example: use the numeric feature with the biggest push for this person.
  const ex1 = numeric.slice().sort((a, b2) => Math.abs(ex.groupedPushes[b2.name]) - Math.abs(ex.groupedPushes[a.name]))[0];
  const c = lin.coefficients[ex1.name];
  $("coef-example").innerHTML = `${ex1.label}: <strong>${coefNum(c)} ${u} per ${perUnit(ex1.units)}</strong>, for every person.`;
  $("push-example").innerHTML = `For this person: ${coefNum(c)} × (${valueText(ex1, x[ex1.name])} − ${valueText(ex1, lin.reference[ex1.name])})
    = <strong>${signedNum(ex.groupedPushes[ex1.name])} ${u}</strong>. Pick another person: same coefficient, different push.`;
}

function renderTypical(b) {
  const u = b.units;
  const lin = b.linear;
  const rows = Object.entries(lin.typical_effect_per_sd).sort((a, b2) => Math.abs(b2[1]) - Math.abs(a[1]));
  const max = Math.max(...rows.map(([, v]) => Math.abs(v)));
  $("typical").innerHTML = rows.map(([name, v]) => {
    const f = b.features.find((ff) => ff.name === name);
    const sd = b.feature_stats[name].train_sd;
    return `<div class="t-row">
      <div class="t-label">${f.label}<div class="r-detail">1 SD = ${valueText(f, sd)}</div></div>
      <div class="t-bar"><span class="${v >= 0 ? "up-bg" : "down-bg"}" style="width:${(100 * Math.abs(v)) / max}%"></span></div>
      <div class="t-val ${v >= 0 ? "up" : "down"}">${signedNum(v)} ${u}</div>
    </div>`;
  }).join("") + `<p class="note">${b.categorical_groups.map((g) => g.label).join(" and ")} ${b.categorical_groups.length > 1 ? "are" : "is"} left out:
    a category has no "standard deviation", so it can't go on this scale.</p>`;
}

// ---- Wisdom of the Forest: a panel of judges ----------------------------------
// Every number comes from bundle.forest. The slider is drawn once; only the
// cards and the scoreboard redraw, so dragging works.
function forestFeatureQuestion(b, step) {
  const f = b.features.find((ff) => ff.name === step.feature) || { label: step.feature, units: "", binary: false };
  if (f.binary) {
    const short = f.label.replace(/ \(.*\)$/, "").replace(/^Race\/ethnicity: /, "");
    return { q: `Is the person ${short}?`, a: step.goes === ">" ? "yes" : "no" };
  }
  const short = f.label.replace(/ \(.*\)$/, "");
  const th = f.units === "years" ? num(step.threshold, 1) : num(step.threshold, 2);
  return { q: `Is ${short} ≤ ${th} ${f.units}?`, a: step.goes === "≤" ? "yes" : "no" };
}

function renderForest(b, person) {
  const u = b.units;
  const rf = b.forest;
  const nT = rf.n_trees;
  const pf = rf.people[person.id];
  const trees = pf.tree_predictions;
  const d = state.key === "fev1" ? 0 : 1; // decimals on the small cards
  const n = Math.min(nT, Number(state.nTrees || 10));
  const lo = Math.min(...trees), hi = Math.max(...trees);
  const avgUnique = rf.bootstrap_unique_training_rows.reduce((a, c) => a + c, 0) / rf.bootstrap_unique_training_rows.length;
  const pctSeen = Math.round((100 * avgUnique) / rf.n_training_rows);
  const outside = person.observed < lo || person.observed > hi;

  $("section").innerHTML = `
    <h2>Wisdom of the Forest: how ${nT} trees combine into one prediction</h2>
    <p class="lead">A random forest is like a <strong>panel of ${nT} judges</strong>. Each judge is a decision tree: a chain of
      yes/no questions about the person that ends in a guess. Every judge looks at the <em>same</em> person, but each one
      gives its own score. The forest's prediction is simply the <strong>average of all ${nT} scores</strong>.</p>

    <div class="panel">
      <h3>1. The judges score ${person.label} (${person.description})</h3>
      <label class="slider">Judges seated: <input id="ntrees" type="range" min="1" max="${nT}" value="${n}">
        <strong id="ntrees-value">${n}</strong> of ${nT}</label>
      <div class="forest-layout">
        <div>
          <div class="judges" id="judges">
            ${trees.map((t, i) => `<div class="judge" data-i="${i}" title="Tree ${i + 1}: ${num(t)} ${u}">
              <span class="j-tree">🌳 ${i + 1}</span><span class="j-score">${num(t, d)}</span></div>`).join("")}
          </div>
          <p class="note">Each card is one tree's guess in ${u}. Color shows how far a judge is from the whole forest's average:
            <span class="swatch hi"></span> higher, <span class="swatch lo"></span> lower. Greyed-out cards aren't seated yet.</p>
        </div>
        <div>
          <div class="scoreboard" id="scoreboard"></div>
          <div id="settle"></div>
        </div>
      </div>
      <p class="callout">Why is the average steadier than one judge? Each judge has its own quirks that push its guess too high
        or too low. With many judges, those quirks point in different directions and partly cancel out. Slide the judges in
        one at a time and watch: the panel score jumps around at first, then settles. Steadier doesn't guarantee it's right,
        though. Compare it with the measured value.</p>
    </div>

    <div class="panel">
      <h3>2. Why don't the judges agree?</h3>
      <p>All ${nT} trees use the same method, but each one is trained in a deliberately different way:</p>
      <div class="two-cards">
        <div class="card"><strong>Each judge studied a different group of people.</strong>
          Each tree learned from its own random sample of the ${num(rf.n_training_rows, 0)} training people, drawn with repeats
          (a <em>bootstrap sample</em>). On average a tree saw about ${num(avgUnique, 0)} different people (${pctSeen}%), some more than once,
          and never saw the rest. Tree 1 saw ${num(rf.bootstrap_unique_training_rows[0], 0)}; tree 2 saw ${num(rf.bootstrap_unique_training_rows[1], 0)}.</div>
        <div class="card"><strong>Each question could only use a few features.</strong>
          Every time a tree picks its next yes/no question, it may only choose from ${rf.features_tried_per_split} randomly picked
          features out of ${rf.n_features}. So different judges end up asking different questions.
          <div class="r-detail" style="margin-top:6px">First question of each of the first 5 trees:</div>
          <ol class="roots">${rf.root_split.slice(0, 5).map((s) => `<li>${forestFeatureQuestion(b, { ...s, goes: "≤" }).q}</li>`).join("")}</ol></div>
      </div>
      <details class="trace"><summary>Follow judge 1's questions for ${person.label}</summary>
        <ol>${pf.traced_trees[0].steps.map((s) => { const x = forestFeatureQuestion(b, s); return `<li>${x.q} <strong>${x.a}</strong></li>`; }).join("")}</ol>
        <p>Judge 1's answer: <strong>${num(pf.traced_trees[0].leaf_value)} ${u}</strong>, the average outcome of the training people
          who ended up at the same final answer. The other 99 judges each follow their own questions.</p>
      </details>
    </div>

    <div class="panel">
      <h3>3. Disagreement is not a confidence interval</h3>
      <div id="spread"></div>
      <p>For ${person.label}, the judges' guesses run from <strong>${num(lo)}</strong> to <strong>${num(hi)} ${u}</strong>.
        That spread is <strong>disagreement between trees</strong>: how differently the judges see this person. It is
        <strong>not</strong> a confidence interval or a prediction interval, and it doesn't promise the true value is inside it.
        The judges learned from overlapping groups of the same people, so they share blind spots and can agree with each other
        and still all be wrong.
        ${outside ? `<strong>Here, the measured value (${num(person.observed)} ${u}) is outside every judge's guess.</strong>` : ""}</p>
      <p>Compare: <button type="button" data-goto="P4">Example person 4: judges disagree most</button>
        <button type="button" data-goto="P5">Example person 5: judges agree most</button></p>
    </div>`;

  drawSpread(b, person, trees);
  const update = (k) => {
    $("ntrees-value").textContent = k;
    document.querySelectorAll("#judges .judge").forEach((el) => {
      const i = Number(el.dataset.i);
      el.classList.toggle("off", i >= k);
      const dev = (trees[i] - pf.prediction) / Math.max(hi - pf.prediction, pf.prediction - lo, 1e-9);
      el.style.setProperty("--tint", `${Math.round(Math.min(1, Math.abs(dev)) * 55)}%`);
      el.classList.toggle("hi", dev > 0);
      el.classList.toggle("lo", dev < 0);
    });
    const avg = m10.runningAverage(trees, k);
    const shown = trees.slice(0, Math.min(k, 3)).map((t) => num(t)).join(" + ");
    $("scoreboard").innerHTML = `
      <div class="sb-label">${k < nT ? `PARTIAL FOREST: ${k} of ${nT} judges` : `WHOLE FOREST: all ${nT} judges`}</div>
      <div class="sb-score">${num(avg)} <span>${u}</span></div>
      <div class="sb-math">(${shown}${k > 3 ? " + …" : ""}) ÷ ${k}</div>
      <table>
        <tr><td>Judge 1 alone</td><td class="num">${num(trees[0])} ${u}</td></tr>
        <tr><th>Forest prediction (average of all ${nT})</th><th class="num">${num(pf.prediction)} ${u}</th></tr>
        <tr><td>Measured value</td><td class="num">${num(person.observed)} ${u}</td></tr>
      </table>`;
    drawSettle(b, trees, k, pf.prediction);
  };
  $("ntrees").oninput = (e) => { state.nTrees = Number(e.target.value); update(state.nTrees); };
  document.querySelectorAll("[data-goto]").forEach((el) => (el.onclick = () => {
    state.person = el.dataset.goto; $("person").value = state.person; state.values = null; render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  update(n);
}

// Small chart: the panel score as judges join, one at a time.
function drawSettle(b, trees, k, finalAvg) {
  const u = b.units;
  const run = trees.map((_, i) => m10.runningAverage(trees, i + 1));
  const W = 360, H = 170, L = 52, R = 10, T = 22, B = 34;
  const lo = Math.min(...run), hi = Math.max(...run), span = hi - lo || 1;
  const x = (i) => L + (i / (run.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / span) * (H - T - B);
  const path = run.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  $("settle").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Panel score as judges are added">
    <text x="${L}" y="12" font-size="11" fill="var(--muted)">Panel score as judges join (${u})</text>
    <line x1="${L}" x2="${W - R}" y1="${y(finalAvg)}" y2="${y(finalAvg)}" stroke="var(--muted)" stroke-dasharray="3 3"/>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    <line x1="${x(k - 1)}" x2="${x(k - 1)}" y1="${T}" y2="${H - B}" stroke="var(--fg)" stroke-width="1"/>
    <circle cx="${x(k - 1)}" cy="${y(run[k - 1])}" r="4" fill="var(--fg)"/>
    <text x="${L - 4}" y="${y(hi) + 4}" font-size="10" fill="var(--muted)" text-anchor="end">${num(hi, 0)}</text>
    <text x="${L - 4}" y="${y(lo) + 4}" font-size="10" fill="var(--muted)" text-anchor="end">${num(lo, 0)}</text>
    <text x="${L}" y="${H - B + 14}" font-size="10" fill="var(--muted)">1</text>
    <text x="${W - R}" y="${H - B + 14}" font-size="10" fill="var(--muted)" text-anchor="end">${run.length}</text>
    <text x="${(L + W - R) / 2}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="middle">number of judges seated</text>
  </svg>`;
}

// Dot plot: every judge's guess on one number line, with the forest average and the measured value.
function drawSpread(b, person, trees) {
  const u = b.units;
  const pred = b.forest.people[person.id].prediction;
  const vals = [...trees, person.observed];
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const W = 640, L = 20, R = 20, bins = 48, r = 4;
  const binOf = (v) => Math.min(bins - 1, Math.floor(((v - lo) / span) * bins));
  const counts = new Array(bins).fill(0);
  const dots = trees.map((t) => { const bi = binOf(t); return { bi, level: counts[bi]++ }; });
  const maxStack = Math.max(...counts);
  const base = 30 + maxStack * (2 * r + 1);
  const H = base + 50;
  const x = (v) => L + ((v - lo) / span) * (W - L - R);
  const bx = (bi) => L + ((bi + 0.5) / bins) * (W - L - R);
  $("spread").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="All tree guesses on one number line">
    ${dots.map((dd) => `<circle cx="${bx(dd.bi).toFixed(1)}" cy="${base - r - dd.level * (2 * r + 1)}" r="${r}" fill="var(--muted)" opacity=".75"/>`).join("")}
    <line x1="${L}" x2="${W - R}" y1="${base + 2}" y2="${base + 2}" stroke="var(--line)"/>
    <line x1="${x(pred)}" x2="${x(pred)}" y1="16" y2="${base + 8}" stroke="var(--accent)" stroke-width="3"/>
    <text x="${x(pred)}" y="12" font-size="12" fill="var(--accent)" text-anchor="middle" font-weight="700">forest average ${num(pred)}</text>
    <line x1="${x(person.observed)}" x2="${x(person.observed)}" y1="16" y2="${base + 8}" stroke="var(--fg)" stroke-dasharray="4 3" stroke-width="2"/>
    <text x="${x(person.observed)}" y="${base + 22}" font-size="12" fill="var(--fg)" text-anchor="middle">measured ${num(person.observed)}</text>
    <text x="${L}" y="${H - 6}" font-size="11" fill="var(--muted)">${num(lo)} ${u}</text>
    <text x="${W - R}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="end">${num(hi)} ${u}</text>
    <text x="${W / 2}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="middle">each grey dot = one judge's guess (${u})</text>
  </svg>`;
}

// ---- One Correction at a Time: hiking down into the valley ---------------------
// staged[m] = staged[m-1] + corrections[m-1]. Corrections already include the
// learning rate, so they are used exactly as supplied.
function renderBoosting(b, person) {
  const u = b.units;
  const gb = b.boosting;
  const p = gb.people[person.id];
  const last = p.corrections.length;
  const best = gb.best_validation_round;
  const lr = gb.learning_rate;
  const depth = gb.settings.max_depth;
  const r = Math.min(last, Number(state.round ?? 0));
  state.zoom = state.zoom ?? false;

  $("section").innerHTML = `
    <h2>One Correction at a Time: hiking down to the lowest error</h2>
    <p class="lead">Gradient boosting builds a prediction in <strong>small steps</strong>. It starts at the average
      (round 0), then each round adds <strong>one small tree</strong> that corrects part of what the model still gets wrong.
      Think of it as hiking down a mountain: every step lowers the error a little. The hard part is knowing
      <strong>when to stop walking</strong>.</p>

    <div class="panel">
      <h3>1. Take the steps for ${person.label} (${person.description})</h3>
      <div class="step-controls">
        <button type="button" id="r-back">◀ 1 step</button>
        <label class="slider">Round: <input id="round" type="range" min="0" max="${last}" value="${r}">
          <strong id="round-value">${r}</strong> of ${last}</label>
        <button type="button" id="r-next">1 step ▶</button>
      </div>
      <div class="boost-layout">
        <div id="step-card"></div>
        <div id="person-path"></div>
      </div>
    </div>

    <div class="panel">
      <h3>2. The trail map: where should the hike stop?</h3>
      <p>This chart is the mountain. It shows the model's typical error after each round, as <strong>RMSE</strong>
        (root mean squared error: roughly the typical size of a miss, in ${u}). Lower is better, so walking right means walking downhill.</p>
      <ul class="legend-list">
        <li><span class="key key-train"></span><strong>Practice trail (training error):</strong> error on the training people the trees learned from.
          It keeps going down, because the model can keep memorizing them.</li>
        <li><span class="key key-val"></span><strong>Real trail (validation error):</strong> error on ${num(b.n_validation, 0)} people the model never trained on.
          It reaches a valley floor 🚩, then starts climbing back up.</li>
      </ul>
      <div class="zoom">
        <button type="button" data-zoom="0">Whole trail (rounds 0–${last})</button>
        <button type="button" data-zoom="1">Zoom in (rounds 0–${Math.max(100, Math.min(last, best * 3))})</button>
      </div>
      <div id="mountain"></div>
      <div id="stop-verdict"></div>
      <p class="note">Choosing the stopping round this way is a <strong>validation-based choice, not a test result</strong>. We used the
        validation people to make the decision, so their error is no longer a fully independent check. A true test score would
        need people who were never used for any choice.</p>
    </div>

    <div class="panel">
      <h3>3. What happens inside one step?</h3>
      <div class="two-cards">
        <div class="card"><strong>Each new tree learns from the leftovers.</strong>
          After every round, the model checks each <em>training</em> person: <em>residual = actual value − current prediction</em>.
          That's what's still wrong. The next tree (at most ${depth} yes/no questions deep) is trained to predict those residuals,
          so it focuses on whatever the earlier rounds missed.</div>
        <div class="card"><strong>Only a small part of each tree is used.</strong>
          The model takes just ${num(lr * 100, 0)}% of each tree's suggestion (the <em>learning rate</em> = ${lr}). Small, careful steps
          usually generalize better than big jumps. The corrections on this page already include that ${num(lr * 100, 0)}%.</div>
      </div>
      <p class="callout">Not every step helps every person. A tree corrects the training people <em>as a group</em>, so for one person a step
        can go the wrong way. Step through ${person.label}'s rounds and you'll see some steps move away from the measured value.
        Judge the stopping point by the trail map, not by one person.</p>
    </div>`;

  const update = (k) => {
    state.round = k;
    $("round").value = k;
    $("round-value").textContent = k;
    const gap = (v) => `${num(Math.abs(person.observed - v))} ${u} ${v > person.observed ? "too high" : "too low"}`;
    if (k === 0) {
      $("step-card").innerHTML = `<div class="step-box">
        <div class="sb-label">ROUND 0: THE STARTING POINT</div>
        <div class="step-big">${num(gb.init)} <span>${u}</span></div>
        <p>Before any trees, the best single guess for everyone is the <strong>average outcome in the training data</strong>.
          Every person starts here. Press <em>1 step ▶</em> to add the first tree.</p>
        <p class="step-gap">Measured value: ${num(person.observed)} ${u} · still ${gap(gb.init)}</p></div>`;
    } else {
      const c = p.corrections[k - 1];
      const before = Math.abs(person.observed - p.staged[k - 1]), after = Math.abs(person.observed - p.staged[k]);
      $("step-card").innerHTML = `<div class="step-box">
        <div class="sb-label">ROUND ${k}: ONE SMALL CORRECTION</div>
        <div class="step-eq">
          <div><span class="step-k">Prediction after round ${k - 1}</span><span class="step-v">${num(p.staged[k - 1])} ${u}</span></div>
          <div><span class="step-k">Correction from tree ${k}</span><span class="step-v ${c >= 0 ? "up" : "down"}">${signedNum(c, 2)} ${u}</span></div>
          <div class="step-total"><span class="step-k">Prediction after round ${k}</span><span class="step-v">${num(p.staged[k])} ${u}</span></div>
        </div>
        <p class="step-gap">Measured value: ${num(person.observed)} ${u} · now ${gap(p.staged[k])}
          ${after > before + 1e-9 ? `<br><strong>This step moved ${person.label} slightly away from the measured value.</strong>` : ""}</p>
        <table class="mini-log"><tr><th>Round</th><th class="num">Correction</th><th class="num">Prediction</th></tr>
          ${Array.from({ length: Math.min(5, k + 1) }, (_, j) => k - Math.min(4, k) + j).map((m) => `<tr${m === k ? ' class="cur"' : ""}>
            <td>${m}</td><td class="num">${m === 0 ? "start" : signedNum(p.corrections[m - 1], 2)}</td><td class="num">${num(p.staged[m])}</td></tr>`).join("")}
        </table></div>`;
    }
    drawPersonPath(b, person, p.staged, k);
    drawMountain(b, k);
    const v = gb.rmse.validation, t = gb.rmse.train;
    let verdict;
    if (k < best) verdict = `<strong>Still heading downhill.</strong> The error on new people is still falling, so more steps should help.`;
    else if (k === best) verdict = `<strong>🚩 You're on the valley floor.</strong> This is the round with the lowest error on new people. Stop here.`;
    else verdict = `<strong>Past the valley floor.</strong> The practice trail is still going down (training ${num(t[best])} → ${num(t[k])} ${u}),
      but the real trail is ${num(v[k] - v[best])} ${u} worse than at round ${best}. The extra trees are learning quirks of the training
      people that new people don't share. That's <strong>overfitting</strong>.`;
    $("stop-verdict").innerHTML = `<div class="verdict">
      <div class="v-nums">
        <div><span class="sb-label">IF YOU STOP AT ROUND ${k}</span><span class="v-big">${num(v[k])} ${u}</span>validation RMSE (training: ${num(t[k])} ${u})</div>
        <div><span class="sb-label">LOWEST VALIDATION ERROR</span><span class="v-big">${num(gb.best_validation_rmse)} ${u}</span>at round ${best}</div>
      </div>
      <p>${verdict}</p>
      <p class="note">Why not stop where the <em>training</em> error is lowest (round ${last})? Because training error always keeps
        falling: it only says how well the model remembers people it has already seen. The validation trail is the honest guide.</p>
      ${k !== best ? `<button type="button" id="go-best">🚩 Jump to the valley floor (round ${best})</button>` : ""}
    </div>`;
    if ($("go-best")) $("go-best").onclick = () => update(best);
  };

  $("round").oninput = (e) => update(Number(e.target.value));
  $("r-back").onclick = () => update(Math.max(0, state.round - 1));
  $("r-next").onclick = () => update(Math.min(last, state.round + 1));
  document.querySelectorAll("[data-zoom]").forEach((el) => {
    el.classList.toggle("active", String(Number(state.zoom)) === el.dataset.zoom);
    el.onclick = () => {
      state.zoom = el.dataset.zoom === "1";
      document.querySelectorAll("[data-zoom]").forEach((e2) => e2.classList.toggle("active", e2 === el));
      drawMountain(b, state.round);
    };
  });
  update(r);
}

// The mountain: training and validation RMSE by round, with the hiker and the flag.
function drawMountain(b, k) {
  const u = b.units;
  const gb = b.boosting;
  const tr = gb.rmse.train, va = gb.rmse.validation;
  const best = gb.best_validation_round;
  const maxR = state.zoom ? Math.max(100, Math.min(tr.length - 1, best * 3)) : tr.length - 1;
  const W = 720, H = 320, L = 62, R = 16, T = 20, B = 46;
  const lo = Math.min(...tr.slice(0, maxR + 1), ...va.slice(0, maxR + 1));
  const hi = Math.max(...tr.slice(0, maxR + 1), ...va.slice(0, maxR + 1));
  const pad = (hi - lo) * 0.08;
  const y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const x = (i) => L + (i / maxR) * (W - L - R);
  const y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const line = (arr) => arr.slice(0, maxR + 1).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line(va)} L${x(maxR)},${H - B} L${x(0)},${H - B} Z`;
  const ticksX = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxR));
  const ticksY = [0, 0.5, 1].map((f) => y0 + f * (y1 - y0));
  const kk = Math.min(k, maxR);
  const hikerVisible = k <= maxR;
  $("mountain").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Training and validation RMSE by boosting round">
    <defs><linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--mtn-top)"/><stop offset="1" stop-color="var(--mtn-bottom)"/></linearGradient></defs>
    <path d="${area}" fill="url(#earth)"/>
    ${ticksY.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/>
      <text x="${L - 6}" y="${y(v) + 4}" font-size="11" fill="var(--muted)" text-anchor="end">${num(v, 1)}</text>`).join("")}
    ${ticksX.map((i) => `<text x="${x(i)}" y="${H - B + 16}" font-size="11" fill="var(--muted)" text-anchor="middle">${i}</text>`).join("")}
    <path d="${line(tr)}" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-dasharray="6 4"/>
    <path d="${line(va)}" fill="none" stroke="var(--trail)" stroke-width="3"/>
    ${best <= maxR ? `<line x1="${x(best)}" x2="${x(best)}" y1="${y(va[best])}" y2="${y(va[best]) - 34}" stroke="var(--fg)" stroke-width="1.5"/>
      <text x="${x(best) + 1}" y="${y(va[best]) - 22}" font-size="18">🚩</text>
      <text x="${x(best) + 8}" y="${y(va[best]) + 18}" font-size="11" fill="var(--fg)">lowest: ${num(gb.best_validation_rmse)} ${u}, round ${best}</text>` : ""}
    ${hikerVisible ? `<line x1="${x(kk)}" x2="${x(kk)}" y1="${T}" y2="${H - B}" stroke="var(--fg)" stroke-opacity=".35"/>
      <circle cx="${x(kk)}" cy="${y(tr[kk])}" r="4" fill="var(--muted)"/>
      <text x="${x(kk)}" y="${y(va[kk]) - 6}" font-size="22" text-anchor="middle">🥾</text>
      <circle cx="${x(kk)}" cy="${y(va[kk])}" r="5" fill="var(--trail)" stroke="var(--bg)" stroke-width="2"/>`
      : `<text x="${W - R}" y="${T + 12}" font-size="11" fill="var(--muted)" text-anchor="end">hiker is at round ${k}, past the zoomed view →</text>`}
    <text x="${(L + W - R) / 2}" y="${H - 8}" font-size="12" fill="var(--muted)" text-anchor="middle">Boosting round (number of trees added)</text>
    <text transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" font-size="12" fill="var(--muted)" text-anchor="middle">RMSE: typical error (${u})</text>
  </svg>`;
}

// One person's prediction, round by round, against the measured value.
function drawPersonPath(b, person, staged, k) {
  const u = b.units;
  const W = 360, H = 200, L = 56, R = 10, T = 24, B = 34;
  const vals = [...staged, person.observed];
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.08 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const x = (i) => L + (i / (staged.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const path = staged.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  $("person-path").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="This person's prediction by round">
    <text x="${L}" y="12" font-size="11" fill="var(--muted)">${person.label}'s prediction by round (${u})</text>
    <line x1="${L}" x2="${W - R}" y1="${y(person.observed)}" y2="${y(person.observed)}" stroke="var(--fg)" stroke-dasharray="4 3"/>
    <text x="${W - R}" y="${y(person.observed) - 4}" font-size="10" fill="var(--fg)" text-anchor="end">measured ${num(person.observed)}</text>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    <circle cx="${x(k)}" cy="${y(staged[k])}" r="5" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>
    <text x="${L - 4}" y="${y(hi) + 4}" font-size="10" fill="var(--muted)" text-anchor="end">${num(hi, 0)}</text>
    <text x="${L - 4}" y="${y(lo) + 4}" font-size="10" fill="var(--muted)" text-anchor="end">${num(lo, 0)}</text>
    <text x="${L}" y="${H - B + 14}" font-size="10" fill="var(--muted)">0</text>
    <text x="${W - R}" y="${H - B + 14}" font-size="10" fill="var(--muted)" text-anchor="end">${staged.length - 1}</text>
    <text x="${(L + W - R) / 2}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="middle">round</text>
  </svg>
  <p class="note">The blue line is this person's prediction after each round. Early steps make visible moves; later
    steps are tiny tweaks.</p>`;
}

setup();
