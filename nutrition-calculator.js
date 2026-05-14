const mealDistribution = [
  { label: 'Breakfast', ratio: 0.2 },
  { label: 'Snack 1', ratio: 0.05 },
  { label: 'Lunch', ratio: 0.3 },
  { label: 'Snack 2', ratio: 0.1 },
  { label: 'Dinner', ratio: 0.3 },
  { label: 'Snack 3', ratio: 0.05 },
];

const guideContent = {
  start: {
    kicker: 'Start here',
    title: 'Use the form like a guided consultation',
    body: 'Tap the helper pills below or focus a field to reveal specific guidance on calorie deficits, activity levels, and macro choices. It keeps the calculator clean while still teaching people how to use it well.',
  },
  activity: {
    kicker: 'Activity index',
    title: 'Choose the multiplier that matches real life',
    body: '1.2 suits mostly desk-based days with little training. 1.375 fits light movement and a few sessions weekly. 1.55 is moderate training 3 to 5 times per week. 1.725 and 1.9 are better for high-volume training, sport, or physically demanding routines.',
  },
  deficit: {
    kicker: 'Calorie pace',
    title: 'Think in weekly pace, not just daily numbers',
    body: 'A 250 kcal daily deficit is usually gentler and easier to recover from. A 500 kcal daily deficit is the classic moderate cut and often trends toward about 0.5 kg per week. Bigger deficits can work short term, but they raise the risk of hunger, low performance, and poor adherence.',
  },
  macros: {
    kicker: 'Macro split',
    title: 'Macros should support the goal and the person',
    body: 'Higher protein helps preserve lean mass during a cut and improves satiety. Carbohydrates tend to support training quality and recovery. Fat fills the remaining calories and helps with hormone support and meal satisfaction. The best split is the one the client can sustain consistently.',
  },
  goal: {
    kicker: 'Goal setting',
    title: 'Cut, gain, or maintain with intention',
    body: 'Use lose when the priority is steady fat loss, gain when performance and size are the goal, and maintain when the aim is to stabilize body weight while improving habits, strength, or body composition. The calculator gives a starting estimate, not a fixed rule.',
  },
};

