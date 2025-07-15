// movie-ranker.js
(async () => {
  const STORAGE_KEY = 'mcuRanking';
  const params      = new URLSearchParams(window.location.search);
  const theme       = params.get('theme')    || 'starwars';
  const category    = params.get('category') || 'movies';

  // 1. Load remote config (sets window.MovieRankerConfig)
  try {
    await import(`./configs/${theme}-${category}-config.js`);
  } catch (e) {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Could not load config for ${theme}/${category}</p>`;
    return;
  }
  const cfg    = window.MovieRankerConfig;
  const movies = cfg.movies;

  // 2. Apply theme styles
  const { background, fontFamily } = cfg.theme;
  document.documentElement.style.setProperty('--bg', `url('${background}')`);
  document.documentElement.style.setProperty('--font', fontFamily);

  // 3. UI references
  const container = document.getElementById('container');
  const question  = document.getElementById('question');
  const choices   = document.getElementById('choices');
  const resultDiv = document.getElementById('result');
  const controls  = document.getElementById('controls');
  const resetBtn  = document.getElementById('reset-btn');
  const homeBtn   = document.getElementById('home-btn');
  const backBtn   = document.getElementById('back-btn');

  // 4. State for undo
  let picks = [];    // history of 0/1 choices
  let stepIndex = 0; // pointer into picks

  // 5. Button handlers
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
  homeBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = 'index.html';
  });
  backBtn.addEventListener('click', () => {
    if (picks.length > 0) {
      // remove last pick, rewind the pointer
      picks.pop();
      stepIndex = picks.length;
      // hide current UI and restart (replays picks up to this point)
      controls.style.display = 'none';
      choices.style.display  = 'none';
      resultDiv.style.display = 'none';
      runMergeSort(movies.map(m => ({ ...m })));
    }
  });

  // 6. Initialization
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
  } else {
    init();
  }

  // 7. Modified merge-sort allowing undo
  async function startMergeSort() {
    picks = [];
    stepIndex = 0;
    question.innerHTML = '<h1>Loading…</h1>';
    choices.style.display = 'none';
    controls.style.display = 'none';

    const sorted = await runMergeSort(movies.map(m => ({ ...m })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    showResult(sorted);
  }

  async function runMergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid   = Math.floor(arr.length / 2);
    const left  = await runMergeSort(arr.slice(0, mid));
    const right = await runMergeSort(arr.slice(mid));
    return runMerge(left, right);
  }

  function runMerge(left, right) {
    return new Promise(resolve => {
      const merged = [];
      (async function step() {
        if (left.length && right.length) {
          if (stepIndex < picks.length) {
            // replay an existing pick
            const choice = picks[stepIndex++];
            merged.push(choice === 0 ? left.shift() : right.shift());
            await step();
          } else {
            // new comparison
            const choice = await showComparison(left[0], right[0]);
            picks.push(choice);
            stepIndex++;
            merged.push(choice === 0 ? left.shift() : right.shift());
            await step();
          }
        } else {
          resolve(merged.concat(left, right));
        }
      })();
    });
  }

  // 8. UI: comparison
  function showComparison(a, b) {
    return new Promise(resolve => {
      question.innerHTML = '<h1>Which do you prefer?</h1>';
      choices.innerHTML = '';
      choices.style.display  = 'flex';
      controls.style.display = 'flex';

      backBtn.style.display = picks.length > 0 ? 'inline-block' : 'none';

      [a, b].forEach((movie, idx) => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.onclick = () => resolve(idx);
        const img = document.createElement('img');
        img.src = movie.poster;
        img.alt = movie.title;
        btn.appendChild(img);
        choices.appendChild(btn);
      });
    });
  }

  // 9. UI: results
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
      const title = document.createElement('div'); title.className = 'title'; title.textContent = m.title;
      pc.append(img, title);
      info.append(rank, pc);
      item.append(info);
      resultDiv.appendChild(item);
    });
  }
})();
