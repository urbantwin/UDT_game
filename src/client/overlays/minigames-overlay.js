import { getMinigamesFeed, submitTimeGuess } from '../services/minigames-api.js';

export function createMinigamesOverlay({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; left:20px; bottom:100px; z-index:1250;
    display:none; flex-direction:column; gap:8px;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:rgba(0,0,0,0.88); color:#fff; padding:10px;
    border-radius:10px; width:300px;
    max-height:calc(100vh - 160px); overflow-y:auto;
    display:flex; flex-direction:column; gap:10px;
    box-shadow:0 4px 16px rgba(0,0,0,0.4);
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
  const titleEl = document.createElement('span');
  titleEl.textContent = '🎮 Mini-jeux';
  titleEl.style.cssText = 'font-weight:600; font-size:13px;';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕ Fermer';
  closeBtn.style.cssText = `
    min-height:44px; padding:6px 10px;
    background:rgba(255,255,255,0.1); color:#fff;
    border:none; border-radius:6px; font:11px system-ui,sans-serif; cursor:pointer;
  `;
  closeBtn.addEventListener('click', closePanel);
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'font:11px system-ui,sans-serif; opacity:0.7;';

  const feedEl = document.createElement('div');
  feedEl.style.cssText = 'display:flex; flex-direction:column; gap:12px;';

  panel.appendChild(header);
  panel.appendChild(statusEl);
  panel.appendChild(feedEl);
  root.appendChild(panel);
  container.appendChild(root);

  function buildPhotoCard(photo) {
    const card = document.createElement('div');
    card.style.cssText = `
      background:rgba(255,255,255,0.07); border-radius:8px; padding:8px;
      display:flex; flex-direction:column; gap:8px;
    `;

    const img = document.createElement('img');
    img.src = photo.dataUrl;
    img.style.cssText = 'width:100%; max-height:140px; object-fit:cover; border-radius:6px;';
    card.appendChild(img);

    const meta = document.createElement('div');
    meta.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.6;';
    meta.textContent = `📸 ${photo.submitterUsername}`;
    card.appendChild(meta);

    // Boutons mini-jeux
    const btnsRow = document.createElement('div');
    btnsRow.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

    // Geo-Pin — bientôt
    const geoPinBtn = makeDisabledBtn('📍 Où est-ce ? — Bientôt');
    btnsRow.appendChild(geoPinBtn);

    // Re-Photo — bientôt
    const rePhotoBtn = makeDisabledBtn('📷 Refais-la ! — Bientôt');
    btnsRow.appendChild(rePhotoBtn);

    // Time Guess — actif
    const timeGuessSection = document.createElement('div');
    timeGuessSection.style.cssText = 'display:flex; flex-direction:column; gap:6px;';

    const timeGuessBtn = document.createElement('button');
    timeGuessBtn.type = 'button';
    timeGuessBtn.textContent = '🕐 À quelle heure ?';
    timeGuessBtn.style.cssText = `
      min-height:44px; padding:8px 12px;
      background:#818cf8; color:#111827;
      font:12px system-ui,sans-serif; font-weight:600;
      border:none; border-radius:6px; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    `;

    // Zone de saisie (cachée par défaut)
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:none; flex-direction:column; gap:6px;';

    const timePicker = document.createElement('input');
    timePicker.type = 'time';
    timePicker.value = '12:00';
    timePicker.style.cssText = `
      min-height:44px; padding:6px 10px;
      background:rgba(255,255,255,0.1); color:#fff;
      border:1px solid rgba(255,255,255,0.2); border-radius:6px;
      font:13px system-ui,sans-serif; width:100%; box-sizing:border-box;
    `;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.textContent = '✓ Valider';
    submitBtn.style.cssText = `
      min-height:44px; padding:8px 12px;
      background:#34d399; color:#111827;
      font:12px system-ui,sans-serif; font-weight:600;
      border:none; border-radius:6px; cursor:pointer;
    `;

    const guessStatusEl = document.createElement('div');
    guessStatusEl.style.cssText = 'font:11px system-ui,sans-serif;';

    inputRow.appendChild(timePicker);
    inputRow.appendChild(submitBtn);
    inputRow.appendChild(guessStatusEl);

    timeGuessBtn.addEventListener('click', () => {
      inputRow.style.display = 'flex';
      timeGuessBtn.style.display = 'none';
    });

    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      guessStatusEl.textContent = 'Envoi…';
      try {
        const { score, realTime } = await submitTimeGuess({
          photoId: photo.id,
          guessedTime: timePicker.value,
        });
        inputRow.style.display = 'none';
        // Résultat
        const resultEl = document.createElement('div');
        resultEl.style.cssText = `
          padding:8px; border-radius:6px;
          background:rgba(129,140,248,0.15);
          border:1px solid rgba(129,140,248,0.35);
          display:flex; flex-direction:column; gap:4px;
        `;
        const scoreLine = document.createElement('div');
        scoreLine.style.cssText = 'font-weight:600; font-size:13px;';
        scoreLine.textContent = `🏅 ${score} points`;
        const realTimeLine = document.createElement('div');
        realTimeLine.style.cssText = 'font:11px system-ui,sans-serif; opacity:0.8;';
        realTimeLine.textContent = `Bonne réponse : ${realTime} · Votre réponse : ${timePicker.value}`;
        resultEl.appendChild(scoreLine);
        resultEl.appendChild(realTimeLine);
        timeGuessSection.appendChild(resultEl);

        // Marquer joué
        const playedLabel = document.createElement('div');
        playedLabel.style.cssText = `
          min-height:44px; display:flex; align-items:center; justify-content:center;
          background:rgba(255,255,255,0.05); border-radius:6px;
          font:11px system-ui,sans-serif; opacity:0.6;
        `;
        playedLabel.textContent = `✓ Joué (${score} pts)`;
        btnsRow.insertBefore(playedLabel, timeGuessSection);
        btnsRow.removeChild(timeGuessSection);
      } catch (err) {
        guessStatusEl.textContent = err.message || 'Erreur.';
        submitBtn.disabled = false;
      }
    });

    timeGuessSection.appendChild(timeGuessBtn);
    timeGuessSection.appendChild(inputRow);
    btnsRow.appendChild(timeGuessSection);
    card.appendChild(btnsRow);
    return card;
  }

  function makeDisabledBtn(label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.disabled = true;
    btn.style.cssText = `
      min-height:44px; padding:8px 12px;
      background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.35);
      font:12px system-ui,sans-serif;
      border:1px solid rgba(255,255,255,0.1); border-radius:6px; cursor:not-allowed;
    `;
    return btn;
  }

  async function loadFeed() {
    statusEl.textContent = 'Chargement…';
    feedEl.innerHTML = '';
    try {
      const photos = await getMinigamesFeed();
      statusEl.textContent = '';
      if (!photos.length) {
        statusEl.textContent = 'Aucune photo disponible pour jouer en ce moment.';
        return;
      }
      photos.forEach(p => feedEl.appendChild(buildPhotoCard(p)));
    } catch (err) {
      statusEl.textContent = err.message || 'Erreur de chargement.';
    }
  }

  function openPanel() {
    root.style.display = 'flex';
    loadFeed();
  }

  function closePanel() {
    root.style.display = 'none';
  }

  return {
    openPanel,
    closePanel,
    remove: () => root.remove(),
  };
}
