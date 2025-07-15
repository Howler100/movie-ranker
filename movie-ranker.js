// movie-ranker.js
(async () => {
  const params   = new URLSearchParams(window.location.search);
  const theme    = params.get('theme')    || 'starwars';
  const category = params.get('category') || 'movies';

  console.log('Loading config for:', theme, category);
  try {
    await import(`./configs/${theme}-${category}-config.js`);
    console.log('Config loaded:', window.MovieRankerConfig);
  } catch (err) {
    console.error(`Could not load ./configs/${theme}-${category}-config.js`, err);
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Could not find config for <strong>${theme}/${category}</strong></p>`;
    return;
  }

  // 3. Apply background & font from config
  const { background, fontFamily } = window.MovieRankerConfig.theme;
  document.documentElement.style.setProperty('--bg', `url('${background}')`);
  document.documentElement.style.setProperty('--font', fontFamily);

  // 4. Grab the movie data
  const movies = window.MovieRankerConfig.movies;

  // --- merge-sort UI logic ---

  async function startMergeSort() {
    const sorted = await mergeSort(movies.map(m => ({ ...m })));
    showResult(sorted);
  }

  async function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid   = Math.floor(arr.length/2);
    const left  = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    return merge(left, right);
  }

  function merge(left, right) {
    return new Promise(resolve => {
      const merged = [];
      (function step(){
        if (left.length && right.length) {
          showComparison(left[0], right[0]).then(choice => {
            merged.push(choice===0 ? left.shift() : right.shift());
            step();
          });
        } else {
          resolve(merged.concat(left, right));
        }
      })();
    });
  }

  function showComparison(a, b) {
    return new Promise(resolve => {
      document.getElementById('question').innerHTML =
        '<h1>Which do you prefer?</h1>';
      const C = document.getElementById('choices');
      C.innerHTML = '';
      [a,b].forEach((m,i) => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.onclick   = () => resolve(i);
        const img = document.createElement('img');
        img.src = m.poster; img.alt = m.title;
        btn.appendChild(img);
        C.appendChild(btn);
      });
    });
  }

  function showResult(sorted) {
    document.getElementById('question').innerHTML =
      '<h1>Ranking complete!</h1>';
    document.getElementById('choices').style.display = 'none';
    document.getElementById('container').classList.add('results-active');
    const R = document.getElementById('result');
    R.style.display = 'grid';
    sorted.forEach((m,i) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const info = document.createElement('div');
      info.className = 'info';
      const rank = document.createElement('div');
      rank.className = 'rank';
      rank.textContent = i+1;
      const pc   = document.createElement('div');
      pc.className = 'poster-container';
      const img  = document.createElement('img');
      img.src = m.poster; img.alt = m.title;
      const ttl  = document.createElement('div');
      ttl.className = 'title';
      ttl.textContent = m.title;
      pc.append(img, ttl);
      info.append(rank, pc);
      item.append(info);
      R.append(item);
    });
  }

  document.addEventListener('DOMContentLoaded', startMergeSort);
})();