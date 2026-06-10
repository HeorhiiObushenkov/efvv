// Стан додатку
let state = {
  questions: [],
  answers: {}, // { "q-001": "b", "q-002": "a" }
  checkedQuestions: {}, // { "q-001": true }
  currentIndex: 0,
  isFinished: false
};
let isReviewMode = false;
let selectedTestSize = 140;

const STORAGE_KEY = 'efvv_state';
let confirmCallback = null;

// Офіційні таблиці переведення балів
const SCORING_TABLES = {
  140: {
    35: 100, 36: 101, 37: 102, 38: 103, 39: 104, 40: 105, 41: 106, 42: 107, 43: 108, 44: 109, 45: 110,
    46: 111, 47: 112, 48: 113.5, 49: 115, 50: 116.5, 51: 118, 52: 119.5, 53: 121, 54: 122.5, 55: 124,
    56: 125.5, 57: 127, 58: 128.5, 59: 130, 60: 131.5, 61: 133, 62: 134.5, 63: 136, 64: 137.5, 65: 139,
    66: 140.5, 67: 142, 68: 143.5, 69: 145, 70: 146.5, 71: 148, 72: 149, 73: 150, 74: 151, 75: 152,
    76: 153, 77: 154, 78: 155, 79: 156, 80: 157, 81: 158, 82: 159, 83: 160, 84: 161, 85: 162, 86: 163,
    87: 164, 88: 165, 89: 166, 90: 167, 91: 168, 92: 169, 93: 170, 94: 171, 95: 172, 96: 173, 97: 174,
    98: 175, 99: 176, 100: 177, 101: 178, 102: 179, 103: 180, 104: 181, 105: 182, 106: 183, 107: 183.5,
    108: 184, 109: 184.5, 110: 185, 111: 185.5, 112: 186, 113: 186.5, 114: 187, 115: 187.5, 116: 188,
    117: 188.5, 118: 189, 119: 189.5, 120: 190, 121: 190.5, 122: 191, 123: 191.5, 124: 192, 125: 192.5,
    126: 193, 127: 193.5, 128: 194, 129: 194.5, 130: 195, 131: 195.5, 132: 196, 133: 196.5, 134: 197,
    135: 197.5, 136: 198, 137: 198.5, 138: 199, 139: 199.5, 140: 200
  }
};

