// movie-ranker.js
(async () => {
  const params      = new URLSearchParams(window.location.search);
  const theme       = params.get('theme')    || 'starwars';
  const category    = params.get('category') || 'movies';
  const posterSet   = params.get('posterSet') || 'current';

  // 1) Load the selected config
  try {
    await import(`./configs/${theme}-${category}-config.js`);
  } catch {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Could not load config for ${theme}/${category}</p>`;
    return;
  }
  const { theme: cfgTheme, movies } = window.MovieRankerConfig;

  // Some configs offer alternate poster collections (movie.posters = {key: url})
  // instead of a single movie.poster; resolve the chosen set here so the rest
  // of the app only ever deals with movie.poster.
  const usesPosterSets = movies.some(m => m.posters);
  if (usesPosterSets) {
    movies.forEach(m => {
      if (!m.posters) return;
      m.poster = m.posters[posterSet] || m.posters.current || m.posters.mp || Object.values(m.posters)[0];
    });
  }
  const STORAGE_KEY = usesPosterSets
    ? `${theme}-${category}-${posterSet}-Ranking`
    : `${theme}-${category}-Ranking`;

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
  const undoBtn   = document.getElementById('undo-btn');

  let placedCount     = 0;
  let totalPlacements = 0;
  let undoAction       = null;

  // 4) Wire up Home & Reset
  homeBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = 'index.html';
  };
  resetBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };
  undoBtn.onclick = () => undoLastComparison();

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
    placedCount     = 0;
    totalPlacements = countPlacements(movies.length);
    undoAction      = null;
    const sorted = await mergeSort(movies.map(m => ({ ...m })));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    showResult(sorted);
  }

  // 7) Exact count of item-placements across the whole merge tree, computed
  // structurally (same split as mergeSort) so it's known before any
  // comparisons happen — not an estimate like n*log2(n).
  function countPlacements(n) {
    if (n <= 1) return 0;
    const mid = Math.floor(n / 2);
    return countPlacements(mid) + countPlacements(n - mid) + n;
  }

  // 8) Standard recursive mergeSort
  async function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid   = Math.floor(arr.length / 2);
    const left  = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    return merge(left, right);
  }

  // 9) Merge two sorted halves via user comparisons. Every push at every
  // recursion level counts toward placedCount, so progress moves smoothly
  // from the first comparison instead of jumping only during the final merge.
  // ask() is factored out so undoLastComparison() can re-invoke the exact
  // same comparison after reverting its effect on left/right/merged.
  function merge(left, right) {
    return new Promise(resolve => {
      const merged = [];
      function step() {
        if (left.length && right.length) {
          ask(left[0], right[0]);
        } else {
          // one side is empty → append the rest
          const rest = left.concat(right);
          placedCount += rest.length;
          resolve(merged.concat(rest));
        }
      }
      function ask(a, b) {
        showComparison(a, b).then(choice => {
          const item = choice === 0 ? left.shift() : right.shift();
          merged.push(item);
          placedCount++;
          undoAction = {
            revert() {
              merged.pop();
              placedCount--;
              (choice === 0 ? left : right).unshift(item);
            },
            redisplay: () => ask(a, b)
          };
          step();
        });
      }
      step();
    });
  }

  // Reverse the single most recent comparison and re-show it. Only the
  // last comparison is ever safely reversible with this recursive
  // mergeSort — once its merge instance hands off to the next one, undoing
  // further back would need coordinated rollback across recursive calls.
  function undoLastComparison() {
    if (!undoAction) return;
    const { revert, redisplay } = undoAction;
    undoAction = null;
    revert();
    redisplay();
  }

  // 10) Show two posters and return 0 or 1
  function showComparison(a, b) {
    return new Promise(resolve => {
      const percent = totalPlacements > 0
        ? Math.min(100, (placedCount / totalPlacements) * 100)
        : 100;
      undoBtn.style.display = '';
      undoBtn.disabled      = !undoAction;
      question.innerHTML = `
        <h1>Which do you prefer?</h1>
        <div class="progress-track"
             style="width:100%;height:8px;background:rgba(255,255,255,0.15);
                    border-radius:4px;overflow:hidden;margin:0 0 var(--gap);">
          <div class="progress-fill"
               style="width:${percent}%;height:100%;background:#fff;
                      border-radius:4px;transition:width .2s ease;"></div>
        </div>`;
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

  // 11) Render the complete sorted list
  function showResult(sorted) {
    question.innerHTML = '<h1>Ranking complete!</h1>';
    choices.style.display = 'none';
    undoBtn.style.display = 'none';
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
