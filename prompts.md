# Prompt Log: Explain the Model (M10)

**App:** https://karissakocourek-dev.github.io/Explain-the-Model---Module-10/
**AI coding agent:** Claude (Anthropic)
**Publishing route:** GitHub Pages (HTML and JavaScript)

*This log summarizes my prompts by stage. Routine messages such as "next step" are combined, and questions not related to building the app are left out. The full conversation is available on request.*

## My approach

As the assignment intended, I used the AI agent to write the code while I directed the project. I worked through it one step at a time so I understood each part before moving on. I made the design choices, came up with the theme, published and tested the app, troubleshot problems on my live site, and asked the agent to check the finished work against the assignment requirements.

## My design decisions

| Section | What I decided |
|---|---|
| Push & Pull (linear regression) | Out of three options (receipt, waterfall chart, tug-of-war), I chose a **receipt**. The starting point is the base price, and each feature's push is a line item, so a visitor can see the pushes add up to the prediction. |
| Wisdom of the Forest (random forest) | I compared three options before choosing, and chose a **panel of judges**: 100 trees each hold up a score, and a scoreboard shows the average, so "many separate opinions, averaged" is concrete. |
| One Correction at a Time (gradient boosting) | Instead of the options offered, I proposed **a mountain-climbing theme**. We refined it into **hiking down into a valley**: the error curve is the trail, and the visitor stops at the valley floor, the lowest validation error. |
| Whole site | I asked for **a hiking theme across the whole website**. I chose to apply it to the look of the site (colors, mountain banner, trail-sign navigation) without changing the content of the sections that already taught well. |

## Prompts by stage

**1. Planning**
- Asked the agent to explain the assignment from the course website and to guide me one step at a time.

**2. Setup and publishing**
- Asked for step-by-step guidance to create a public GitHub repository, upload the starter files and turn on GitHub Pages.
- Shared a screenshot of my repository. This revealed that the `data` and `outputs` folders were missing, and I uploaded them.
- Tested the site in a private browser window and confirmed it worked.

**3. Building the sections**
- Gave the agent the starter files and asked it to read the project rules (`AGENT_BRIEF.md`, `outputs/SCHEMA.md`) before writing code.
- For each section, asked for design options, then chose one (decisions above).
- Asked: *"can this one be like climbing a mountain?"* This led to the valley design for the boosting section.
- Asked: *"is there a way to make the whole website have a hiking theme?"* Then chose the look-only version.

**4. Troubleshooting**
- My site showed a 404 error after an update. I identified that my repository name differed from the link I was using, then corrected the link in my browser and in the README.
- Asked how to find the forest section's judge cards on the live site, and confirmed they were working.

**5. Checking and submitting**
- Asked the agent to **double-check everything** against the assignment requirements. This found that some receipt lines were missing units, which were then added.

## Verification

Every section was tested on all three datasets. Example person 1 shows these values, which match `check.md`:

| Dataset | Push & Pull | Wisdom of the Forest | One Correction at a Time |
|---|---|---|---|
| Fasting glucose | 113.8 + pushes = 99.4 mg/dL | 108.6 mg/dL (tree 1: 110.0) | 113.8 → 102.5 mg/dL; lowest validation RMSE 20.4 at round 21 |
| Blood pressure | 125.9 + pushes = 123.3 mmHg | 119.6 mmHg (tree 1: 131.3) | 125.9 → 127.1 mmHg; lowest validation RMSE 16.1 at round 38 |
| Lung function (FEV₁) | 2,878.6 + pushes = 3,217.9 mL | 1,982.5 mL (tree 1: 2,003.0) | 2,878.6 → 1,831.8 mL; lowest validation RMSE 537.7 at round 79 |

No model was retrained and no prediction was entered by hand. Every number comes from the supplied model output files.
