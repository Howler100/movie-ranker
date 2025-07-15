// movie-ranker.js
(async () => {
  const STORAGE_KEY = 'mcuRanking';
  const params      = new URLSearchParams(window.location.search);
  const theme       = params.get('theme')    || 'starwars';
  const category    = params.get('category') || 'movies';

  // 1. Load Config
  try {
    await import(`./configs/${theme}-${category}-config.js`);
  } catch {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Could not load config for ${theme}/${category}</p>`;
    return;
  }
  const { theme: cfgTheme, movies } = window.MovieRankerConfig;

  // 2. Apply Theme
  document.documentElement.style.setProperty('--bg', `url('${cfgTheme.background}')`);
  document.documentElement.style.setProperty('--font', cfgTheme.fontFamily);

  // 3. UI Refs
  const container = document.getElementById('container');
  const question  = document.getElementById('question');
  const choices   = document.getElementById('choices');
  const resultDiv = document.getElementById('result');
  const controls  = document.getElementById('controls');
  const resetBtn  = document.getElementById('reset-btn');
  const homeBtn   = document.getElementById('home-btn');
  const backBtn   = document.getElementById('back-btn');

  // 4. Picks state
  let picks = [];
  let stepIndex = 0;

  // 5. Button handlers
  resetBtn.onclick = () => { localStorage.removeItem(STORAGE_KEY); location.reload(); };
  homeBtn.onclick  = () => { localStorage.removeItem(STORAGE_KEY); window.location = 'index.html'; };
  backBtn.onclick  = () => {
    if (picks.length > 0) {
      picks.pop();
      stepIndex = picks.length;
      // replay up to next compare
      showLoading();
      runMergeSort(movies.map(m => ({ ...m }))).then(sorted => showResult(sorted));
    }
  };

  // 6. Init
  function init() {
    controls.style.display = 'none';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      showResult(JSON.parse(saved));
    } else {
      startMergeSort();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

  // 7. Start fresh
  function startMergeSort() {
    picks = [];
    stepIndex = 0;
    showLoading();
    runMergeSort(movies.map(m => ({ ...m }))).then(sorted => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      showResult(sorted);
    });
  }

  // 8. Show loading overlay
  function showLoading() {
    question.innerHTML = '<h1>Loading…</h1>';
    choices.style.display = 'none';
    controls.style.display = 'none';
  }

  // 9. Merge-sort logic
  async function runMergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid   = Math.floor(arr.length / 2);
    const left  = await runMergeSort(arr.slice(0, mid));
    const right = await runMergeSort(arr.slice(mid));
    return await merge(left, right);
  }

  function merge(left, right) {
    return new Promise(resolve => {
      const merged = [];
      (async function step() {
        if (left.length && right.length) {
          if (stepIndex < picks.length) {
            // replay pick
            const c = picks[stepIndex++];
            merged.push(c === 0 ? left.shift() : right.shift());
            await step();
          } else {
            // prompt user
            const c = await showComparison(left[0], right[0]);
            picks.push(c);
            stepIndex++;
            merged.push(c === 0 ? left.shift() : right.shift());
            await step();
          }
        } else {
          resolve(merged.concat(left, right));
        }
      })();
    });
  }

  // 10. Show comparison UI
  function showComparison(a, b) {
    return new Promise(resolve => {
      question.innerHTML = '<h1>Which do you prefer?</h1>';
      choices.innerHTML = '';
      choices.style.display = 'flex';
      controls.style.display = 'flex';
      backBtn.style.display = picks.length > 0 ? 'inline-block' : 'none';

      [a, b].forEach((m, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.onclick = () => resolve(i);
        const img = document.createElement('img');
        img.src = m.poster; img.alt = m.title;
        btn.appendChild(img);
        choices.appendChild(btn);
      });
    });
  }

  // 11. Show final results
  function showResult(sorted) {
    question.innerHTML = '<h1>Ranking complete!</h1>';
    choices.style.display = 'none';
    container.classList.add('results-active');
    controls.style.display = 'flex';
    backBtn.style.display = 'none';

    resultDiv.style.display = 'grid';
    resultDiv.innerHTML = '';
    sorted.forEach((m, i) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const info = document.createElement('div'); info.className = 'info';
      const rank = document.createElement('div'); rank.className = 'rank'; rank.textContent = i + 1;
      const pc   = document.createElement('div'); pc.className = 'poster-container';
      const img  = document.createElement('img'); img.src = m.poster; img.alt = m.title;
      const ttl  = document.createElement('div'); ttl.className = 'title'; ttl.textContent = m.title;
      pc.append(img, ttl);
      info.append(rank, pc);
      item.append(info);
      resultDiv.appendChild(item);
    });
  }
})();
