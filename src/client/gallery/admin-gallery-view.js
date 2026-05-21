import { getAdminPhotosByBucket, reviewPhoto, awardUnbeaten, getAdminPendingMayors, getAdminAllHistory, reviewMayor, saveLocationOverride, getAdminPendingReports, reviewReport } from '../services/admin-api.js';
import { getLocationOverrides } from '../services/locations-api.js';
import { createWeeklySection } from './admin-weekly-challenge-section.js';
import { EPFL_LOCATIONS } from '../../../game/epfl-locations.js';

const BUCKETS = [
  { id: 1, label: '① Contributions en attente',   color: '#fbbf24' },
  { id: 2, label: '② Pool validé',                color: '#34d399' },
  { id: 3, label: '③ Réponses en attente',        color: '#60a5fa' },
  { id: 4, label: '④ Base finale (validé)',        color: '#a78bfa' },
];

export function createAdminGalleryView({ container = document.body, map = null, onOverridesSaved } = {}) {
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
  let activeView = 'bucket'; // 'bucket' | 'weekly' | 'mayors' | 'salles' | 'pins' | 'reports'

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
      removeDragMarkers();
      activeView = 'bucket';
      activeBucket = b.id;
      updateTabStyles();
      scrollArea.scrollTop = 0;
      loadBucket(b.id);
    });
    tabBar.appendChild(tab);
  });

  // Onglet Weekly
  const weeklyTabBtn = document.createElement('button');
  weeklyTabBtn.type = 'button';
  weeklyTabBtn.textContent = '📅 Weekly';
  weeklyTabBtn.dataset.tab = 'weekly';
  weeklyTabBtn.style.cssText = `
    background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);
    border-radius:5px; padding:3px 7px; cursor:pointer; font:10px system-ui,sans-serif;
  `;
  weeklyTabBtn.addEventListener('click', () => {
    removeDragMarkers();
    activeView = 'weekly';
    updateTabStyles();
    loadWeeklyTab();
  });
  tabBar.appendChild(weeklyTabBtn);

  // Onglet Maires (claims en attente)
  const mayorTabBtn = document.createElement('button');
  mayorTabBtn.type = 'button';
  mayorTabBtn.textContent = '👑 Maires';
  mayorTabBtn.dataset.tab = 'mayors';
  mayorTabBtn.style.cssText = `
    background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);
    border-radius:5px; padding:3px 7px; cursor:pointer; font:10px system-ui,sans-serif;
  `;
  mayorTabBtn.addEventListener('click', () => {
    removeDragMarkers();
    activeView = 'mayors';
    updateTabStyles();
    loadMayorReviews();
  });
  tabBar.appendChild(mayorTabBtn);

  // Onglet Signalements joueurs
  const reportsTabBtn = document.createElement('button');
  reportsTabBtn.type = 'button';
  reportsTabBtn.textContent = '🚩 Signalements';
  reportsTabBtn.dataset.tab = 'reports';
  reportsTabBtn.style.cssText = `
    background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);
    border-radius:5px; padding:3px 7px; cursor:pointer; font:10px system-ui,sans-serif;
  `;
  reportsTabBtn.addEventListener('click', () => {
    removeDragMarkers();
    activeView = 'reports';
    updateTabStyles();
    loadReportsView();
  });
  tabBar.appendChild(reportsTabBtn);

  // Onglet Pins (déplacement + renommage)
  const pinsTabBtn = document.createElement('button');
  pinsTabBtn.type = 'button';
  pinsTabBtn.textContent = '📍 Pins';
  pinsTabBtn.dataset.tab = 'pins';
  pinsTabBtn.style.cssText = `
    background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);
    border-radius:5px; padding:3px 7px; cursor:pointer; font:10px system-ui,sans-serif;
  `;
  pinsTabBtn.addEventListener('click', () => {
    activeView = 'pins';
    updateTabStyles();
    loadPinsView();
  });
  tabBar.appendChild(pinsTabBtn);

  // Onglet Salles (vue par salle + historique complet)
  const sallesTabBtn = document.createElement('button');
  sallesTabBtn.type = 'button';
  sallesTabBtn.textContent = '🏛️ Salles';
  sallesTabBtn.dataset.tab = 'salles';
  sallesTabBtn.style.cssText = `
    background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);
    border-radius:5px; padding:3px 7px; cursor:pointer; font:10px system-ui,sans-serif;
  `;
  sallesTabBtn.addEventListener('click', () => {
    removeDragMarkers();
    activeView = 'salles';
    updateTabStyles();
    loadSallesView();
  });
  tabBar.appendChild(sallesTabBtn);

  root.appendChild(panel);
  container.appendChild(root);

  function updateTabStyles() {
    for (const tab of tabBar.querySelectorAll('button')) {
      if (tab.dataset.tab === 'weekly') {
        tab.style.background = activeView === 'weekly' ? '#818cf8' : 'rgba(255,255,255,0.08)';
        tab.style.color       = activeView === 'weekly' ? '#111827' : '#fff';
        continue;
      }
      if (tab.dataset.tab === 'mayors') {
        tab.style.background = activeView === 'mayors' ? '#fbbf24' : 'rgba(255,255,255,0.08)';
        tab.style.color       = activeView === 'mayors' ? '#111827' : '#fff';
        continue;
      }
      if (tab.dataset.tab === 'salles') {
        tab.style.background = activeView === 'salles' ? '#34d399' : 'rgba(255,255,255,0.08)';
        tab.style.color       = activeView === 'salles' ? '#111827' : '#fff';
        continue;
      }
      if (tab.dataset.tab === 'pins') {
        tab.style.background = activeView === 'pins' ? '#f472b6' : 'rgba(255,255,255,0.08)';
        tab.style.color       = activeView === 'pins' ? '#111827' : '#fff';
        continue;
      }
      if (tab.dataset.tab === 'reports') {
        tab.style.background = activeView === 'reports' ? '#f87171' : 'rgba(255,255,255,0.08)';
        tab.style.color       = activeView === 'reports' ? '#111827' : '#fff';
        continue;
      }
      const bid = Number(tab.dataset.bucket);
      const bucket = BUCKETS.find(b => b.id === bid);
      tab.style.background = (activeView === 'bucket' && bid === activeBucket) ? bucket.color : 'rgba(255,255,255,0.08)';
      tab.style.color       = (activeView === 'bucket' && bid === activeBucket) ? '#111827'  : '#fff';
    }
  }

  function loadWeeklyTab() {
    scrollArea.scrollTop = 0;
    content.innerHTML = '';
    createWeeklySection({ container: content, locations: EPFL_LOCATIONS }).mount();
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
      if (item.challengeFloor != null) leftCol.appendChild(metaLine(formatFloor(item.challengeFloor), 0.65));
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
      if (item.floor != null) rightCol.appendChild(metaLine(formatFloor(item.floor), 0.65));
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
      if (item.floor != null) meta.appendChild(metaLine(formatFloor(item.floor), 0.65));
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

  // ── Pins editor ──────────────────────────────────────────────────────────
  let dragMarkers = [];
  let pinOverrides = []; // cache local

  function removeDragMarkers() {
    dragMarkers.forEach(m => m.remove());
    dragMarkers = [];
  }

  async function loadPinsView() {
    scrollArea.scrollTop = 0;
    content.innerHTML = '';
    removeDragMarkers();

    const loading = document.createElement('div');
    loading.textContent = 'Chargement…';
    loading.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
    content.appendChild(loading);

    try {
      pinOverrides = await getLocationOverrides();
    } catch {
      pinOverrides = [];
    }

    content.innerHTML = '';

    // Bouton drag toggle
    const dragToggleRow = document.createElement('div');
    dragToggleRow.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:4px;';
    const dragToggleBtn = document.createElement('button');
    dragToggleBtn.type = 'button';
    dragToggleBtn.textContent = '🗺️ Activer drag sur la carte';
    dragToggleBtn.style.cssText = `
      background:rgba(244,114,182,0.2); color:#f472b6; border:1px solid rgba(244,114,182,0.4);
      border-radius:6px; padding:5px 10px; cursor:pointer; font:11px system-ui,sans-serif; flex:1;
    `;
    const dragStatusEl = document.createElement('div');
    dragStatusEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.6;';

    let dragActive = false;
    // row refs for coordinate updates keyed by locationId
    const rowRefs = {};

    dragToggleBtn.addEventListener('click', () => {
      dragActive = !dragActive;
      if (dragActive) {
        dragToggleBtn.textContent = '🗺️ Désactiver drag';
        dragToggleBtn.style.background = 'rgba(244,114,182,0.5)';
        dragStatusEl.textContent = 'Glissez les pins sur la carte.';
        activateDragMarkers(rowRefs);
      } else {
        dragToggleBtn.textContent = '🗺️ Activer drag sur la carte';
        dragToggleBtn.style.background = 'rgba(244,114,182,0.2)';
        dragStatusEl.textContent = '';
        removeDragMarkers();
      }
    });

    dragToggleRow.appendChild(dragToggleBtn);
    dragToggleRow.appendChild(dragStatusEl);
    content.appendChild(dragToggleRow);

    // Une ligne par lieu
    for (const loc of EPFL_LOCATIONS) {
      const ov = pinOverrides.find(o => o.locationId === loc.id);
      const currentLabel = ov?.label ?? loc.label;
      const currentLat   = ov?.lat   ?? loc.lat;
      const currentLng   = ov?.lng   ?? loc.lng;

      const row = document.createElement('div');
      row.style.cssText = `
        display:flex; flex-direction:column; gap:5px;
        background:rgba(255,255,255,0.05); padding:8px; border-radius:7px;
      `;

      const locHeader = document.createElement('div');
      locHeader.style.cssText = 'font:600 11px system-ui,sans-serif; opacity:0.7;';
      locHeader.textContent = loc.label;
      row.appendChild(locHeader);

      const labelInput = document.createElement('input');
      labelInput.value = currentLabel;
      labelInput.placeholder = 'Nom affiché';
      labelInput.style.cssText = `
        padding:5px 7px; border-radius:5px; border:none;
        font:11px system-ui,sans-serif; background:#1f2937; color:#fff;
        width:100%; box-sizing:border-box;
      `;

      const coordsEl = document.createElement('div');
      coordsEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.55;';
      coordsEl.textContent = `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;

      // Stocker lat/lng courants dans des attributs data pour update par drag
      coordsEl.dataset.lat = String(currentLat);
      coordsEl.dataset.lng = String(currentLng);

      rowRefs[loc.id] = { coordsEl, labelInput };

      const saveBtn = makeBtn('💾 Sauvegarder', '#60a5fa');
      saveBtn.style.alignSelf = 'flex-start';
      const saveStatusEl = document.createElement('div');
      saveStatusEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.8; min-height:12px;';

      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveStatusEl.textContent = '…';
        try {
          const lat = parseFloat(coordsEl.dataset.lat);
          const lng = parseFloat(coordsEl.dataset.lng);
          const label = labelInput.value.trim() || loc.label;
          const saved = await saveLocationOverride(loc.id, { label, lat, lng });
          // Mettre à jour cache local
          const idx = pinOverrides.findIndex(o => o.locationId === loc.id);
          if (idx >= 0) pinOverrides[idx] = saved;
          else pinOverrides.push(saved);
          onOverridesSaved?.(pinOverrides.slice());
          locHeader.textContent = saved.label;
          coordsEl.textContent = `${saved.lat.toFixed(5)}, ${saved.lng.toFixed(5)}`;
          coordsEl.dataset.lat = String(saved.lat);
          coordsEl.dataset.lng = String(saved.lng);
          saveStatusEl.textContent = '✓ Sauvegardé';
          setTimeout(() => { saveStatusEl.textContent = ''; }, 2000);
        } catch (err) {
          saveStatusEl.textContent = err.message || 'Erreur';
        } finally {
          saveBtn.disabled = false;
        }
      });

      row.appendChild(labelInput);
      row.appendChild(coordsEl);
      row.appendChild(saveBtn);
      row.appendChild(saveStatusEl);
      content.appendChild(row);
    }
  }

  function activateDragMarkers(rowRefs) {
    if (!map) return;
    removeDragMarkers();
    for (const loc of EPFL_LOCATIONS) {
      const refs = rowRefs[loc.id];
      if (!refs) continue;
      const lat = parseFloat(refs.coordsEl.dataset.lat);
      const lng = parseFloat(refs.coordsEl.dataset.lng);

      const marker = L.marker([lat, lng], {
        draggable: true,
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: '',
          html: `<div style="
            background:rgba(244,114,182,0.9); color:#111; padding:4px 8px;
            border-radius:16px; font:700 10px system-ui,sans-serif; white-space:nowrap;
            border:2px solid #f472b6; box-shadow:0 2px 8px rgba(0,0,0,0.5); cursor:grab;
          ">📍 ${refs.labelInput.value || loc.label}</div>`,
          iconAnchor: [0, 0],
        }),
      }).addTo(map);

      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        refs.coordsEl.dataset.lat = String(ll.lat);
        refs.coordsEl.dataset.lng = String(ll.lng);
        refs.coordsEl.textContent = `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
      });

      dragMarkers.push(marker);
    }
  }

  // ── Reports (signalements joueurs) ───────────────────────────────────────
  async function loadReportsView() {
    scrollArea.scrollTop = 0;
    content.innerHTML = '';
    const loading = document.createElement('div');
    loading.textContent = 'Chargement…';
    loading.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
    content.appendChild(loading);
    try {
      const items = await getAdminPendingReports();
      content.innerHTML = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.textContent = 'Aucun signalement en attente.';
        empty.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
        content.appendChild(empty);
        return;
      }
      for (const item of items) content.appendChild(buildReportRow(item));
    } catch (err) {
      content.innerHTML = '';
      const errEl = document.createElement('div');
      errEl.textContent = err.message || 'Erreur de chargement.';
      errEl.style.color = '#fca5a5';
      content.appendChild(errEl);
    }
  }

  function buildReportRow(item) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; flex-direction:column; gap:6px;
      background:rgba(248,113,113,0.08); padding:8px; border-radius:8px;
      border-left:3px solid rgba(248,113,113,0.5);
    `;

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const locEl = document.createElement('div');
    locEl.style.cssText = 'font:700 12px system-ui,sans-serif;';
    locEl.textContent = `🚩 ${item.locationLabel}`;
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.55;';
    dateEl.textContent = new Date(item.reportedAt).toLocaleString('fr-FR', { hour12: false });
    hdr.appendChild(locEl);
    hdr.appendChild(dateEl);
    row.appendChild(hdr);

    // Cible de la pénalité = auteur de la photo spécifique, pas le maire actuel
    const targetBox = document.createElement('div');
    targetBox.style.cssText = `
      background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3);
      border-radius:6px; padding:6px 8px; font:11px system-ui,sans-serif;
      display:flex; flex-direction:column; gap:2px;
    `;
    const targetLine = document.createElement('div');
    targetLine.style.cssText = 'font-weight:600;';
    targetLine.textContent = `⚠️ Joueur pénalisé si validé : ${item.mayorUsername}`;
    const statusLine = document.createElement('div');
    statusLine.style.cssText = `opacity:0.75; font-size:10px; color:${item.mayorActive ? '#86efac' : '#fca5a5'};`;
    statusLine.textContent = item.mayorActive
      ? '✓ Ce joueur est encore maire actif de cette salle'
      : '✗ Ce joueur n\'est plus maire (remplacé depuis) — la pénalité reste sur lui';
    targetBox.appendChild(targetLine);
    targetBox.appendChild(statusLine);
    row.appendChild(targetBox);

    const reporters = Array.isArray(item.reporterUsernames) ? item.reporterUsernames.join(', ') : 'inconnu';
    row.appendChild(metaLine(`👥 Signalements : ${item.reportsCount ?? 1}`, 0.7));
    row.appendChild(metaLine(`👤 Reporters : ${reporters}`, 0.7));

    if (item.photoDataUrl) {
      const photoLabel = document.createElement('div');
      photoLabel.textContent = '📸 Photo de la revendication';
      photoLabel.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.55;';
      row.appendChild(photoLabel);
      const img = document.createElement('img');
      img.src = item.photoDataUrl;
      img.style.cssText = 'width:100%; max-height:160px; object-fit:cover; border-radius:6px; cursor:pointer;';
      img.addEventListener('click', () => window.open(item.photoDataUrl, '_blank'));
      row.appendChild(img);
    } else {
      row.appendChild(metaLine('Aucune photo disponible.', 0.5));
    }

    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'display:flex; gap:6px; align-items:center; flex-wrap:wrap;';
    const validateBtn = makeBtn('✓ Photo invalide — -10 auteur', '#86efac');
    const dismissBtn  = makeBtn('✕ Signalement injustifié', '#fca5a5');
    const statusEl    = document.createElement('div');
    statusEl.style.cssText = 'font-size:10px; opacity:0.8; width:100%;';

    validateBtn.addEventListener('click', async () => {
      validateBtn.disabled = true; dismissBtn.disabled = true;
      statusEl.textContent = '…';
      try {
        await reviewReport(item.reportId, 'validate');
        statusEl.textContent = `✓ Auteur pénalisé (-10)${item.mayorActive ? ', salle libérée' : ''}.`;
        setTimeout(() => loadReportsView(), 1000);
      } catch (err) {
        statusEl.textContent = err.message || 'Erreur';
        validateBtn.disabled = false; dismissBtn.disabled = false;
      }
    });

    dismissBtn.addEventListener('click', async () => {
      validateBtn.disabled = true; dismissBtn.disabled = true;
      statusEl.textContent = '…';
      try {
        await reviewReport(item.reportId, 'dismiss');
        statusEl.textContent = '✕ Signalement injustifié. Aucun malus reporteur.';
        setTimeout(() => loadReportsView(), 1000);
      } catch (err) {
        statusEl.textContent = err.message || 'Erreur';
        validateBtn.disabled = false; dismissBtn.disabled = false;
      }
    });

    actionsRow.appendChild(validateBtn);
    actionsRow.appendChild(dismissBtn);
    actionsRow.appendChild(statusEl);
    row.appendChild(actionsRow);

    return row;
  }

  // ── Mayor reviews ────────────────────────────────────────────────────────
  async function loadMayorReviews() {
    scrollArea.scrollTop = 0;
    content.innerHTML = '';
    const loading = document.createElement('div');
    loading.textContent = 'Chargement…';
    loading.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
    content.appendChild(loading);

    try {
      const items = await getAdminPendingMayors();
      content.innerHTML = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.textContent = 'Aucune revendication en attente de validation.';
        empty.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
        content.appendChild(empty);
        return;
      }
      for (const item of items) content.appendChild(buildMayorRow(item));
    } catch (err) {
      content.innerHTML = '';
      const errEl = document.createElement('div');
      errEl.textContent = err.message || 'Erreur de chargement.';
      errEl.style.color = '#fca5a5';
      content.appendChild(errEl);
    }
  }

  function buildMayorRow(item) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; flex-direction:column; gap:6px;
      background:rgba(255,255,255,0.06); padding:8px; border-radius:8px;
    `;

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const locEl = document.createElement('div');
    locEl.style.cssText = 'font:600 12px system-ui,sans-serif;';
    locEl.textContent = `👑 ${item.locationLabel}`;
    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.6;';
    dateEl.textContent = new Date(item.claimedAt * 1000).toLocaleString('fr-FR', { hour12: false });
    hdr.appendChild(locEl);
    hdr.appendChild(dateEl);
    row.appendChild(hdr);

    row.appendChild(metaLine(`🧑 ${item.username}`, 0.85, true));

    if (item.photoDataUrl) {
      const img = document.createElement('img');
      img.src = item.photoDataUrl;
      img.style.cssText = 'width:100%; max-height:140px; object-fit:cover; border-radius:6px;';
      row.appendChild(img);
    }

    if (item.photoLocation) {
      try {
        const loc = typeof item.photoLocation === 'string' ? JSON.parse(item.photoLocation) : item.photoLocation;
        row.appendChild(metaLine(formatGps(loc), 0.6));
      } catch {}
    }

    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'display:flex; gap:6px; align-items:center; flex-wrap:wrap;';
    const approveBtn = makeBtn('✓ Valider', '#86efac');
    const rejectBtn  = makeBtn('✕ Triche — chrono 0', '#fca5a5');
    const statusEl   = document.createElement('div');
    statusEl.style.cssText = 'font-size:10px; opacity:0.8;';

    approveBtn.addEventListener('click', async () => {
      approveBtn.disabled = true; rejectBtn.disabled = true;
      statusEl.textContent = '…';
      try {
        await reviewMayor(item.mayorId, 'approve');
        statusEl.textContent = '✓ Validé';
        setTimeout(() => loadMayorReviews(), 800);
      } catch (err) {
        statusEl.textContent = err.message || 'Erreur';
        approveBtn.disabled = false; rejectBtn.disabled = false;
      }
    });

    rejectBtn.addEventListener('click', async () => {
      approveBtn.disabled = true; rejectBtn.disabled = true;
      statusEl.textContent = '…';
      try {
        await reviewMayor(item.mayorId, 'reject');
        statusEl.textContent = '✕ Triche signalée';
        setTimeout(() => loadMayorReviews(), 800);
      } catch (err) {
        statusEl.textContent = err.message || 'Erreur';
        approveBtn.disabled = false; rejectBtn.disabled = false;
      }
    });

    actionsRow.appendChild(approveBtn);
    actionsRow.appendChild(rejectBtn);
    actionsRow.appendChild(statusEl);
    row.appendChild(actionsRow);

    return row;
  }

  // ── Salles view (historique complet par salle) ───────────────────────────
  async function loadSallesView() {
    scrollArea.scrollTop = 0;
    content.innerHTML = '';
    const loading = document.createElement('div');
    loading.textContent = 'Chargement…';
    loading.style.cssText = 'opacity:0.7; font:12px system-ui,sans-serif;';
    content.appendChild(loading);

    try {
      const salles = await getAdminAllHistory();
      content.innerHTML = '';
      for (const salle of salles) {
        content.appendChild(buildSalleCard(salle));
      }
    } catch (err) {
      content.innerHTML = '';
      const errEl = document.createElement('div');
      errEl.textContent = err.message || 'Erreur de chargement.';
      errEl.style.color = '#fca5a5';
      content.appendChild(errEl);
    }
  }

  function buildSalleCard(salle) {
    const card = document.createElement('div');
    card.style.cssText = `
      display:flex; flex-direction:column; gap:6px;
      background:rgba(255,255,255,0.06); padding:8px; border-radius:8px;
    `;

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
    const locEl = document.createElement('div');
    locEl.style.cssText = 'font:700 13px system-ui,sans-serif;';
    locEl.textContent = `🏛️ ${salle.locationLabel}`;
    const countEl = document.createElement('div');
    countEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.55;';
    countEl.textContent = `${salle.history.length + (salle.current ? 1 : 0)} claim(s) total`;
    hdr.appendChild(locEl);
    hdr.appendChild(countEl);
    card.appendChild(hdr);

    // Maire actuel
    if (salle.current) {
      card.appendChild(buildClaimRow(salle.current, true, () => loadSallesView()));
    } else {
      const emptyEl = document.createElement('div');
      emptyEl.textContent = 'Aucun maire actif.';
      emptyEl.style.cssText = 'font:11px system-ui,sans-serif; opacity:0.5; padding:4px 0;';
      card.appendChild(emptyEl);
    }

    // Historique
    if (salle.history.length > 0) {
      const histToggle = document.createElement('button');
      histToggle.type = 'button';
      histToggle.textContent = `📂 Historique (${salle.history.length})`;
      histToggle.style.cssText = `
        background:rgba(255,255,255,0.08); color:#fff; border:none; border-radius:5px;
        padding:4px 8px; cursor:pointer; font:10px system-ui,sans-serif; text-align:left;
      `;

      const histList = document.createElement('div');
      histList.style.cssText = 'display:none; flex-direction:column; gap:6px;';

      let histOpen = false;
      histToggle.addEventListener('click', () => {
        histOpen = !histOpen;
        histList.style.display = histOpen ? 'flex' : 'none';
        histToggle.textContent = histOpen
          ? `📂 Masquer historique`
          : `📂 Historique (${salle.history.length})`;
        if (histOpen && !histList.children.length) {
          for (const entry of salle.history) {
            histList.appendChild(buildClaimRow(entry, false, () => loadSallesView()));
          }
        }
      });

      card.appendChild(histToggle);
      card.appendChild(histList);
    }

    return card;
  }

  function buildClaimRow(entry, isCurrent, onAction) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; flex-direction:column; gap:4px;
      background:${isCurrent ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)'};
      border-radius:6px; padding:6px;
      border-left:3px solid ${isCurrent ? '#818cf8' : 'rgba(255,255,255,0.1)'};
    `;

    const rowHdr = document.createElement('div');
    rowHdr.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:6px;';

    const userEl = document.createElement('div');
    userEl.style.cssText = 'font:600 11px system-ui,sans-serif;';
    userEl.textContent = `${isCurrent ? '👑 ' : ''}${entry.username}`;

    const dateEl = document.createElement('div');
    dateEl.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.55;';
    dateEl.textContent = new Date(entry.claimedAt * 1000).toLocaleString('fr-FR', { hour12: false });

    rowHdr.appendChild(userEl);
    rowHdr.appendChild(dateEl);
    row.appendChild(rowHdr);

    if (entry.photoDataUrl) {
      const img = document.createElement('img');
      img.src = entry.photoDataUrl;
      img.style.cssText = 'width:100%; max-height:120px; object-fit:cover; border-radius:5px; cursor:pointer;';
      img.addEventListener('click', () => window.open(entry.photoDataUrl, '_blank'));
      row.appendChild(img);
    }

    // Statut review
    const reviewBadge = document.createElement('div');
    reviewBadge.style.cssText = 'font:10px system-ui,sans-serif;';
    if (!isCurrent) {
      reviewBadge.textContent = '✕ Rejeté';
      reviewBadge.style.color = '#fca5a5';
    } else if (entry.adminReviewed) {
      reviewBadge.textContent = '✓ Validé par admin';
      reviewBadge.style.color = '#86efac';
    } else {
      reviewBadge.textContent = '⏳ En attente de vérification';
      reviewBadge.style.color = '#fbbf24';
    }
    row.appendChild(reviewBadge);

    // Boutons review si actif et non encore vérifié
    if (isCurrent && !entry.adminReviewed) {
      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex; gap:6px; align-items:center; flex-wrap:wrap;';
      const approveBtn = makeBtn('✓ Valider', '#86efac');
      const rejectBtn  = makeBtn('✕ Triche — chrono 0', '#fca5a5');
      const statusEl   = document.createElement('div');
      statusEl.style.cssText = 'font-size:10px; opacity:0.8;';

      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true; rejectBtn.disabled = true;
        statusEl.textContent = '…';
        try {
          await reviewMayor(entry.mayorId, 'approve');
          statusEl.textContent = '✓ Validé';
          setTimeout(onAction, 700);
        } catch (err) {
          statusEl.textContent = err.message || 'Erreur';
          approveBtn.disabled = false; rejectBtn.disabled = false;
        }
      });

      rejectBtn.addEventListener('click', async () => {
        approveBtn.disabled = true; rejectBtn.disabled = true;
        statusEl.textContent = '…';
        try {
          await reviewMayor(entry.mayorId, 'reject');
          statusEl.textContent = '✕ Triche signalée';
          setTimeout(onAction, 700);
        } catch (err) {
          statusEl.textContent = err.message || 'Erreur';
          approveBtn.disabled = false; rejectBtn.disabled = false;
        }
      });

      actionsRow.appendChild(approveBtn);
      actionsRow.appendChild(rejectBtn);
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

  refreshBtn.addEventListener('click', () => {
    if (activeView === 'weekly') loadWeeklyTab();
    else if (activeView === 'mayors') loadMayorReviews();
    else if (activeView === 'salles') loadSallesView();
    else if (activeView === 'pins') loadPinsView();
    else if (activeView === 'reports') loadReportsView();
    else loadBucket(activeBucket);
  });

  // ── Public API ───────────────────────────────────────────────────────────
  function togglePanel() {
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
      removeDragMarkers();
      panel.style.display = 'none';
    } else {
      panel.style.display = 'flex';
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

  function remove() { removeDragMarkers(); root.remove(); }

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

function formatFloor(floor) {
  const labels = { '-1': 'SS', 0: 'RDC', 1: 'N+1', 2: 'N+2', 3: 'N+3', 4: 'N+4' };
  return `🏢 ${labels[floor] ?? `Étage ${floor}`}`;
}