// DOM Елементи
const els = {
  themeToggle: document.getElementById('theme-toggle'),
  loader: document.getElementById('loader'),
  startScreen: document.getElementById('start-screen'),
  testScreen: document.getElementById('test-screen'),
  resultsScreen: document.getElementById('results-screen'),
  errorScreen: document.getElementById('error-screen'),
  
  btnStart: document.getElementById('btn-start'),
  btnResetSaved: document.getElementById('btn-reset-saved'),
  continueInfo: document.getElementById('continue-info'),
  savedProgressText: document.getElementById('saved-progress-text'),
  
  testSizeBtns: document.querySelectorAll('.test-size-btn'),
  testSizeContainer: document.getElementById('test-size-container'),
  historySection: document.getElementById('history-section'),
  historyTbody: document.getElementById('history-tbody'),
  
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnReset: document.getElementById('btn-reset'),
  btnCheckAnswer: document.getElementById('btn-check-answer'),
  btnFinish: document.getElementById('btn-finish'),
  btnFinishSidebar: document.getElementById('btn-finish-sidebar'),
  btnBackResults: document.getElementById('btn-back-results'),
  btnBackResultsSidebar: document.getElementById('btn-back-results-sidebar'),
  
  confirmModal: document.getElementById('confirm-modal'),
  confirmTitle: document.getElementById('confirm-title'),
  confirmMessage: document.getElementById('confirm-message'),
  btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
  btnConfirmOk: document.getElementById('btn-confirm-ok'),
  
  questionCounter: document.getElementById('question-counter'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  
  navGridContainer: document.getElementById('nav-grid-container'),
  answeredCount: document.getElementById('answered-count'),
  
  resultRaw: document.getElementById('result-raw'),
  resultScaled: document.getElementById('result-scaled'),
  btnReview: document.getElementById('btn-review'),
  btnRestart: document.getElementById('btn-restart')
};

// Ініціалізація
async function init() {
  initTheme();
  renderHistory();
  
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.questions && parsed.questions.length > 0) {
        state = parsed;
        if (state.isFinished) {
            calculateResults(false);
            els.loader.classList.add('hidden');
            els.resultsScreen.classList.remove('hidden');
            return;
        } else {
            els.continueInfo.classList.remove('hidden');
            // Hide test size selection if continuing
            if(els.testSizeContainer) els.testSizeContainer.classList.add('hidden');
            const answered = Object.keys(state.answers).length;
            els.savedProgressText.textContent = `Питання ${state.currentIndex + 1} зі ${state.questions.length} (Відповідей: ${answered})`;
            els.btnStart.textContent = 'Продовжити тест';
        }
      }
    } catch (e) {
      console.error("Помилка читання localStorage", e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  els.loader.classList.add('hidden');
  els.startScreen.classList.remove('hidden');
  els.startScreen.classList.add('flex');
  
  // Обробники подій
  els.btnStart.addEventListener('click', startTest);
  els.btnResetSaved.addEventListener('click', resetSavedProgress);
  els.btnPrev.addEventListener('click', () => goToQuestion(state.currentIndex - 1));
  els.btnNext.addEventListener('click', () => goToQuestion(state.currentIndex + 1));
  if (els.btnCheckAnswer) els.btnCheckAnswer.addEventListener('click', checkCurrentAnswer);
  els.btnReset.addEventListener('click', confirmReset);
  els.btnFinish.addEventListener('click', finishTest);
  els.btnFinishSidebar.addEventListener('click', finishTest);
  els.btnReview.addEventListener('click', enterReviewMode);
  els.btnRestart.addEventListener('click', resetSavedProgress);
  els.themeToggle.addEventListener('change', toggleTheme);
  
  if (els.btnBackResults) els.btnBackResults.addEventListener('click', leaveReviewMode);
  if (els.btnBackResultsSidebar) els.btnBackResultsSidebar.addEventListener('click', leaveReviewMode);

  els.btnConfirmCancel.addEventListener('click', () => {
     els.confirmModal.close();
     confirmCallback = null;
  });
  els.btnConfirmOk.addEventListener('click', () => {
     els.confirmModal.close();
     if (confirmCallback) confirmCallback();
     confirmCallback = null;
  });

  els.testSizeBtns = document.querySelectorAll('.test-size-btn');
  els.testSizeBtns.forEach(btn => {
     btn.addEventListener('click', (e) => {
        selectedTestSize = parseInt(e.target.dataset.size, 10);
        els.testSizeBtns.forEach(b => {
           b.classList.remove('btn-primary');
           b.classList.add('btn-outline');
        });
        e.target.classList.remove('btn-outline');
        e.target.classList.add('btn-primary');
     });
  });
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('efvv_history') || '[]');
  els.historySection = document.getElementById('history-section');
  els.historyTbody = document.getElementById('history-tbody');
  
  if (!els.historySection || !els.historyTbody) return;

  if (history.length === 0) {
      els.historySection.classList.add('hidden');
      return;
  }
  
  els.historySection.classList.remove('hidden');
  els.historyTbody.innerHTML = '';
  
  history.forEach(item => {
     const d = new Date(item.date);
     const dateStr = d.toLocaleDateString('uk-UA') + ' ' + d.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'});
     
     const tr = document.createElement('tr');
     tr.innerHTML = `
        <td class="whitespace-nowrap opacity-80 text-xs sm:text-sm">${dateStr}</td>
        <td class="text-center">${item.total}</td>
        <td class="text-center font-medium">${item.correct}</td>
        <td class="text-right font-bold text-secondary">${item.scaled}</td>
     `;
     els.historyTbody.appendChild(tr);
  });
  if(window.lucide) lucide.createIcons();
}

