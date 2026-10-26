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
const num = (v, d = 1) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
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

// ---- Wisdom of the Forest ----------------------------------------------------
// The slider is drawn once; only the results below it redraw, so dragging works.
function renderForest(b, person) {
  const u = b.units;
  const rf = b.forest;
  const trees = rf.people[person.id].tree_predictions;
  const n = Number(state.nTrees || 10);
  $("section").innerHTML = `
    <h2>Wisdom of the Forest: how do ${rf.n_trees} trees combine?</h2>
    ${starterNote("a list of tree guesses and their average.")}
    <p>${person.label} (${person.description}). Observed: ${fmt(person.observed)} ${u}.</p>
    <p>First 10 trees' guesses: ${trees.slice(0, 10).map((t) => fmt(t)).join(", ")} ${u}</p>
    <label>Trees included: <input id="ntrees" type="range" min="1" max="${rf.n_trees}" value="${n}"> <span id="ntrees-value">${n}</span></label>
    <div id="forest-results"></div>
    <p class="note">Trees differ because each one learns from a different bootstrap sample (about
      ${Math.round((100 * rf.bootstrap_unique_training_rows.reduce((a, c) => a + c, 0)) / rf.bootstrap_unique_training_rows.length / rf.n_training_rows)}%
      of the training people, some repeated) and tries only ${rf.features_tried_per_split} of ${rf.n_features} features at each split.
      The spread is disagreement between trees, not a confidence interval.</p>`;
  const update = (k) => {
    $("ntrees-value").textContent = k;
    $("forest-results").innerHTML = `<table>
      <tr><td>${k < rf.n_trees ? `Partial forest: average of the first ${k} of ${rf.n_trees} trees` : `Whole forest: average of all ${rf.n_trees} trees`}</td><td class="num">${fmt(m10.runningAverage(trees, k))} ${u}</td></tr>
      <tr><th>Forest prediction (all ${rf.n_trees} trees)</th><th class="num">${fmt(rf.people[person.id].prediction)} ${u}</th></tr>
      <tr><td>Tree disagreement for this person (lowest to highest guess)</td><td class="num">${fmt(Math.min(...trees))} to ${fmt(Math.max(...trees))} ${u}</td></tr>
    </table>`;
  };
  $("ntrees").oninput = (e) => { state.nTrees = Number(e.target.value); update(state.nTrees); };
  update(n);
}

// ---- One Correction at a Time -----------------------------------------------
function renderBoosting(b, person) {
  const u = b.units;
  const gb = b.boosting;
  const p = gb.people[person.id];
  const r = Number(state.round ?? 1);
  $("section").innerHTML = `
    <h2>One Correction at a Time: how does each tree improve the model?</h2>
    ${starterNote("a slider, three numbers and a plain error chart.")}
    <p>${person.label} (${person.description}). Observed: ${fmt(person.observed)} ${u}.</p>
    <label>Round: <input id="round" type="range" min="0" max="${p.corrections.length}" value="${r}"> <span id="round-value">${r}</span></label>
    <div id="boosting-results"></div>
    <p class="note">Each new tree is fitted to the training errors (residuals) left by the rounds before it.
      The stopping round is chosen with validation data, so its error is not an independent test result.</p>`;
  const update = (k) => {
    $("round-value").textContent = k;
    $("boosting-results").innerHTML = `<table>
      ${k === 0
        ? `<tr><th>Round 0: average outcome in the training rows</th><th class="num">${fmt(gb.init)} ${u}</th></tr>`
        : `<tr><td>Prediction after round ${k - 1}</td><td class="num">${fmt(p.staged[k - 1])} ${u}</td></tr>
           <tr><td>Correction from tree ${k} (already scaled by the learning rate)</td><td class="num ${p.corrections[k - 1] >= 0 ? "up" : "down"}">${signed(p.corrections[k - 1], 2)} ${u}</td></tr>
           <tr><th>Prediction after round ${k}</th><th class="num">${fmt(p.staged[k])} ${u}</th></tr>`}
    </table>
    ${rmseChart(gb, k, u)}
    <p>If you stop at round ${k}: validation RMSE ${fmt(gb.rmse.validation[k])} ${u} (training ${fmt(gb.rmse.train[k])} ${u}).
      Lowest validation RMSE: ${fmt(gb.best_validation_rmse)} ${u} at round ${gb.best_validation_round}.</p>`;
  };
  $("round").oninput = (e) => { state.round = Number(e.target.value); update(state.round); };
  update(r);
}

function rmseChart(gb, round, u) {
  const W = 600, H = 220, pad = 40;
  const tr = gb.rmse.train, va = gb.rmse.validation;
  const lo = Math.min(...tr, ...va), hi = Math.max(...tr, ...va);
  const x = (i) => pad + (i / (tr.length - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  const line = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Training and validation RMSE by round">
    <path d="${line(tr)}" fill="none" stroke="var(--muted)" stroke-width="2"/>
    <path d="${line(va)}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    <line x1="${x(round)}" x2="${x(round)}" y1="${pad}" y2="${H - pad}" stroke="var(--fg)" stroke-dasharray="4 3"/>
    <circle cx="${x(gb.best_validation_round)}" cy="${y(gb.best_validation_rmse)}" r="4" fill="var(--accent)"/>
    <text x="${pad}" y="${H - 10}" fill="var(--muted)" font-size="12">Round (0 to ${tr.length - 1})</text>
    <text x="4" y="${pad - 12}" fill="var(--muted)" font-size="12">RMSE (${u}): grey = training, blue = validation, dot = lowest validation</text>
    <text x="${pad - 4}" y="${y(hi) + 4}" fill="var(--muted)" font-size="11" text-anchor="end">${hi.toFixed(0)}</text>
    <text x="${pad - 4}" y="${y(lo) + 4}" fill="var(--muted)" font-size="11" text-anchor="end">${lo.toFixed(0)}</text>
  </svg>`;
}

setup();