function roundTo(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function parseFormValues(form) {
  const formData = new FormData(form);

  return {
    name: formData.get('name')?.toString().trim() ?? '',
    age: Number(formData.get('age')),
    sex: formData.get('sex')?.toString().trim().toUpperCase() ?? '',
    weight: Number(formData.get('weight')),
    height: Number(formData.get('height')),
    waist: Number(formData.get('waist')),
    hip: Number(formData.get('hip')),
    activityIndex: Number(formData.get('activityIndex')),
    goal: formData.get('goal')?.toString().trim().toLowerCase() ?? '',
    proteinPercentage: Number(formData.get('proteinPercentage')),
    carbohydratesPercentage: Number(formData.get('carbohydratesPercentage')),
    calorieAdjustment: Number(formData.get('calorieAdjustment')),
  };
}

function validateInput(data) {
  const requiredNumbers = [
    ['age', data.age],
    ['weight', data.weight],
    ['height', data.height],
    ['waist', data.waist],
    ['hip', data.hip],
    ['activity index', data.activityIndex],
    ['protein percentage', data.proteinPercentage],
    ['carbohydrate percentage', data.carbohydratesPercentage],
    ['calorie adjustment', data.calorieAdjustment],
  ];

  if (!data.name) {
    throw new Error('Please enter a name before calculating.');
  }

  if (!['M', 'F'].includes(data.sex)) {
    throw new Error('Please choose male or female.');
  }

  if (!['lose', 'gain', 'none'].includes(data.goal)) {
    throw new Error('Please choose a valid goal.');
  }

  for (const [label, value] of requiredNumbers) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Please enter a valid ${label}.`);
    }
  }

  if (data.hip === 0 || data.height === 0) {
    throw new Error('Height and hip measurements must be greater than zero.');
  }

  if (data.proteinPercentage + data.carbohydratesPercentage > 100) {
    throw new Error('Protein and carbohydrate percentages cannot exceed 100% in total.');
  }
}

function calculateNutrition(data) {
  validateInput(data);

  const isMale = data.sex === 'M';
  const bmi = data.weight / ((0.01 * data.height) ** 2);
  const whr = data.waist / data.hip;
  const bodyFatPercentage = isMale
    ? (1.2 * bmi) + (0.23 * data.age) - 16.2
    : (1.2 * bmi) + (0.23 * data.age) - 5.4;

  const bmr = isMale
    ? (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + 5
    : (10 * data.weight) + (6.25 * data.height) - (5 * data.age) - 161;

  const tdee = data.activityIndex * bmr;

  let dailyCalories = tdee;
  if (data.goal === 'lose') {
    dailyCalories -= data.calorieAdjustment;
  } else if (data.goal === 'gain') {
    dailyCalories += data.calorieAdjustment;
  }

  const fatPercentage = 100 - data.proteinPercentage - data.carbohydratesPercentage;
  const proteinGrams = (dailyCalories * (data.proteinPercentage / 100)) / 4;
  const carbsGrams = (dailyCalories * (data.carbohydratesPercentage / 100)) / 4;
  const fatGrams = (dailyCalories * (fatPercentage / 100)) / 9;

  const mealPlan = mealDistribution.map((meal) => ({
    label: meal.label,
    protein: roundTo(proteinGrams * meal.ratio, 1),
    carbs: roundTo(carbsGrams * meal.ratio, 1),
    fat: roundTo(fatGrams * meal.ratio, 1),
  }));

  return {
    ...data,
    bmi: roundTo(bmi, 1),
    whr: roundTo(whr, 2),
    bodyFatPercentage: roundTo(bodyFatPercentage, 1),
    bmr: roundTo(bmr, 0),
    tdee: roundTo(tdee, 0),
    dailyCalories: roundTo(dailyCalories, 0),
    proteinGrams: roundTo(proteinGrams, 1),
    carbsGrams: roundTo(carbsGrams, 1),
    fatGrams: roundTo(fatGrams, 1),
    fatPercentage: roundTo(fatPercentage, 0),
    mealPlan,
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatGoal(goal) {
  return {
    lose: 'Lose weight',
    gain: 'Gain weight',
    none: 'Maintain',
  }[goal] || goal;
}

function buildPdfDocument(result) {
  const generatedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const mealRows = result.mealPlan.map((meal) => `
    <tr>
      <th>${escapeHtml(meal.label)}</th>
      <td>${formatNumber(meal.protein, 1)} g</td>
      <td>${formatNumber(meal.carbs, 1)} g</td>
      <td>${formatNumber(meal.fat, 1)} g</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nutrition Estimate - ${escapeHtml(result.name)}</title>
<style>
  :root {
    --red: #E24B4A;
    --ink: #171717;
    --muted: #666;
    --line: #e4e4e4;
    --soft: #f7f7f7;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--ink);
    background: #fff;
    font-family: Inter, Arial, sans-serif;
    line-height: 1.5;
  }
  .toolbar {
    position: sticky;
    top: 0;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 24px;
    background: #111;
  }
  .toolbar button {
    border: 0;
    border-radius: 6px;
    padding: 10px 14px;
    color: #fff;
    background: var(--red);
    font: inherit;
    cursor: pointer;
  }
  .toolbar button.secondary {
    background: #333;
  }
  main {
    max-width: 820px;
    margin: 0 auto;
    padding: 46px 40px 56px;
  }
  header {
    border-bottom: 3px solid var(--red);
    padding-bottom: 22px;
    margin-bottom: 28px;
  }
  .eyebrow {
    color: var(--red);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.8px;
    text-transform: uppercase;
  }
  h1 {
    margin: 8px 0 6px;
    font-family: Oswald, Arial, sans-serif;
    font-size: 38px;
    line-height: 1.1;
  }
  .meta {
    color: var(--muted);
    font-size: 13px;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 24px 0;
  }
  .card {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 16px;
    background: var(--soft);
  }
  .label {
    display: block;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .value {
    font-size: 26px;
    font-weight: 800;
  }
  .value.accent {
    color: var(--red);
  }
  h2 {
    margin: 30px 0 12px;
    font-size: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 14px;
  }
  th,
  td {
    border-bottom: 1px solid var(--line);
    padding: 11px 8px;
    text-align: left;
  }
  thead th {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 1.1px;
    text-transform: uppercase;
  }
  tbody th {
    font-weight: 700;
  }
  .note {
    margin-top: 28px;
    color: var(--muted);
    font-size: 12px;
  }
  @media print {
    .toolbar { display: none; }
    main { padding: 0; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Print / Save PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Close</button>
  </div>
  <main>
    <header>
      <div class="eyebrow">Fitstronomy Nutrition Estimate</div>
      <h1>${escapeHtml(result.name)}</h1>
      <div class="meta">Generated ${escapeHtml(generatedDate)} by Armin Nabizadeh</div>
    </header>
    <section class="summary" aria-label="Nutrition summary">
      <div class="card">
        <span class="label">Goal</span>
        <span class="value">${escapeHtml(formatGoal(result.goal))}</span>
      </div>
      <div class="card">
        <span class="label">Daily Calories</span>
        <span class="value accent">${formatNumber(result.dailyCalories)} kcal</span>
      </div>
      <div class="card">
        <span class="label">Estimated TDEE</span>
        <span class="value">${formatNumber(result.tdee)} kcal</span>
      </div>
      <div class="card">
        <span class="label">Estimated BMR</span>
        <span class="value">${formatNumber(result.bmr)} kcal</span>
      </div>
      <div class="card">
        <span class="label">BMI</span>
        <span class="value">${formatNumber(result.bmi, 1)}</span>
      </div>
      <div class="card">
        <span class="label">Body Fat Estimate</span>
        <span class="value">${formatNumber(result.bodyFatPercentage, 1)}%</span>
      </div>
    </section>
    <h2>Macro Targets</h2>
    <table>
      <thead>
        <tr>
          <th>Macro</th>
          <th>Grams</th>
          <th>Calories</th>
          <th>Split</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Protein</th>
          <td>${formatNumber(result.proteinGrams, 1)} g</td>
          <td>${formatNumber(result.proteinGrams * 4)} kcal</td>
          <td>${formatNumber(result.proteinPercentage)}%</td>
        </tr>
        <tr>
          <th>Carbohydrates</th>
          <td>${formatNumber(result.carbsGrams, 1)} g</td>
          <td>${formatNumber(result.carbsGrams * 4)} kcal</td>
          <td>${formatNumber(result.carbohydratesPercentage)}%</td>
        </tr>
        <tr>
          <th>Fat</th>
          <td>${formatNumber(result.fatGrams, 1)} g</td>
          <td>${formatNumber(result.fatGrams * 9)} kcal</td>
          <td>${formatNumber(result.fatPercentage)}%</td>
        </tr>
      </tbody>
    </table>
    <h2>Meal Split</h2>
    <table>
      <thead>
        <tr>
          <th>Meal</th>
          <th>Protein</th>
          <th>Carbs</th>
          <th>Fat</th>
        </tr>
      </thead>
      <tbody>${mealRows}</tbody>
    </table>
    <p class="note">These numbers are estimates and should be adjusted based on progress, recovery, hunger, training performance, and adherence.</p>
  </main>
  <script>
    window.addEventListener('load', () => {
      window.setTimeout(() => window.print(), 300);
    });
  <\/script>
</body>
</html>`;
}

function renderResults(result) {
  document.getElementById('resultsEmpty').hidden = true;
  document.getElementById('resultsContent').hidden = false;
  document.getElementById('dailyCaloriesValue').textContent = `${formatNumber(result.dailyCalories)} kcal`;
  document.getElementById('tdeeValue').textContent = `${formatNumber(result.tdee)} kcal`;
  document.getElementById('bmiValue').textContent = formatNumber(result.bmi, 1);
  document.getElementById('bodyFatValue').textContent = `${formatNumber(result.bodyFatPercentage, 1)}%`;
  document.getElementById('proteinValue').textContent = `${formatNumber(result.proteinGrams, 1)} g`;
  document.getElementById('carbsValue').textContent = `${formatNumber(result.carbsGrams, 1)} g`;
  document.getElementById('fatValue').textContent = `${formatNumber(result.fatGrams, 1)} g`;
  document.getElementById('proteinPercentValue').textContent = `${formatNumber(result.proteinPercentage)}% of calories`;
  document.getElementById('carbsPercentValue').textContent = `${formatNumber(result.carbohydratesPercentage)}% of calories`;
  document.getElementById('fatPercentValue').textContent = `${formatNumber(result.fatPercentage)}% of calories`;
  document.getElementById('resultsNote').textContent =
    `Estimated from the data entered for ${result.name}. Use this as a starting point, then adjust based on progress, recovery, and adherence.`;

  const mealRows = document.getElementById('mealRows');
  mealRows.innerHTML = result.mealPlan.map((meal) => `
    <div class="meal-row">
      <strong>${meal.label}</strong>
      <span>${formatNumber(meal.protein, 1)} g</span>
      <span>${formatNumber(meal.carbs, 1)} g</span>
      <span>${formatNumber(meal.fat, 1)} g</span>
    </div>
  `).join('');
}

function setStatus(message, type = '') {
  const status = document.getElementById('nutritionStatus');
  status.textContent = message;
  status.className = 'nutrition-status';
  if (type) {
    status.classList.add(type);
  }
}

function setActiveGuidePill(key) {
  document.querySelectorAll('.guide-pill').forEach((pill) => {
    pill.classList.toggle('is-active', pill.dataset.guide === key);
  });
}

function updateGuide(key) {
  const nextGuide = guideContent[key] || guideContent.start;
  const highlight = document.getElementById('guideHighlight');
  const kicker = document.getElementById('guideKicker');
  const title = document.getElementById('guideTitle');
  const body = document.getElementById('guideBody');

  if (!highlight || !kicker || !title || !body) {
    return;
  }

  highlight.classList.add('is-swapping');
  window.setTimeout(() => {
    kicker.textContent = nextGuide.kicker;
    title.textContent = nextGuide.title;
    body.textContent = nextGuide.body;
    highlight.classList.remove('is-swapping');
  }, 140);

  setActiveGuidePill(key);
}

let latestResult = null;

function handleNutritionSubmit(event) {
  event.preventDefault();

  try {
    const result = calculateNutrition(parseFormValues(event.currentTarget));
    latestResult = result;
    renderResults(result);
    setStatus('Nutrition estimate updated. You can now review it or export a PDF.', 'success');
  } catch (error) {
    latestResult = null;
    setStatus(error.message, 'error');
  }
}

function handlePdfExport() {
  if (!latestResult) {
    setStatus('Calculate the nutrition plan first so there is something to export.', 'error');
    return;
  }

  const reportWindow = window.open('', '_blank', 'width=900,height=720');
  if (!reportWindow) {
    setStatus('Allow pop-ups for this site, then try exporting the PDF again.', 'error');
    return;
  }

  reportWindow.opener = null;
  reportWindow.document.open();
  reportWindow.document.write(buildPdfDocument(latestResult));
  reportWindow.document.close();
  setStatus('PDF report opened. Choose Save as PDF in the print dialog.', 'success');
}

const nutritionForm = document.getElementById('nutritionForm');
const pdfPlanButton = document.getElementById('pdfPlanButton');

if (nutritionForm && pdfPlanButton) {
  nutritionForm.addEventListener('submit', handleNutritionSubmit);
  pdfPlanButton.addEventListener('click', handlePdfExport);

  const guideFieldMap = {
    calcActivity: 'activity',
    calcGoal: 'goal',
    calcAdjustment: 'deficit',
    calcProtein: 'macros',
    calcCarbs: 'macros',
  };

  Object.entries(guideFieldMap).forEach(([fieldId, guideKey]) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('focus', () => updateGuide(guideKey));
      field.addEventListener('change', () => updateGuide(guideKey));
    }
  });

  document.querySelectorAll('.guide-pill').forEach((pill) => {
    pill.addEventListener('click', () => updateGuide(pill.dataset.guide));
  });
}
