// movie-ranker.js
(async () => {
  const STORAGE_KEY = 'mcuRanking';
  const params      = new URLSearchParams(window.location.search);
  const theme       = params.get('theme')    || 'starwars';
  const category    = params.get('category') || 'movies';

  // 1) Load the selected config
  try {
    await import(`./configs/${theme}-${category}-config.js`);
  } catch {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Could not load config for ${theme}/${category}</p>`;
    return;
  }
  const { theme: cfgTheme, movies } = window.MovieRankerConfig;

  // 2) Apply background & font
  document.documentElement.style.setProperty('--bg', `url('${cfgTheme.background}')`);
  document.documentElement.style.setProperty('--font', cfgTheme.fontFamily);

  // 3) Grab UI references
  const container = document.getElementById('container');
  const question  = document.getElementById('question');
  const choices   = document.getElementById('choices');
  const resultDiv = document.getElementById('result');
  const controls  = document.getElementById('controls');
  const resetBtn  = document.getElementById('reset-btn');
  const homeBtn   = document.getElementById('home-btn');

  // 4) Wire up Home & Reset
  homeBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = 'index.html';
  };
  resetBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  // 5) Initialization
  function init() {
    controls.style.display = 'none';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      showResult(JSON.parse(saved));
    } else {
      startRanking();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 6) Kick off the merge‐sort
  async function startRanking() {
    question.innerHTML = '<h1>Loading…</h1>';
    choices.style.display = 'none';
    controls.style.display = 'none';
    const sorted = await mergeSort(movies.map(m => ({ ...m })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    showResult(sorted);
  }

  // 7) Standard recursive mergeSort
  async function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid   = Math.floor(arr.length / 2);
    const left  = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    return merge(left, right);
  }

  // 8) Merge two sorted halves via user comparisons
  function merge(left, right) {
    return new Promise(resolve => {
      const merged = [];
      (function step() {
        if (left.length && right.length) {
          showComparison(left[0], right[0]).then(choice => {
            merged.push(choice === 0 ? left.shift() : right.shift());
            step();
          });
        } else {
          // one side is empty → append the rest
          resolve(merged.concat(left, right));
        }
      })();
    });
  }

  // 9) Show two posters and return 0 or 1
  function showComparison(a, b) {
    return new Promise(resolve => {
      question.innerHTML = '<h1>Which do you prefer?</h1>';
      choices.innerHTML = '';
      choices.style.display  = 'flex';
      controls.style.display = 'flex';

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

  // 10) Render the complete sorted list
  function showResult(sorted) {
    question.innerHTML = '<h1>Ranking complete!</h1>';
    choices.style.display = 'none';
    container.classList.add('results-active');
    controls.style.display = 'flex';

    resultDiv.style.display = 'grid';
    resultDiv.innerHTML = '';
    sorted.forEach((movie, i) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const info = document.createElement('div');
      info.className = 'info';

      const rank = document.createElement('div');
      rank.className = 'rank';
      rank.textContent = i + 1;

      const pc = document.createElement('div');
      pc.className = 'poster-container';
      const img = document.createElement('img');
      img.src = movie.poster;
      img.alt = movie.title;
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = movie.title;

      pc.append(img, title);
      info.append(rank, pc);
      item.append(info);
      resultDiv.appendChild(item);
    });
  }
})();
