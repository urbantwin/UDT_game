import { getAdminPhotosByBucket, reviewPhoto, awardUnbeaten } from '../services/admin-api.js';

const BUCKETS = [
  { id: 1, label: '① Contributions en attente',  color: '#fbbf24' },
  { id: 2, label: '② Pool validé',                color: '#34d399' },
  { id: 3, label: '③ Réponses en attente',        color: '#60a5fa' },
  { id: 4, label: '④ Base finale (validé)',        color: '#a78bfa' },
];

export function createAdminGalleryView({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position:fixed; right:16px; top:130px; z-index:1300;
    display:none; flex-direction:column; align-items:flex-end; gap:8px;
  `;

  // Le panneau est déclenché depuis la barre de navigation (pas de bouton texte ici)

  // ── Panel ────────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.style.cssText = `
    display:none; background:rgba(0,0,0,0.88); color:#fff;
    border-radius:10px; width:420px;
    box-shadow:0 6px 16px rgba(0,0,0,0.4); flex-direction:column;
    max-height:calc(100vh - 120px);
  `;

  // ── Zone fixe : header + tabs (ne scroll pas) ───────────────────────────
  const fixedTop = document.createElement('div');
  fixedTop.style.cssText = `
    padding:10px 10px 6px; background:rgba(0,0,0,0.88);
    border-bottom:1px solid rgba(255,255,255,0.08);
    display:flex; flex-direction:column; gap:6px;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
  const title = document.createElement('span');
  title.textContent = 'Admin — 4 Buckets';
  title.style.cssText = 'font-weight:600; font-size:13px;';
  const refreshBtn = makeBtn('↻ Refresh', '#60a5fa');
  header.appendChild(title);
  header.appendChild(refreshBtn);
  fixedTop.appendChild(header);

  // Tabs
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap;';
  fixedTop.appendChild(tabBar);
  panel.appendChild(fixedTop);

  // ── Zone scrollable : liste des photos ───────────────────────────────────
  // ~3 photos simples (~80px) ou ~3 tandems (~180px) visibles avant scroll
  const scrollArea = document.createElement('div');
  scrollArea.style.cssText = `
    overflow-y: scroll;
    flex: 1;
    min-height: 0;
    padding: 8px;
    scroll-behavior: smooth;
  `;

  const content = document.createElement('div');
  content.style.cssText = 'display:flex; flex-direction:column; gap:10px;';
  scrollArea.appendChild(content);
  panel.appendChild(scrollArea);

  let activeBucket = 1;

  BUCKETS.forEach(b => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = b.label;
    tab.dataset.bucket = String(b.id);
    tab.style.cssText = `
      background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);
      border-radius:5px; padding:3px 7px; cursor:pointer; font:10px system-ui,sans-serif;
    `;
    tab.addEventListener('click', () => {
      activeBucket = b.id;
      updateTabStyles();
      scrollArea.scrollTop = 0;
      loadBucket(b.id);
    });
    tabBar.appendChild(tab);
  });

  root.appendChild(panel);
  container.appendChild(root);

  function updateTabStyles() {
    for (const tab of tabBar.querySelectorAll('button')) {
      const bid = Number(tab.dataset.bucket);
      const bucket = BUCKETS.find(b => b.id === bid);
      tab.style.background = bid === activeBucket ? bucket.color : 'rgba(255,255,255,0.08)';
      tab.style.color       = bid === activeBucket ? '#111827'  : '#fff';
    }
  }

  // ── Load bucket ──────────────────────────────────────────────────────────
  async function loadBucket(bucketId) {
    scrollArea.scrollTop = 0;
    content.innerHTML = '';
    const loading = document.createElement('div');
    loading.textContent = 'Chargement…';
    loading.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
    content.appendChild(loading);

    try {
      const items = await getAdminPhotosByBucket(bucketId);
      content.innerHTML = '';

      if (!items.length) {
        const empty = document.createElement('div');
        empty.textContent = 'Aucune photo dans ce bucket.';
        empty.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
        content.appendChild(empty);
        return;
      }

      for (const item of items) {
        content.appendChild(buildRow(item, bucketId));
      }
    } catch (err) {
      content.innerHTML = '';
      const errEl = document.createElement('div');
      errEl.textContent = err.message || 'Erreur de chargement.';
      errEl.style.color = '#fca5a5';
      content.appendChild(errEl);
    }
  }

  // ── Build row ────────────────────────────────────────────────────────────
  function buildRow(item, bucketId) {
    const isTandem = (bucketId === 3 || bucketId === 4) && item.challengeDataUrl;

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; flex-direction:column; gap:6px;
      background:rgba(255,255,255,0.06); padding:8px; border-radius:8px;
    `;

    if (isTandem) {
      // ── Tandem : photo challenge + photo réponse côte à côte ────────────
      const tandem = document.createElement('div');
      tandem.style.cssText = 'display:grid; grid-template-columns:1fr auto 1fr; gap:6px; align-items:start;';

      // Colonne gauche : photo originale du challenge
      const leftCol = document.createElement('div');
      leftCol.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
      leftCol.appendChild(makeThumb(item.challengeDataUrl, 'Photo challenge', '100%'));
      leftCol.appendChild(metaLine(`📸 ${item.challengeSubmitterUsername ?? 'inconnu'}`, 1, true));
      leftCol.appendChild(metaLine(formatGps(item.challengeLocation), 0.65));
      leftCol.appendChild(metaLine('Photo originale', 0.5));

      // Flèche centrale
      const arrow = document.createElement('div');
      arrow.textContent = '→';
      arrow.style.cssText = 'font-size:16px; opacity:0.5; padding-top:20px; align-self:center;';

      // Colonne droite : photo réponse
      const rightCol = document.createElement('div');
      rightCol.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
      rightCol.appendChild(makeThumb(item.dataUrl, 'Réponse', '100%'));
      rightCol.appendChild(metaLine(`🎯 ${item.submitterUsername ?? 'inconnu'}`, 1, true));
      rightCol.appendChild(metaLine(formatGps(item.location), 0.65));
      rightCol.appendChild(metaLine(new Date(item.createdAt).toLocaleString('fr-FR', { hour12: false }), 0.55));

      tandem.appendChild(leftCol);
      tandem.appendChild(arrow);
      tandem.appendChild(rightCol);
      row.appendChild(tandem);
    } else {
      // ── Simple : contribution seule ──────────────────────────────────────
      const simple = document.createElement('div');
      simple.style.cssText = 'display:grid; grid-template-columns:56px 1fr; gap:8px; align-items:start;';
      simple.appendChild(makeThumb(item.dataUrl, 'Photo'));
      const meta = document.createElement('div');
      meta.style.cssText = 'display:flex; flex-direction:column; gap:2px; font-size:11px;';
      meta.appendChild(metaLine(`📸 ${item.submitterUsername ?? 'inconnu'}`, 1, true));
      meta.appendChild(metaLine(new Date(item.createdAt).toLocaleString('fr-FR', { hour12: false }), 0.7));
      meta.appendChild(metaLine(formatGps(item.location), 0.65));
      simple.appendChild(meta);
      row.appendChild(simple);
    }

    // Actions validate/discard (buckets 1 et 3)
    const isPending = bucketId === 1 || bucketId === 3;
    if (isPending) {
      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex; gap:6px; align-items:center;';

      const validateBtn = makeBtn('✓ Valider', '#86efac');
      const discardBtn  = makeBtn('✕ Rejeter', '#fca5a5');
      const statusEl    = document.createElement('div');
      statusEl.style.cssText = 'font-size:10px; opacity:0.8;';

      validateBtn.addEventListener('click', async () => {
        await handleReview({ photoId: item.id, action: 'validate', validateBtn, discardBtn, statusEl });
        loadBucket(bucketId);
      });
      discardBtn.addEventListener('click', async () => {
        await handleReview({ photoId: item.id, action: 'discard', validateBtn, discardBtn, statusEl });
        loadBucket(bucketId);
      });

      actionsRow.appendChild(validateBtn);
      actionsRow.appendChild(discardBtn);
      actionsRow.appendChild(statusEl);
      row.appendChild(actionsRow);
    }

    // Bouton "Aucun vainqueur" pour le bucket 2 uniquement (+100 pts au soumetteur)
    if (bucketId === 2) {
      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex; gap:6px; align-items:center;';

      const unbeatenBtn = makeBtn('🏆 Aucun vainqueur (+100 pts)', '#fbbf24');
      const statusEl    = document.createElement('div');
      statusEl.style.cssText = 'font-size:10px; opacity:0.8;';

      unbeatenBtn.addEventListener('click', async () => {
        unbeatenBtn.disabled = true;
        statusEl.textContent = 'Attribution…';
        try {
          await awardUnbeaten(item.id);
          statusEl.textContent = '✓ +100 pts attribués';
          setTimeout(() => loadBucket(bucketId), 1000);
        } catch (err) {
          statusEl.textContent = err.message || 'Erreur';
          unbeatenBtn.disabled = false;
        }
      });

      actionsRow.appendChild(unbeatenBtn);
      actionsRow.appendChild(statusEl);
      row.appendChild(actionsRow);
    }

    return row;
  }

  async function handleReview({ photoId, action, validateBtn, discardBtn, statusEl }) {
    validateBtn.disabled = true;
    discardBtn.disabled  = true;
    statusEl.textContent = 'Enregistrement…';
    try {
      await reviewPhoto({ photoId, action });
      statusEl.textContent = action === 'validate' ? 'Validé ✓' : 'Rejeté ✕';
    } catch (err) {
      statusEl.textContent = err.message || 'Erreur';
      validateBtn.disabled = false;
      discardBtn.disabled  = false;
    }
  }

  refreshBtn.addEventListener('click', () => loadBucket(activeBucket));

  // ── Public API ───────────────────────────────────────────────────────────
  function togglePanel() {
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
      updateTabStyles();
      loadBucket(activeBucket);
    }
  }

  function setVisible(visible) {
    root.style.display = visible ? 'flex' : 'none';
    if (!visible) panel.style.display = 'none';
  }

  function refresh() {
    if (panel.style.display !== 'none') {
      loadBucket(activeBucket);
    }
  }

  function remove() { root.remove(); }

  return { setVisible, refresh, remove, togglePanel };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBtn(text, background) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.cssText = `
    background:${background}; color:#111827; border:none; border-radius:6px;
    padding:4px 8px; cursor:pointer; font:11px system-ui,sans-serif;
  `;
  return btn;
}

function makeThumb(src, alt, width = '56px') {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.style.cssText = `width:${width}; height:${width === '100%' ? '100px' : '56px'}; object-fit:cover; border-radius:6px; display:block;`;
  return img;
}

function metaLine(text, opacity = 1, bold = false) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `opacity:${opacity}; font-size:11px;${bold ? ' font-weight:600;' : ''}`;
  return el;
}

function formatGps(loc) {
  if (!loc) return 'GPS inconnu';
  const lat = Number(loc.lat).toFixed(5);
  const lon = Number(loc.lon ?? loc.lng ?? 0).toFixed(5);
  return `📍 ${lat}, ${lon}`;
}
