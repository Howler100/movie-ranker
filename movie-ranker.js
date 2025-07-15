// movie-ranker.js
(async () => {
  const STORAGE_KEY = 'mcuRanking';
  const params = new URLSearchParams(location.search);
  const theme = params.get('theme') || 'starwars';
  const category = params.get('category') || 'movies';

  // 1. load config
  try {
    await import(`./configs/${theme}-${category}-config.js`);
  } catch {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Missing config for ${theme}/${category}</p>`;
    return;
  }
  const { theme: cfgTheme, movies } = window.MovieRankerConfig;

  // 2. apply theme CSS vars
  document.documentElement.style.setProperty('--bg', `url('${cfgTheme.background}')`);
  document.documentElement.style.setProperty('--font', cfgTheme.fontFamily);

  // 3. UI refs
  const question  = document.getElementById('question');
  const choices   = document.getElementById('choices');
  const resultDiv = document.getElementById('result');
  const controls  = document.getElementById('controls');
  const homeBtn   = document.getElementById('home-btn');
  const backBtn   = document.getElementById('back-btn');
  const resetBtn  = document.getElementById('reset-btn');
  const container = document.getElementById('container');

  // 4. state stack for undo
  let history = [];

  // 5. controls handlers
  homeBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.href = 'index.html';
  };
  resetBtn.onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
  backBtn.onclick = () => {
    if (history.length < 2) return;
    history.pop();               // drop current
    const { left, right, merged } = history.pop();
    // hide UI
    controls.style.display = 'none';
    choices.style.display  = 'none';
    resultDiv.style.display = 'none';
    // resume from that snapshot
    mergeStep(left.slice(), right.slice(), merged.slice());
  };

  // 6. init or resume
  function init() {
    controls.style.display = 'none';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      showResult(JSON.parse(saved));
    } else {
      startSort();
    }
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

  // 7. start a fresh sort
  async function startSort() {
    history = [];
    question.innerHTML = '<h1>Loading…</h1>';
    choices.style.display = 'none';
    controls.style.display = 'none';
    const sorted = await mergeSort([...movies]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    showResult(sorted);
  }

  // 8. recursive mergeSort
  async function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length/2);
    const left = await mergeSort(arr.slice(0, mid));
    const right = await mergeSort(arr.slice(mid));
    return new Promise(res => mergeStep(left, right, [], res));
  }

  // 9. the merge with snapshot & UI
  function mergeStep(left, right, merged, done) {
    // snapshot current
    history.push({ left, right, merged });
    if (left.length && right.length) {
      question.innerHTML = '<h1>Which do you prefer?</h1>';
      choices.innerHTML = '';
      choices.style.display = 'flex';
      controls.style.display = 'flex';
      backBtn.style.display = history.length > 1 ? 'inline-block' : 'none';

      [left[0], right[0]].forEach((m, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.onclick = () => {
          const nextMerged = merged.concat(i===0 ? left.shift() : right.shift());
          mergeStep(left.slice(), right.slice(), nextMerged, done);
        };
        const img = document.createElement('img');
        img.src = m.poster; img.alt = m.title;
        btn.appendChild(img);
        choices.appendChild(btn);
      });
    } else {
      const full = merged.concat(left, right);
      if (done) done(full);
      else showResult(full);
    }
  }

  // 10. show final grid
  function showResult(sorted) {
    question.innerHTML = '<h1>Ranking complete!</h1>';
    choices.style.display = 'none';
    controls.style.display = 'flex';
    backBtn.style.display = 'none';
    container.classList.add('results-active');
    resultDiv.style.display = 'grid';
    resultDiv.innerHTML = '';
    sorted.forEach((m,i) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const info = document.createElement('div'); info.className = 'info';
      const rank = document.createElement('div'); rank.className = 'rank'; rank.textContent = i+1;
      const pc   = document.createElement('div'); pc.className = 'poster-container';
      const img  = document.createElement('img'); img.src = m.poster; img.alt = m.title;
      const title= document.createElement('div'); title.className = 'title'; title.textContent = m.title;
      pc.append(img,title); info.append(rank, pc); item.append(info);
      resultDiv.appendChild(item);
    });
  }
})();
