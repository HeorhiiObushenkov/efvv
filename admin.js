let currentDatabase = [];
let maxIdNum = 0;

const els = {
  dbStatus: document.getElementById('db-status'),
  btnCopyPrompt: document.getElementById('btn-copy-prompt'),
  aiPrompt: document.getElementById('ai-prompt'),
  jsonInput: document.getElementById('json-input'),
  btnProcess: document.getElementById('btn-process'),
  errorMsg: document.getElementById('error-msg'),
  successMsg: document.getElementById('success-msg')
};

// Завантаження поточної бази
async function loadDatabase() {
  try {
    const res = await fetch('questions.json');
    if (res.ok) {
      currentDatabase = await res.json();
      els.dbStatus.textContent = `Поточна база: ${currentDatabase.length} питань`;
      
      // Знаходимо максимальний номер id
      currentDatabase.forEach(q => {
        if (q.id && q.id.startsWith('q-')) {
          const num = parseInt(q.id.replace('q-', ''), 10);
          if (!isNaN(num) && num > maxIdNum) {
            maxIdNum = num;
          }
        }
      });
      
      els.btnProcess.disabled = false;
    } else {
      els.dbStatus.textContent = `Помилка завантаження бази (статус ${res.status})`;
      els.dbStatus.classList.replace('badge-neutral', 'badge-error');
    }
  } catch (e) {
    els.dbStatus.textContent = "Файл questions.json не знайдено. Буде створено нову базу.";
    els.btnProcess.disabled = false;
  }
}

// Копіювання промпту
els.btnCopyPrompt.addEventListener('click', () => {
  els.aiPrompt.select();
  document.execCommand('copy');
  
  const originalHtml = els.btnCopyPrompt.innerHTML;
  els.btnCopyPrompt.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Скопійовано';
  els.btnCopyPrompt.classList.replace('btn-outline', 'btn-success');
  
  lucide.createIcons();
  
  setTimeout(() => {
    els.btnCopyPrompt.innerHTML = originalHtml;
    els.btnCopyPrompt.classList.replace('btn-success', 'btn-outline');
    lucide.createIcons();
  }, 2000);
});

// Обробка вставленого JSON
els.btnProcess.addEventListener('click', () => {
  els.errorMsg.classList.add('hidden');
  els.successMsg.classList.add('hidden');
  
  const rawInput = els.jsonInput.value.trim();
  if (!rawInput) {
    showError("Вставте JSON масив");
    return;
  }
  
  try {
    let newQuestions = JSON.parse(rawInput);
    
    if (!Array.isArray(newQuestions)) {
      showError("Код не є масивом JSON. Переконайтеся, що ви вставили [...]");
      return;
    }
    
    // Перевірка базової структури хоча б першого елемента
    if (newQuestions.length > 0) {
      const first = newQuestions[0];
      if (!first.question || !first.options || !Array.isArray(first.options)) {
        showError("Неправильна структура об'єктів. Перевірте поля question, options.");
        return;
      }
    }
    
    // Присвоєння ID та об'єднання
    const addedCount = newQuestions.length;
    let localMaxId = maxIdNum;
    
    newQuestions = newQuestions.map(q => {
      localMaxId++;
      const newQ = {
        id: `q-${String(localMaxId).padStart(3, '0')}`,
        question: q.question,
        options: q.options,
        correctOptionId: q.correctOptionId
      };
      if (q.imageUrl) newQ.imageUrl = q.imageUrl;
      return newQ;
    });
    
    const updatedDatabase = [...currentDatabase, ...newQuestions];
    
    // Створення файлу для завантаження
    const jsonString = JSON.stringify(updatedDatabase, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess(`Успішно оброблено! Згенеровано ${addedCount} нових питань. Файл завантажується... \nПеремістіть його в папку проекту із заміною старого файлу.`);
    els.jsonInput.value = '';
    
  } catch (e) {
    showError(`Помилка парсингу JSON: ${e.message}`);
  }
});

function showError(msg) {
  els.errorMsg.textContent = msg;
  els.errorMsg.classList.remove('hidden');
}

function showSuccess(msg) {
  els.successMsg.textContent = msg;
  els.successMsg.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', loadDatabase);
