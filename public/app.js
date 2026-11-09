const views = {
  setup: document.querySelector('#setupView'),
  loading: document.querySelector('#loadingView'),
  test: document.querySelector('#testView'),
  results: document.querySelector('#resultsView')
};
const tiers = {
  1: { questionCount: 100, minutes: 60, difficulty: 'SSC CGL Tier I standard', title: 'SSC CGL Tier I · Full Mock', details: '100 questions · 60 minutes · +2 / −0.5 marking', note: 'Tier I: 25 each from Reasoning, General Awareness, Quantitative Aptitude, and English.', button: 'Start Tier I mock' },
  2: { questionCount: 150, minutes: 135, difficulty: 'SSC CGL Tier II Paper I standard', title: 'SSC CGL Tier II · Paper I Mock', details: '150 questions · 135 minutes · +3 / −1 marking', note: 'Tier II Paper I: Maths 30, Reasoning 30, English 45, General Awareness 25, Computer Knowledge 20. DEST is qualifying and practised separately.', button: 'Start Tier II mock' }
};
const state = { questions: [], answers: [], current: 0, duration: 60 * 60, remaining: 60 * 60, timerId: null, difficulty: 'SSC CGL Tier I standard', tier: 1, source: '' };

const $ = (selector) => document.querySelector(selector);
const letters = ['A', 'B', 'C', 'D'];

function selectTier(tier) {
  state.tier = Number(tier);
  const config = tiers[state.tier];
  $('#questionCount').value = config.questionCount;
  $('#duration').value = config.minutes;
  $('#difficulty').value = config.difficulty;
  state.difficulty = config.difficulty;
  $('#formatTitle').textContent = config.title;
  $('#formatDetails').textContent = config.details;
  $('#generationNote').textContent = config.note;
  $('#startButtonText').textContent = config.button;
  document.querySelectorAll('.tier-option').forEach((button) => button.classList.toggle('active', Number(button.dataset.tier) === state.tier));
}

document.querySelectorAll('.tier-option').forEach((button) => button.addEventListener('click', () => selectTier(button.dataset.tier)));

function showView(name) {
  Object.entries(views).forEach(([key, view]) => view.classList.toggle('hidden', key !== name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#setupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#loadingDescription').textContent = state.tier === 2 ? 'Preparing the 150-question Tier II Paper I mock.' : 'Curating questions across the four Tier I sections.';
  showView('loading');
  const questionCount = Number($('#questionCount').value);
  const minutes = Number($('#duration').value);
  try {
    const response = await fetch('/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: state.tier, questionCount, difficulty: state.difficulty, useAI: true }) });
    if (!response.ok) throw new Error('Test generation failed');
    const { questions, source } = await response.json();
    if (!Array.isArray(questions) || !questions.length) throw new Error('No questions returned');
    state.questions = questions;
    state.answers = new Array(questions.length).fill(null);
    state.current = 0;
    state.duration = minutes * 60;
    state.remaining = state.duration;
    state.source = source;
    startTest();
  } catch (error) {
    $('#generationNote').textContent = 'Could not generate this test. Please try again.';
    showView('setup');
  }
});

function startTest() {
  showView('test');
  renderQuestion();
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.remaining -= 1;
    renderTimer();
    if (state.remaining <= 0) finishTest(true);
  }, 1000);
}

