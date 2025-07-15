// movie-ranker.js
(async () => {
  const STORAGE_KEY = 'mcuRanking';
  const params      = new URLSearchParams(window.location.search);
  const theme       = params.get('theme')    || 'starwars';
  const category    = params.get('category') || 'movies';

  // -- 1) Load Config --
  try {
    await import(`./configs/${theme}-${category}-config.js`);
  } catch (err) {
    document.getElementById('question').innerHTML =
      `<h1>Error</h1><p>Could not load config for ${theme}/${category}</p>`;
    return;
  }
  const { theme: cfgTheme, movies } = window.MovieRankerConfig;

  // -- 2) Apply Theme --
  document.documentElement.style.setProperty('--bg', `url('${cfgTheme.background}')`);
  document.documentElement.style.setProperty('--font', cfgTheme.fontFamily);

  // -- 3) UI Refs --
  const container = document.getElementById('container');
  const question  = document.getElementById('question');
  const choices   = document.getElementById('choices');
  const resultDiv = document.getElementById('result');
  const controls  = document.getElementById('controls');
  const resetBtn  = document.getElementById('reset-btn');
  const homeBtn   = document.getElementById('home-btn');
  const backBtn   = document.getElementById('back-btn');

  // -- 4) State stack --
  // Each snapshot: {left, right, merged}
  let snapshots = [];

  // -- 5) Handlers --
  resetBtn.onclick = () => { localStorage.removeItem(STORAGE_KEY); location.reload(); };
  homeBtn.onclick  = () => { localStorage.removeItem(STORAGE_KEY); window.location = 'index.html'; };
  backBtn.onclick  = () => {
    if (snapshots.length < 2) return;  // nothing to pop back to
    snapshots.pop(); // remove current
    const state = snapshots.pop(); // go back one
    controls.style.display = 'none';
    choices.style.display = 'none';
    resultDiv.style.display = 'none';
    // restart merging from saved state
    mergeStep(state.left.slice(), state.right.slice(), state.merged.slice());
  };

  // -- 6) Init --
  function init() {
    controls.style.display = 'none';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) showResult(JSON.parse(saved));
    else startMerge();
  }
  document.readyState === 'loading' ?
    document.addEventListener('DOMContentLoaded', init) :
    init();

  // -- 7) Start Merge-Sort --
  async function startMerge() {
    snapshots = [];
    question.innerHTML = '<h1>Loading…</h1>';
    choices.style.display = 'none'; controls.style.display = 'none';
    const sorted = await mergeSort(movies.map(m=>({...m})));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    showResult(sorted);
  }

  async function mergeSort(arr) {
    if (arr.length <=1) return arr;
    const mid = Math.floor(arr.length/2);
    const left = await mergeSort(arr.slice(0,mid));
    const right= await mergeSort(arr.slice(mid));
    return new Promise(res => mergeStep(left, right, [], res));
  }

  // -- 8) Merge step allowing undo --
  function mergeStep(left, right, merged, doneCallback) {
    snapshots.push({ left: left.slice(), right: right.slice(), merged: merged.slice() });
    if (left.length && right.length) {
      question.innerHTML = '<h1>Which do you prefer?</h1>';
      controls.style.display = 'flex';
      backBtn.style.display = snapshots.length>1 ? 'inline-block' : 'none';
      choices.innerHTML = '';
      choices.style.display = 'flex'; resultDiv.style.display = 'none';

      [left[0], right[0]].forEach((m,i) => {
        const btn = document.createElement('button');
        btn.className = 'choice'; btn.onclick = () => {
          const nextMerged = merged.concat(i===0 ? left.shift() : right.shift());
          mergeStep(left, right, nextMerged, doneCallback);
        };
        const img = document.createElement('img'); img.src = m.poster; img.alt = m.title;
        btn.appendChild(img); choices.appendChild(btn);
      });
    } else {
      // finish
      const result = merged.concat(left, right);
      doneCallback ? doneCallback(result) : showResult(result);
    }
  }

  // -- 9) Show Results --
  function showResult(sorted) {
    question.innerHTML = '<h1>Ranking complete!</h1>';
    choices.style.display = 'none'; container.classList.add('results-active');
    controls.style.display = 'flex'; backBtn.style.display = 'none';
    resultDiv.style.display = 'grid'; resultDiv.innerHTML = '';
    sorted.forEach((m,i) => {
      const item = document.createElement('div'); item.className='result-item';
      const info = document.createElement('div'); info.className='info';
      const rank = document.createElement('div'); rank.className='rank'; rank.textContent=i+1;
      const pc   = document.createElement('div'); pc.className='poster-container';
      const img  = document.createElement('img'); img.src=m.poster; img.alt=m.title;
      const ttl  = document.createElement('div'); ttl.className='title'; ttl.textContent=m.title;
      pc.append(img,ttl); info.append(rank,pc); item.append(info);
      resultDiv.appendChild(item);
    });
  }
})();
