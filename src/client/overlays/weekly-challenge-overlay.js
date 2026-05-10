import { getRoomMayors, reportMayor } from '../services/challenge-api.js';
import { state } from '../app/state.js';

export function createWeeklyChallengeOverlay({
  container = document.body,
  onClaimRoom,
} = {}) {
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

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
  const titleEl = document.createElement('span');
  titleEl.textContent = '👑 King of the Campus';
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

  const listEl = document.createElement('div');
  listEl.style.cssText = 'display:flex; flex-direction:column; gap:10px;';

  panel.appendChild(header);
  panel.appendChild(statusEl);
  panel.appendChild(listEl);
  root.appendChild(panel);
  container.appendChild(root);

  let currentUserId = null;
  let countdownIntervalId = null;

  function formatCountdown(protectionEndsAtSeconds) {
    const remaining = protectionEndsAtSeconds - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
  }

  function renderLeaderboard(entries) {
    if (!entries || entries.length === 0) return null;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    const heading = document.createElement('div');
    heading.textContent = 'CLASSEMENT';
    heading.style.cssText = 'font:9px system-ui,sans-serif; opacity:0.45; letter-spacing:0.08em; text-transform:uppercase;';
    wrap.appendChild(heading);
    entries.forEach((entry, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.8; display:flex; gap:4px;';
      const mins = Math.floor(entry.totalSeconds / 60);
      const secs = entry.totalSeconds % 60;
      const timeStr = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
      row.textContent = `${i === 0 ? '👑 ' : `${i + 1}. `}${entry.username} — ${timeStr}`;
      wrap.appendChild(row);
    });
    return wrap;
  }

  function renderLocationCard(locData) {
    const card = document.createElement('div');
    card.dataset.locationId = locData.locationId;
    card.style.cssText = `
      background:rgba(255,255,255,0.07); border-radius:8px; padding:8px;
      display:flex; flex-direction:column; gap:6px;
    `;

    const locName = document.createElement('div');
    locName.textContent = locData.locationLabel;
    locName.style.cssText = 'font-weight:600; font-size:12px;';
    card.appendChild(locName);

    if (locData.mayor) {
      const mayorLine = document.createElement('div');
      mayorLine.style.cssText = 'font:600 11px system-ui,sans-serif; opacity:0.9;';
      mayorLine.textContent = `👑 Maire : ${locData.mayor.username}`;
      card.appendChild(mayorLine);

      if (locData.mayor.photoDataUrl) {
        const photoLabel = document.createElement('div');
        photoLabel.textContent = '📸 Photo du lieu revendiqué';
        photoLabel.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.55; margin-top:2px;';
        card.appendChild(photoLabel);

        const photo = document.createElement('img');
        photo.src = locData.mayor.photoDataUrl;
        photo.title = 'Cliquer pour agrandir';
        photo.style.cssText = `
          width:100%; max-height:160px; object-fit:cover; border-radius:8px;
          cursor:pointer; display:block;
        `;
        photo.addEventListener('click', () => window.open(locData.mayor.photoDataUrl, '_blank'));
        card.appendChild(photo);
      }
    } else {
      const mayorLine = document.createElement('div');
      mayorLine.style.cssText = 'font:11px system-ui,sans-serif; opacity:0.55;';
      mayorLine.textContent = 'Aucun maire — salle libre';
      card.appendChild(mayorLine);
    }

    if (locData.protectionEndsAt && locData.mayor && locData.mayor.userId !== currentUserId) {
      const countdownEl = document.createElement('span');
      countdownEl.dataset.protectionEnds = String(locData.protectionEndsAt);
      const txt = formatCountdown(locData.protectionEndsAt);
      countdownEl.textContent = txt ? `🔒 Protégé encore ${txt}` : '';
      countdownEl.style.cssText = 'font:10px system-ui,sans-serif; color:#fbbf24;';
      card.appendChild(countdownEl);
    }

    if (locData.mayor && locData.mayor.userId === currentUserId) {
      const selfLabel = document.createElement('div');
      selfLabel.textContent = '✓ Vous êtes le maire';
      selfLabel.style.cssText = 'font:600 10px system-ui,sans-serif; color:#34d399;';
      card.appendChild(selfLabel);

      // Deadline de renouvellement (15h)
      if (locData.mayor.renewalDeadline) {
        const deadlineEl = document.createElement('div');
        deadlineEl.dataset.renewalDeadline = String(locData.mayor.renewalDeadline);
        deadlineEl.style.cssText = 'font:10px system-ui,sans-serif; color:#fbbf24;';
        const txt = formatCountdown(locData.mayor.renewalDeadline);
        deadlineEl.textContent = txt ? `⏰ Renouveler avant : ${txt}` : '⚠️ Délai dépassé !';
        card.appendChild(deadlineEl);
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const isProtectedByOther = locData.protectionEndsAt &&
      locData.mayor && locData.mayor.userId !== currentUserId &&
      locData.protectionEndsAt > nowSec;

    const isSelf = locData.mayor && locData.mayor.userId === currentUserId;

    if (isSelf) {
      // Bouton renouvellement pour le maire — bloqué si cooldown actif
      const cooldownActive = locData.mayor.renewalAllowedAt && nowSec < locData.mayor.renewalAllowedAt;
      const renewBtn = document.createElement('button');
      renewBtn.type = 'button';
      renewBtn.style.cssText = `
        min-height:44px; padding:8px 12px;
        font:12px system-ui,sans-serif; font-weight:600;
        border:none; border-radius:6px;
        -webkit-tap-highlight-color:transparent;
        ${cooldownActive
          ? 'background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); cursor:not-allowed;'
          : 'background:#60a5fa; color:#111827; cursor:pointer;'}
      `;
      if (cooldownActive) {
        const waitSec = locData.mayor.renewalAllowedAt - nowSec;
        const h = Math.floor(waitSec / 3600);
        const m = Math.floor((waitSec % 3600) / 60);
        const waitStr = h > 0 ? `${h}h ${m}min` : `${m} min`;
        renewBtn.textContent = `🔄 Renouveler dans ${waitStr}`;
        renewBtn.dataset.renewalAllowedAt = String(locData.mayor.renewalAllowedAt);
        renewBtn.disabled = true;
      } else {
        renewBtn.textContent = '🔄 Renouveler la photo';
        renewBtn.addEventListener('click', () => {
          onClaimRoom?.(locData.locationId);
          closePanel();
        });
      }
      card.appendChild(renewBtn);

    } else if (isProtectedByOther) {
      // Salle protégée — afficher quand disponible
      const waitBtn = document.createElement('button');
      waitBtn.type = 'button';
      waitBtn.disabled = true;
      waitBtn.style.cssText = `
        min-height:44px; padding:8px 12px;
        background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4);
        font:12px system-ui,sans-serif; font-weight:600;
        border:none; border-radius:6px; cursor:not-allowed;
      `;
      const protTxt = formatCountdown(locData.protectionEndsAt);
      waitBtn.textContent = protTxt ? `🔒 Revendiquer dans ${protTxt}` : '📍 Revendiquer';
      waitBtn.dataset.protectionEnds = String(locData.protectionEndsAt);
      card.appendChild(waitBtn);

    } else {
      // Salle libre ou protection expirée — on peut revendiquer
      const claimBtn = document.createElement('button');
      claimBtn.type = 'button';
      claimBtn.textContent = '📍 Revendiquer';
      claimBtn.style.cssText = `
        min-height:44px; padding:8px 12px;
        background:#60a5fa; color:#111827;
        font:12px system-ui,sans-serif; font-weight:600;
        border:none; border-radius:6px; cursor:pointer;
        -webkit-tap-highlight-color:transparent;
      `;
      claimBtn.addEventListener('click', () => {
        onClaimRoom?.(locData.locationId);
        closePanel();
      });
      card.appendChild(claimBtn);
    }

    if (locData.mayor && locData.mayor.userId !== currentUserId && currentUserId) {
      const reportBtn = document.createElement('button');
      reportBtn.type = 'button';
      reportBtn.textContent = '🚩 Photo incorrecte — Signaler à l\'admin';
      reportBtn.style.cssText = `
        min-height:44px; padding:6px 10px;
        background:rgba(255,255,255,0.06); color:#fca5a5;
        font:11px system-ui,sans-serif;
        border:1px solid rgba(252,165,165,0.25); border-radius:6px; cursor:pointer;
        -webkit-tap-highlight-color:transparent; text-align:left;
      `;
      const reportStatus = document.createElement('div');
      reportStatus.style.cssText = 'font:10px system-ui,sans-serif; opacity:0.65; min-height:12px;';
      reportBtn.addEventListener('click', async () => {
        reportBtn.disabled = true;
        reportStatus.textContent = '…';
        try {
          await reportMayor(locData.mayor.mayorId);
          reportBtn.textContent = '✓ Signalement envoyé à l\'admin';
          reportStatus.textContent = 'L\'admin examinera la photo et te notifiera.';
        } catch (err) {
          reportBtn.textContent = err.message || 'Erreur';
          reportBtn.disabled = false;
          reportStatus.textContent = '';
        }
      });
      card.appendChild(reportBtn);
      card.appendChild(reportStatus);
    }

    const lb = renderLeaderboard(locData.leaderboard);
    if (lb) card.appendChild(lb);

    return card;
  }

  async function loadMayors() {
    statusEl.textContent = 'Chargement…';
    listEl.innerHTML = '';
    try {
      const mayors = await getRoomMayors();
      statusEl.textContent = '';
      mayors.forEach(loc => {
        listEl.appendChild(renderLocationCard(loc));
      });
    } catch (err) {
      statusEl.textContent = err.message || 'Erreur de chargement.';
    }
  }

  function tickCountdowns() {
    const nowSec = Math.floor(Date.now() / 1000);

    for (const el of panel.querySelectorAll('[data-protection-ends]')) {
      const endsAt = Number(el.dataset.protectionEnds);
      const txt = formatCountdown(endsAt);
      el.textContent = txt ? `🔒 Protégé encore ${txt}` : '';
    }

    for (const el of panel.querySelectorAll('[data-renewal-deadline]')) {
      const endsAt = Number(el.dataset.renewalDeadline);
      const txt = formatCountdown(endsAt);
      el.textContent = txt ? `⏰ Renouveler avant : ${txt}` : '⚠️ Délai dépassé !';
      el.style.color = (endsAt - nowSec) < 3600 ? '#ef4444' : '#fbbf24';
    }

    for (const el of panel.querySelectorAll('[data-renewal-allowed-at]')) {
      const allowedAt = Number(el.dataset.renewalAllowedAt);
      if (nowSec >= allowedAt) {
        el.textContent = '🔄 Renouveler la photo';
        el.disabled = false;
        el.style.background = '#60a5fa';
        el.style.color = '#111827';
        el.style.cursor = 'pointer';
        delete el.dataset.renewalAllowedAt;
      } else {
        const waitSec = allowedAt - nowSec;
        const h = Math.floor(waitSec / 3600);
        const m = Math.floor((waitSec % 3600) / 60);
        const waitStr = h > 0 ? `${h}h ${m}min` : `${m} min`;
        el.textContent = `🔄 Renouveler dans ${waitStr}`;
      }
    }
  }

  async function openPanel() {
    currentUserId = state.player?.id ?? null;
    titleEl.textContent = '👑 King of the Campus';
    root.style.display = 'flex';
    await loadMayors();
    countdownIntervalId = setInterval(tickCountdowns, 1000);
  }

  function closePanel() {
    root.style.display = 'none';
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }

  async function openAtLocation(locationId) {
    currentUserId = state.player?.id ?? null;
    listEl.innerHTML = '';
    statusEl.textContent = 'Chargement…';
    root.style.display = 'flex';
    clearInterval(countdownIntervalId);
    try {
      const mayors = await getRoomMayors();
      const locData = mayors.find(m => m.locationId === locationId);
      statusEl.textContent = '';
      if (locData) {
        titleEl.textContent = `📍 ${locData.locationLabel}`;
        listEl.appendChild(renderLocationCard(locData));
      } else {
        statusEl.textContent = 'Salle introuvable.';
      }
    } catch (err) {
      statusEl.textContent = err.message || 'Erreur de chargement.';
    }
    countdownIntervalId = setInterval(tickCountdowns, 1000);
  }

  return {
    openPanel,
    openAtLocation,
    closePanel,
    remove: () => root.remove(),
  };
}