// Завантаження питань з JSON
async function fetchQuestions() {
  try {
    els.btnStart.disabled = true;
    els.btnStart.innerHTML = '<span class="loading loading-spinner"></span> Завантаження...';
    
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    // Завантажуємо історію показів питань
    const weights = JSON.parse(localStorage.getItem('efvv_question_weights') || '{}');
    
    // Оцінюємо кожне питання: випадкове число ділиться на (кількість показів + 1)
    // Чим частіше питання траплялось, тим менший його максимальний бал
    const scoredQuestions = data.map(q => {
        const seenCount = weights[q.id] || 0;
        const score = Math.random() / (seenCount + 1);
        return { q, score };
    });
    
    // Сортуємо за спаданням балу (найбільший бал - найвищий пріоритет)
    scoredQuestions.sort((a, b) => b.score - a.score);
    
    // Відбираємо питання
    state.questions = scoredQuestions.slice(0, selectedTestSize).map(item => item.q);
    
    // Оновлюємо статистику показів для відібраних питань
    state.questions.forEach(q => {
        weights[q.id] = (weights[q.id] || 0) + 1;
    });
    localStorage.setItem('efvv_question_weights', JSON.stringify(weights));
    
    // Перемішуємо варіанти відповідей для кожного питання (Fisher-Yates)
    state.questions.forEach(q => {
      if (q.options && Array.isArray(q.options)) {
         for (let i = q.options.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
         }
      }
    });

    state.answers = {};
    state.checkedQuestions = {};
    state.currentIndex = 0;
    state.isFinished = false;
    
    saveState();
    return true;
  } catch (error) {
    console.error("Помилка завантаження питань:", error);
    els.startScreen.classList.add('hidden');
    els.startScreen.classList.remove('flex');
    els.errorScreen.classList.remove('hidden');
    return false;
  } finally {
    els.btnStart.disabled = false;
    els.btnStart.textContent = 'Почати тест';
  }
}

// Початок тесту
async function startTest() {
  if (state.questions.length === 0) {
    const success = await fetchQuestions();
    if (!success) return;
  }
  
  els.startScreen.classList.add('hidden');
  els.startScreen.classList.remove('flex');
  els.testScreen.classList.remove('hidden');
  
  renderNavGrid();
  goToQuestion(state.currentIndex);
}

function showConfirm(title, message, onConfirm) {
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  els.confirmModal.showModal();
}

// Скидання прогресу
function resetSavedProgress() {
  showConfirm('Скинути прогрес?', 'Ви впевнені, що хочете скинути прогрес і повернутися на головну?', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = { questions: [], answers: {}, checkedQuestions: {}, currentIndex: 0, isFinished: false };
    isReviewMode = false;
    
    els.continueInfo.classList.add('hidden');
    if(els.testSizeContainer) els.testSizeContainer.classList.remove('hidden');
    els.btnStart.textContent = 'Почати тест';
    els.resultsScreen.classList.add('hidden');
    els.testScreen.classList.add('hidden');
    els.startScreen.classList.remove('hidden');
    els.startScreen.classList.add('flex');
    els.btnReset.classList.remove('hidden');
    els.btnFinishSidebar.classList.remove('hidden');
    if(els.btnBackResultsSidebar) els.btnBackResultsSidebar.classList.add('hidden');
  });
}

function confirmReset() {
  resetSavedProgress();
  if (state.questions.length === 0) {
    els.testScreen.classList.add('hidden');
  }
}

// Навігація по питаннях
function goToQuestion(index) {
  if (index < 0 || index >= state.questions.length) return;
  
  state.currentIndex = index;
  if(!isReviewMode) saveState();
  
  renderQuestion();
  updateNavGrid();
  updateControls();
}