function renderTimer() {
  const minutes = Math.floor(Math.max(0, state.remaining) / 60);
  const seconds = Math.max(0, state.remaining) % 60;
  $('#timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  $('.timer-wrap').classList.toggle('warning', state.remaining <= 60);
}

function renderQuestion() {
  const question = state.questions[state.current];
  const sectionIndexes = state.questions.map((item, index) => item.section === question.section ? index : -1).filter((index) => index >= 0);
  const sectionNumber = sectionIndexes.indexOf(state.current) + 1;
  $('#sectionLabel').textContent = question.section;
  $('#questionProgress').textContent = `Question ${state.current + 1} of ${state.questions.length}`;
  $('#sectionProgress').textContent = `${question.section} · Question ${sectionNumber} of ${sectionIndexes.length}`;
  $('#questionText').textContent = question.question;
  $('#progressBar').style.width = `${((state.current + 1) / state.questions.length) * 100}%`;
  renderTimer();
  $('#options').innerHTML = question.options.map((option, index) => `
    <button class="option ${state.answers[state.current] === index ? 'selected' : ''}" data-index="${index}">
      <span class="option-letter">${letters[index]}</span><span>${option}</span>
    </button>`).join('');
  document.querySelectorAll('.option').forEach((option) => option.addEventListener('click', () => {
    state.answers[state.current] = Number(option.dataset.index);
    renderQuestion();
  }));
  renderPalette();
  $('#previousButton').disabled = state.current === 0;
  $('#previousButton').style.opacity = state.current === 0 ? '.35' : '1';
  $('#nextButton').textContent = state.current === state.questions.length - 1 ? 'Review answers →' : 'Next →';
}

function renderPalette() {
  const activeSection = state.questions[state.current].section;
  const sections = [...new Set(state.questions.map((question) => question.section))];
  const shortNames = {
    'General Intelligence & Reasoning': 'Reasoning',
    'Reasoning and General Intelligence': 'Reasoning',
    'General Awareness': 'General Awareness',
    'Quantitative Aptitude': 'Quantitative',
    'Mathematical Abilities': 'Mathematics',
    'English Comprehension': 'English',
    'English Language and Comprehension': 'English',
    'Computer Knowledge Test': 'Computer'
  };
  $('#answeredCount').textContent = `${state.answers.filter((answer) => answer !== null).length} / ${state.questions.length} answered`;
  $('#sectionTabs').innerHTML = sections.map((section) => {
    const sectionIndexes = state.questions.map((question, index) => question.section === section ? index : -1).filter((index) => index >= 0);
    const answered = sectionIndexes.filter((index) => state.answers[index] !== null).length;
    return `<button class="section-tab ${section === activeSection ? 'active' : ''}" data-section="${section}"><span>${shortNames[section] || section}</span><small>${answered}/${sectionIndexes.length}</small></button>`;
  }).join('');
  const visibleIndexes = state.questions.map((question, index) => question.section === activeSection ? index : -1).filter((index) => index >= 0);
  $('#questionDots').innerHTML = visibleIndexes.map((index, position) => `<button class="question-dot ${index === state.current ? 'active' : ''} ${state.answers[index] !== null ? 'answered' : ''}" data-index="${index}">${position + 1}</button>`).join('');
  document.querySelectorAll('.question-dot').forEach((dot) => dot.addEventListener('click', () => { state.current = Number(dot.dataset.index); renderQuestion(); }));
  document.querySelectorAll('.section-tab').forEach((tab) => tab.addEventListener('click', () => {
    state.current = state.questions.findIndex((question) => question.section === tab.dataset.section);
    renderQuestion();
  }));
}

$('#previousButton').addEventListener('click', () => { if (state.current > 0) { state.current -= 1; renderQuestion(); } });
$('#nextButton').addEventListener('click', () => { if (state.current < state.questions.length - 1) { state.current += 1; renderQuestion(); } });
$('#submitButton').addEventListener('click', () => finishTest(false));

function finishTest(timedOut) {
  clearInterval(state.timerId);
  const timeUsed = state.duration - Math.max(0, state.remaining);
  const correct = state.questions.filter((question, index) => state.answers[index] === question.answerIndex).length;
  const incorrect = state.questions.filter((question, index) => state.answers[index] !== null && state.answers[index] !== question.answerIndex).length;
  const skipped = state.questions.length - correct - incorrect;
  const correctMarks = state.tier === 2 ? 3 : 2;
  const negativeMarks = state.tier === 2 ? 1 : 0.5;
  const score = correct * correctMarks - incorrect * negativeMarks;
  renderResults({ timedOut, timeUsed, correct, incorrect, skipped, score });
  showView('results');
}

function renderResults(summary) {
  const maxScore = state.questions.length * (state.tier === 2 ? 3 : 2);
  const accuracy = state.questions.length ? Math.round((summary.correct / state.questions.length) * 100) : 0;
  $('#scoreValue').textContent = Number.isInteger(summary.score) ? summary.score : summary.score.toFixed(1);
  $('.score-ring span').textContent = `/ ${maxScore}`;
  $('#accuracyValue').textContent = `${accuracy}%`;
  $('#timeUsed').textContent = formatTime(summary.timeUsed);
  $('#completionMessage').textContent = summary.timedOut ? 'Time is up. Your responses have been evaluated.' : 'Your responses have been evaluated. See what to carry into the next mock.';
  let headline = 'Keep building.';
  let description = 'Review the explanations and focus your next attempt on accuracy.';
  if (accuracy >= 80) { headline = 'Excellent work.'; description = 'Strong accuracy. Keep tightening timing and protect this consistency.'; }
  else if (accuracy >= 60) { headline = 'A solid attempt.'; description = 'You have a reliable base. Your review will turn near-misses into marks.'; }
  $('#scoreHeadline').textContent = headline;
  $('#scoreDescription').textContent = description;
  $('#markingNote').textContent = state.tier === 2 ? '+3 correct · −1 incorrect' : '+2 correct · −0.5 incorrect';
  renderSubjectAnalysis();
  renderReviewSectionTabs();
  renderAnswerReview('all');
}

function formatTime(totalSeconds) { return `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, '0')}s`; }
function resultType(index) { const answer = state.answers[index]; if (answer === null) return 'skipped'; return answer === state.questions[index].answerIndex ? 'correct' : 'incorrect'; }

function renderSubjectAnalysis() {
  const sections = [...new Set(state.questions.map((question) => question.section))];
  $('#subjectAnalysis').innerHTML = sections.map((section) => {
    const indexes = state.questions.map((q, i) => q.section === section ? i : -1).filter((i) => i >= 0);
    const correct = indexes.filter((index) => resultType(index) === 'correct').length;
    const percent = Math.round((correct / indexes.length) * 100);
    return `<article class="subject-card"><h3>${section}</h3><strong>${correct} / ${indexes.length}</strong><small>${percent}% correct</small><div class="mini-progress"><i style="width:${percent}%"></i></div></article>`;
  }).join('');
}

let activeReviewSection = 'all';

function renderReviewSectionTabs() {
  const sections = [...new Set(state.questions.map((question) => question.section))];
  const labels = {
    'General Intelligence & Reasoning': 'Reasoning',
    'Reasoning and General Intelligence': 'Reasoning',
    'General Awareness': 'General Awareness',
    'Quantitative Aptitude': 'Quantitative',
    'Mathematical Abilities': 'Mathematics',
    'English Comprehension': 'English',
    'English Language and Comprehension': 'English',
    'Computer Knowledge Test': 'Computer'
  };
  $('#reviewSectionTabs').innerHTML = `<button class="review-section-tab ${activeReviewSection === 'all' ? 'active' : ''}" data-section="all">All sections <small>${state.questions.length}</small></button>` + sections.map((section) => {
    const sectionIndexes = state.questions.map((question, index) => question.section === section ? index : -1).filter((index) => index >= 0);
    const correct = sectionIndexes.filter((index) => resultType(index) === 'correct').length;
    return `<button class="review-section-tab ${activeReviewSection === section ? 'active' : ''}" data-section="${section}">${labels[section] || section} <small>${correct}/${sectionIndexes.length}</small></button>`;
  }).join('');
  document.querySelectorAll('.review-section-tab').forEach((tab) => tab.addEventListener('click', () => {
    activeReviewSection = tab.dataset.section;
    renderReviewSectionTabs();
    renderAnswerReview(document.querySelector('.filter.active').dataset.filter);
  }));
}

function renderAnswerReview(filter) {
  const items = state.questions.map((question, index) => ({ question, index, type: resultType(index) })).filter((item) => (filter === 'all' || item.type === filter) && (activeReviewSection === 'all' || item.question.section === activeReviewSection));
  const shownSection = activeReviewSection === 'all' ? 'All four sections' : activeReviewSection;
  $('#reviewSectionSummary').textContent = `${shownSection} · ${items.length} question${items.length === 1 ? '' : 's'} shown`;
  $('#answerReview').innerHTML = items.length ? items.map(({ question, index, type }) => {
    const answer = state.answers[index];
    const status = type === 'correct' ? 'Correct' : type === 'incorrect' ? 'Incorrect' : 'Skipped';
    const userAnswer = answer === null ? 'Not answered' : `${letters[answer]}. ${question.options[answer]}`;
    const rightAnswer = `${letters[question.answerIndex]}. ${question.options[question.answerIndex]}`;
    return `<article class="review-item ${type}"><div class="review-head"><span class="review-index">QUESTION ${index + 1} · ${question.section}</span><span class="review-status">${status}</span></div><p class="review-question">${question.question}</p><p class="review-answer">Your answer: <strong>${userAnswer}</strong></p>${type !== 'correct' ? `<p class="review-answer">Correct answer: <strong>${rightAnswer}</strong></p>` : ''}<div class="explanation"><strong>Why:</strong> ${question.explanation}</div></article>`;
  }).join('') : '<p class="empty-review">No questions match this filter.</p>';
}

$('#reviewFilters').addEventListener('click', (event) => {
  const button = event.target.closest('.filter');
  if (!button) return;
  document.querySelectorAll('.filter').forEach((filter) => filter.classList.toggle('active', filter === button));
  renderAnswerReview(button.dataset.filter);
});
$('#retryButton').addEventListener('click', () => { clearInterval(state.timerId); showView('setup'); });
