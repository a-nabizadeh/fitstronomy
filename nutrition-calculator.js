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
    email: formData.get('email')?.toString().trim() ?? '',
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

function buildEmailBody(result) {
  const mealLines = result.mealPlan
    .map((meal) => `${meal.label}: Protein ${meal.protein} g | Carbs ${meal.carbs} g | Fat ${meal.fat} g`)
    .join('\n');

  return [
    `Nutrition estimate for ${result.name}`,
    '',
    `Goal: ${result.goal}`,
    `Daily calories: ${formatNumber(result.dailyCalories)} kcal`,
    `TDEE: ${formatNumber(result.tdee)} kcal`,
    `BMR: ${formatNumber(result.bmr)} kcal`,
    `BMI: ${result.bmi}`,
    `Body fat estimate: ${result.bodyFatPercentage}%`,
    `Waist-to-hip ratio: ${result.whr}`,
    '',
    `Protein: ${result.proteinGrams} g (${result.proteinPercentage}%)`,
    `Carbohydrates: ${result.carbsGrams} g (${result.carbohydratesPercentage}%)`,
    `Fat: ${result.fatGrams} g (${result.fatPercentage}%)`,
    '',
    'Meal split',
    mealLines,
    '',
    'Generated on fitstronomy nutrition calculator.',
  ].join('\n');
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
    setStatus('Nutrition estimate updated. You can now review it or prepare an email draft.', 'success');
  } catch (error) {
    latestResult = null;
    setStatus(error.message, 'error');
  }
}

function handleEmailDraft() {
  if (!latestResult) {
    setStatus('Calculate the nutrition plan first so there is something to send.', 'error');
    return;
  }

  if (!latestResult.email) {
    setStatus('Enter an email address first if you want to prepare a draft with the results.', 'error');
    return;
  }

  const subject = encodeURIComponent(`Your nutrition estimate from Armin Nabizadeh`);
  const body = encodeURIComponent(buildEmailBody(latestResult));
  window.location.href = `mailto:${encodeURIComponent(latestResult.email)}?subject=${subject}&body=${body}`;
  setStatus('Your email app should open with the nutrition estimate prefilled.', 'success');
}

const nutritionForm = document.getElementById('nutritionForm');
const emailPlanButton = document.getElementById('emailPlanButton');

if (nutritionForm && emailPlanButton) {
  nutritionForm.addEventListener('submit', handleNutritionSubmit);
  emailPlanButton.addEventListener('click', handleEmailDraft);

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