// Нормалізація відповіді (числа з комою або крапкою, регістр)
function normalizeAnswer(val) {
    if (!val && val !== 0) return "";
    let str = String(val).trim();
    if (/^-?\d+([.,]\d+)?$/.test(str)) {
        return parseFloat(str.replace(',', '.')).toString();
    }
    return str.toLowerCase();
}

// Відображення поточного питання
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  const isChecked = state.checkedQuestions && state.checkedQuestions[q.id];
  const showResult = isReviewMode || isChecked;
  
  els.questionCounter.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  els.questionText.textContent = q.question;
  
  const existingImg = document.getElementById('question-image');
  if (existingImg) {
    existingImg.remove();
  }
  
  if (q.imageUrl) {
    const img = document.createElement('img');
    img.id = 'question-image';
    img.src = q.imageUrl;
    img.alt = 'Зображення до питання';
    img.className = 'max-w-full sm:max-w-md h-auto rounded-xl mb-6 border border-base-300 shadow-sm mx-auto object-contain';
    els.questionText.after(img);
  }
  
  els.optionsContainer.innerHTML = '';
  
  if (q.type === 'input' || !q.options || q.options.length === 0) {
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'mt-4 flex flex-col gap-2';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input input-bordered w-full max-w-sm';
      input.placeholder = 'Введіть вашу відповідь...';
      input.value = state.answers[q.id] || '';
      
      if (showResult) {
          input.disabled = true;
          const isCorrect = normalizeAnswer(state.answers[q.id]) === normalizeAnswer(q.correctAnswer || q.correctOptionId);
          
          if (isCorrect) {
              input.classList.add('input-success', 'text-success-content', 'bg-success/10');
          } else {
              input.classList.add('input-error', 'text-error-content', 'bg-error/10');
              const correctInfo = document.createElement('div');
              correctInfo.className = 'text-sm text-success font-medium flex items-center gap-1';
              correctInfo.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i> Правильна відповідь: ${q.correctAnswer || q.correctOptionId}`;
              inputWrapper.appendChild(correctInfo);
          }
      } else {
          input.addEventListener('input', (e) => {
              state.answers[q.id] = e.target.value;
              saveState();
              updateNavGrid();
          });
      }
      
      inputWrapper.insertBefore(input, inputWrapper.firstChild);
      els.optionsContainer.appendChild(inputWrapper);
      
      if (showResult) lucide.createIcons();
      return;
  }

  const isMulti = Array.isArray(q.correctOptionId);

  q.options.forEach(opt => {
    let isSelected;
    let isCorrect;

    if (isMulti) {
      isSelected = Array.isArray(state.answers[q.id]) && state.answers[q.id].includes(opt.id);
      isCorrect = q.correctOptionId.includes(opt.id);
    } else {
      isSelected = state.answers[q.id] === opt.id;
      isCorrect = opt.id === q.correctOptionId;
    }
    
    let labelClass = `p-4 border rounded-xl transition-all flex gap-3 items-start border-base-300`;
    let iconHtml = '';
    
    if (showResult) {
      if (isCorrect && isSelected) {
        labelClass = `p-4 border rounded-xl flex gap-3 items-start bg-success/20 border-success text-success-content font-medium`;
        iconHtml = '<i data-lucide="check-circle-2" class="w-5 h-5 text-success mt-0.5"></i>';
      } else if (isCorrect && !isSelected) {
        labelClass = `p-4 border rounded-xl flex gap-3 items-start border-success text-success-content font-medium`;
        iconHtml = '<i data-lucide="info" class="w-5 h-5 text-success mt-0.5"></i>';
      } else if (!isCorrect && isSelected) {
        labelClass = `p-4 border rounded-xl flex gap-3 items-start bg-error/20 border-error text-error-content font-medium`;
        iconHtml = '<i data-lucide="x-circle" class="w-5 h-5 text-error mt-0.5"></i>';
      } else {
        labelClass = `p-4 border rounded-xl flex gap-3 items-start border-base-300 opacity-60`;
        iconHtml = '<div class="w-5 h-5 mt-0.5 opacity-0"></div>';
      }
    } else {
      labelClass += ` cursor-pointer hover:border-primary hover:bg-base-200 ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`;
    }

    const label = document.createElement('label');
    label.className = labelClass;
    
    if (showResult) {
        const iconDiv = document.createElement('div');
        iconDiv.innerHTML = iconHtml;
        label.appendChild(iconDiv);
    } else {
        const input = document.createElement('input');
        input.type = isMulti ? 'checkbox' : 'radio';
        input.name = `question-${q.id}`;
        input.value = opt.id;
        input.className = `${isMulti ? 'checkbox checkbox-primary' : 'radio radio-primary'} mt-0.5`;
        input.checked = isSelected;
        input.addEventListener('change', () => selectOption(q.id, opt.id));
        label.appendChild(input);
    }
    
    const textSpan = document.createElement('span');
    textSpan.className = 'flex-1 pt-0.5 flex flex-col gap-2';
    
    const textNode = document.createElement('div');
    textNode.textContent = opt.text;
    textSpan.appendChild(textNode);
    
    if (opt.imageUrl) {
        const optImg = document.createElement('img');
        optImg.src = opt.imageUrl;
        optImg.alt = 'Варіант відповіді';
        optImg.className = 'max-w-[200px] max-h-[150px] object-contain rounded-lg border border-base-200 bg-base-100 shadow-sm';
        textSpan.appendChild(optImg);
    }
    
    label.appendChild(textSpan);
    els.optionsContainer.appendChild(label);
  });
  
  if (showResult) {
      lucide.createIcons();
  }
}

// Вибір варіанту відповіді
function selectOption(qId, optId) {
  if(isReviewMode) return;
  if(state.checkedQuestions && state.checkedQuestions[qId]) return;
  
  const q = state.questions.find(quest => quest.id === qId);
  const isMulti = Array.isArray(q.correctOptionId);

  if (isMulti) {
    if (!state.answers[qId] || !Array.isArray(state.answers[qId])) {
      state.answers[qId] = [];
    }
    const idx = state.answers[qId].indexOf(optId);
    if (idx > -1) {
      state.answers[qId].splice(idx, 1);
    } else {
      state.answers[qId].push(optId);
    }
    if (state.answers[qId].length === 0) {
      delete state.answers[qId];
    }
  } else {
    state.answers[qId] = optId;
  }
  
  saveState();
  
  renderQuestion();
  updateNavGrid();
}

// Оновлення кнопок керування
function updateControls() {
  els.btnPrev.disabled = state.currentIndex === 0;
  
  const q = state.questions[state.currentIndex];
  const isChecked = state.checkedQuestions && state.checkedQuestions[q.id];
  
  if (els.btnCheckAnswer) {
      if (isReviewMode || isChecked) {
          els.btnCheckAnswer.classList.add('hidden');
      } else {
          els.btnCheckAnswer.classList.remove('hidden');
      }
  }

  if (state.currentIndex === state.questions.length - 1) {
    els.btnNext.classList.add('hidden');
    if (!isReviewMode) els.btnFinish.classList.remove('hidden');
  } else {
    els.btnNext.classList.remove('hidden');
    els.btnFinish.classList.add('hidden');
  }
  
  if (isReviewMode) {
    els.btnFinish.classList.add('hidden');
    els.btnBackResults.classList.remove('hidden');
  } else {
    els.btnBackResults.classList.add('hidden');
  }
}

// Перевірка поточної відповіді під час тесту
function checkCurrentAnswer() {
  if (isReviewMode) return;
  const q = state.questions[state.currentIndex];
  
  if (!state.checkedQuestions) state.checkedQuestions = {};
  state.checkedQuestions[q.id] = true;
  saveState();
  
  renderQuestion();
  updateNavGrid();
  updateControls();
}

// Рендер навігаційної сітки
function renderNavGrid() {
  els.navGridContainer.innerHTML = '';
  
  state.questions.forEach((q, i) => {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm btn-circle text-xs nav-btn-${i}`;
    btn.textContent = i + 1;
    btn.addEventListener('click', () => goToQuestion(i));
    els.navGridContainer.appendChild(btn);
  });
  
  updateNavGrid();
}

