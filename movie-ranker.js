// movie-ranker.js
(async () => {
  const STORAGE_KEY = 'mcuRanking';
  const params      = new URLSearchParams(window.location.search);
  const theme       = params.get('theme')    || 'starwars';
  const category    = params.get('category') || 'movies';

  // 1) Load config
  try {
    await import(`./configs/${theme}-${category}-config.js`);
    var { theme: cfgTheme, movies } = window.MovieRankerConfig;
  } catch (err) {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Missing config for ${theme}/${category}</p>`;
    return;
  }

  // 2) Apply theme
  document.documentElement.style.setProperty('--bg', `url('${cfgTheme.background}')`);
  document.documentElement.style.setProperty('--font', cfgTheme.fontFamily);

  // 3) UI refs
  const container = document.getElementById('container');
  const question  = document.getElementById('question');
  const choices   = document.getElementById('choices');
  const resultDiv = document.getElementById('result');
  const controls  = document.getElementById('controls');
  const resetBtn  = document.getElementById('reset-btn');
  const homeBtn   = document.getElementById('home-btn');

  // 4) Back button (inject into controls)
  const backBtn = document.createElement('button');
  backBtn.id = 'back-btn';
  backBtn.className = 'control-btn';
  backBtn.textContent = 'Back';
  backBtn.style.display = 'none';
  controls.insertBefore(backBtn, resetBtn);

  // 5) Handlers
  resetBtn.onclick = () => { localStorage.removeItem(STORAGE_KEY); location.reload(); };
  homeBtn.onclick  = () => { localStorage.removeItem(STORAGE_KEY); window.location.href = 'index.html'; };

  // 6) History stack
  const history = [];

  // 7) Init
  function init() {
    controls.style.display = 'none';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return showResult(JSON.parse(saved));
    startMergeSort();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

  // 8) Merge‐sort with history
  async function startMergeSort() {
    const sorted = await mergeSort(movies.map(m=>({...m})));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    showResult(sorted);
  }

  async function mergeSort(arr) {
    if (arr.length <=1) return arr;
    const mid = Math.floor(arr.length/2);
    const left = await mergeSort(arr.slice(0,mid));
    const right = await mergeSort(arr.slice(mid));
    return merge(left,right);
  }

  function merge(left, right) {
    return new Promise(resolve => {
      const merged = [];

      (function step(){
        if (left.length && right.length) {
          // **Push a snapshot before asking**
          history.push({
            left: left.slice(),
            right: right.slice(),
            merged: merged.slice()
          });
          showComparison(left[0], right[0]).then(choice => {
            // Apply the choice
            merged.push(choice===0 ? left.shift() : right.shift());
            step();
          });
        } else {
          resolve(merged.concat(left, right));
        }
      })();
    });
  }

  // 9) Show Comparison + handle Back
  function showComparison(a,b) {
    return new Promise(resolve => {
      question.innerHTML = '<h1>Which do you prefer?</h1>';
      choices.style.display = 'flex';
      resultDiv.style.display = 'none';
      controls.style.display = 'flex';

      // Show Back only if history length >1
      backBtn.style.display = history.length>1 ? 'inline-block' : 'none';

      choices.innerHTML = '';
      [a,b].forEach((m,i) => {
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

  // **Back Button Logic**
  backBtn.addEventListener('click', () => {
    // Pop current (incomplete) snapshot
    history.pop();
    const { left, right, merged } = history.pop();
    // Re‐run merge from this state
    mergeStep(left.slice(), right.slice(), merged.slice());
  });

  function mergeStep(left, right, merged) {
    // same as merge's inner "step", but starting from saved state
    const step = () => {
      if (left.length && right.length) {
        // push snapshot
        history.push({ left: left.slice(), right: right.slice(), merged: merged.slice() });
        showComparison(left[0], right[0]).then(choice => {
          merged.push(choice===0 ? left.shift() : right.shift());
          step();
        });
      } else {
        showResult(merged.concat(left, right));
      }
    };
    step();
  }

  // 10) Final result
  function showResult(sorted) {
    question.innerHTML = '<h1>Ranking complete!</h1>';
    choices.style.display = 'none';
    container.classList.add('results-active');
    controls.style.display = 'flex';
    backBtn.style.display = 'none';

    resultDiv.style.display = 'grid';
    resultDiv.innerHTML = '';
    sorted.forEach((m,i) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const info = document.createElement('div'); info.className = 'info';
      const rank = document.createElement('div'); rank.className = 'rank'; rank.textContent = i+1;
      const pc   = document.createElement('div'); pc.className = 'poster-container';
      const img  = document.createElement('img'); img.src = m.poster; img.alt = m.title;
      const ttl  = document.createElement('div'); ttl.className = 'title'; ttl.textContent = m.title;
      pc.append(img,ttl); info.append(rank,pc); item.append(info);
      resultDiv.appendChild(item);
    });
  }
})();
