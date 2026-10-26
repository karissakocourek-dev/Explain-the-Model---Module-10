# Explain the Model

**App:** https://karissakocourek-dev.github.io/Explain-the-Model---Module-10/

| Section | Direct link | My viewer should walk away knowing… |
|---|---|---|
| Push & Pull (linear regression) | [Open linear section](https://karissakocourek-dev.github.io/Explain-the-Model---Module-10/#linear) | A linear regression starts from the prediction for an average person and adds one signed push per feature (coefficient × how far this person is from average), and one person's biggest push is not the same as the most important feature overall. |
| Wisdom of the Forest (random forest) | [Open forest section](https://karissakocourek-dev.github.io/Explain-the-Model---Module-10/#forest) | A random forest averages the guesses of 100 trees that each learned from a different sample of people and features, and the spread of their guesses is disagreement between trees, not a confidence interval. |
| One Correction at a Time (gradient boosting) | [Open boosting section](https://karissakocourek-dev.github.io/Explain-the-Model---Module-10/#boosting) | Gradient boosting starts at the average and adds one small correction per round, and you stop at the round where validation error is lowest, because training error keeps falling even after the model starts overfitting. |

An app that explains three regression models to an anonymous visitor who knows about machine learning and regression, but not how these algorithms work. Datasets: NHANES fasting glucose, blood pressure and lung function.

Submit the link to **this repository** on Canvas. Reviewers open the app link above.

## What's here
| File | What it is |
|---|---|
| `AGENT_BRIEF.md` | Rules for your AI coding agent (have it read this first) |
| `SETUP.md` | How to run and publish (GitHub Pages or Streamlit) |
| `check.md` | Numbers your finished app must still show |
| `index.html`, `app.js`, `m10.js` | GitHub Pages route |
| `streamlit_app.py`, `m10.py`, `requirements.txt` | Streamlit route |
| `outputs/` | Reference model outputs (field guide: `outputs/SCHEMA.md`) |
| `data/` | The three datasets and the data dictionary |

## Run locally
- GitHub Pages route: `python -m http.server 8000`, then open <http://localhost:8000>
- Streamlit route: `uv run --with streamlit,pandas,numpy streamlit run streamlit_app.py`