// Оновлення стилів навігаційної сітки
function updateNavGrid() {
  let answeredCount = 0;
  
  state.questions.forEach((q, i) => {
    const btn = els.navGridContainer.querySelector(`.nav-btn-${i}`);
    if (!btn) return;
    
    const isMulti = Array.isArray(q.correctOptionId);
    let isAnswered;
    if (q.type === 'input' || !q.options) {
        isAnswered = !!state.answers[q.id] && String(state.answers[q.id]).trim().length > 0;
    } else if (isMulti) {
        isAnswered = state.answers[q.id] && state.answers[q.id].length > 0;
    } else {
        isAnswered = !!state.answers[q.id];
    }

    const isCurrent = i === state.currentIndex;
    
    if (isAnswered) answeredCount++;
    
    // Reset classes
    btn.className = `btn btn-sm btn-circle text-xs nav-btn-${i}`;
    
    const isChecked = state.checkedQuestions && state.checkedQuestions[q.id];
    const showResult = isReviewMode || isChecked;
    
    if (showResult) {
       let isCorrect = false;
       let isPartiallyCorrect = false;
       
       if (q.type === 'input' || !q.options) {
           isCorrect = normalizeAnswer(state.answers[q.id]) === normalizeAnswer(q.correctAnswer || q.correctOptionId);
       } else if (isMulti) {
           const ans = state.answers[q.id] || [];
           isCorrect = ans.length === q.correctOptionId.length && q.correctOptionId.every(id => ans.includes(id));
           if (!isCorrect && ans.length > 0) {
               isPartiallyCorrect = ans.some(id => q.correctOptionId.includes(id));
           }
       } else {
           isCorrect = state.answers[q.id] === q.correctOptionId;
       }

       if (isCorrect) {
          btn.classList.add('btn-success', 'text-success-content');
       } else if (isPartiallyCorrect) {
          btn.classList.add('btn-warning', 'text-warning-content');
       } else if (isAnswered) {
          btn.classList.add('btn-error', 'text-error-content');
       } else {
          btn.classList.add('btn-neutral', 'opacity-50');
       }
       if (isCurrent) {
          btn.classList.add('ring-2', 'ring-offset-2', 'ring-offset-base-100');
       }
    } else {
        if (isCurrent) {
          btn.classList.add('btn-primary', 'ring-2', 'ring-offset-2', 'ring-offset-base-100');
        } else if (isAnswered) {
          btn.classList.add('btn-neutral');
        } else {
          btn.classList.add('btn-outline', 'border-base-300');
        }
    }
  });
  
  if(!isReviewMode) {
    els.answeredCount.textContent = `${answeredCount} / ${state.questions.length}`;
  }
}

// Завершення тесту
function finishTest() {
  if (state.isFinished) {
      els.testScreen.classList.add('hidden');
      els.resultsScreen.classList.remove('hidden');
      return;
  }
  
  const answeredCount = Object.keys(state.answers).length;
  if (answeredCount < state.questions.length) {
    showConfirm('Завершити тест?', `Ви дали відповідь лише на ${answeredCount} з ${state.questions.length} питань. Ви впевнені, що хочете завершити тест?`, processFinishTest);
  } else {
    processFinishTest();
  }
}

function processFinishTest() {
  state.isFinished = true;
  saveState();
  calculateResults(true);
  els.testScreen.classList.add('hidden');
  els.resultsScreen.classList.remove('hidden');
}

// Підрахунок результатів
function calculateResults(saveToHistoryFlag = false) {
  let correctCount = 0;
  
  state.questions.forEach(q => {
    if (q.type === 'input' || !q.options) {
        if (normalizeAnswer(state.answers[q.id]) === normalizeAnswer(q.correctAnswer || q.correctOptionId)) {
            correctCount++;
        }
    } else {
        const isMulti = Array.isArray(q.correctOptionId);
        if (isMulti) {
            const ans = state.answers[q.id] || [];
            if (ans.length === q.correctOptionId.length && q.correctOptionId.every(id => ans.includes(id))) {
                correctCount++;
            }
        } else {
            if (state.answers[q.id] === q.correctOptionId) {
              correctCount++;
            }
        }
    }
  });
  
  els.resultRaw.textContent = `${correctCount} / ${state.questions.length}`;
  
  const maxQ = state.questions.length || 1;
  let finalScore = "Не склав";
  let displayScore = "Не склав";
  let isFailed = false;

  if (maxQ === 140) {
    if (correctCount >= 35) {
      finalScore = SCORING_TABLES[140][correctCount] || 200;
      displayScore = finalScore.toFixed ? finalScore.toFixed(1).replace('.0', '') : finalScore;
    } else {
      isFailed = true;
    }
  } else if (maxQ === 60) {
    const threshold = 15;
    if (correctCount >= threshold) {
      finalScore = 100 + ((correctCount - threshold) / (60 - threshold)) * 100;
      displayScore = finalScore.toFixed(1).replace('.0', '');
    } else {
      isFailed = true;
    }
  } else if (maxQ === 30) {
    const threshold = 8;
    if (correctCount >= threshold) {
      finalScore = 100 + ((correctCount - threshold) / (30 - threshold)) * 100;
      displayScore = finalScore.toFixed(1).replace('.0', '');
    } else {
      isFailed = true;
    }
  } else {
    // Fallback logic
    const threshold = Math.round(maxQ * 0.25);
    if (correctCount >= threshold) {
      finalScore = 100 + ((correctCount - threshold) / (maxQ - threshold)) * 100;
      displayScore = finalScore.toFixed(1).replace('.0', '');
    } else {
      isFailed = true;
    }
  }

  els.resultScaled.textContent = displayScore;
  
  // Update visual styles if failed
  if (isFailed) {
    els.resultScaled.classList.remove('text-secondary', 'text-success');
    els.resultScaled.classList.add('text-error');
  } else {
    els.resultScaled.classList.remove('text-error');
    els.resultScaled.classList.add('text-secondary');
  }

  if (saveToHistoryFlag) {
     const history = JSON.parse(localStorage.getItem('efvv_history') || '[]');
     history.unshift({
        date: new Date().toISOString(),
        total: state.questions.length,
        correct: correctCount,
        scaled: displayScore
     });
     if (history.length > 15) history.pop(); // Keep last 15
     localStorage.setItem('efvv_history', JSON.stringify(history));
     renderHistory();
  }
}

// Вхід у режим перегляду помилок
function enterReviewMode() {
  isReviewMode = true;
  els.resultsScreen.classList.add('hidden');
  els.testScreen.classList.remove('hidden');
  
  els.btnFinishSidebar.classList.add('hidden');
  els.btnBackResultsSidebar.classList.remove('hidden');
  
  els.btnReset.classList.add('hidden');
  
  renderNavGrid();
  goToQuestion(0);
}

// Вихід з режиму перегляду помилок
function leaveReviewMode() {
  isReviewMode = false;
  els.testScreen.classList.add('hidden');
  els.resultsScreen.classList.remove('hidden');
  
  els.btnFinishSidebar.classList.remove('hidden');
  els.btnBackResultsSidebar.classList.add('hidden');
  els.btnReset.classList.remove('hidden');
}

// LocalStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Теми
function initTheme() {
  const savedTheme = localStorage.getItem('efvv_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  els.themeToggle.checked = savedTheme === 'dark';
}

function toggleTheme(e) {
  const newTheme = e.target.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('efvv_theme', newTheme);
}

// Запуск
document.addEventListener('DOMContentLoaded', init);
