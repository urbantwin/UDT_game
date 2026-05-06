import { getRoomMayors } from '../services/challenge-api.js';
import { reviewMayor } from '../services/admin-api.js';

export function createWeeklySection({ container, locations = [] } = {}) {
  let sectionRoot = null;

  function mount() {
    sectionRoot = document.createElement('div');
    sectionRoot.style.cssText = 'display:flex; flex-direction:column; gap:10px;';

    const heading = document.createElement('div');
    heading.textContent = 'MAIRES ACTUELS';
    heading.style.cssText = `
      font:10px system-ui,sans-serif; opacity:0.5;
      letter-spacing:0.08em; text-transform:uppercase;
    `;

    const statusEl = document.createElement('div');
    statusEl.style.cssText = 'font:11px system-ui,sans-serif; opacity:0.7;';

    const tableEl = document.createElement('div');
    tableEl.style.cssText = 'display:flex; flex-direction:column; gap:2px;';

    sectionRoot.appendChild(heading);
    sectionRoot.appendChild(statusEl);
    sectionRoot.appendChild(tableEl);
    container.appendChild(sectionRoot);

    async function loadMayorsAdmin() {
      statusEl.textContent = 'Chargement…';
      tableEl.innerHTML = '';
      try {
        const items = await getRoomMayors();
        statusEl.textContent = '';
        items.forEach(loc => tableEl.appendChild(buildMayorRow(loc, loadMayorsAdmin)));
      } catch (err) {
        statusEl.textContent = err.message || 'Erreur de chargement.';
      }
    }

    loadMayorsAdmin();
  }

  function buildMayorRow(locData, reloadFn) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; gap:8px; align-items:center; padding:6px 0;
      border-bottom:1px solid rgba(255,255,255,0.08);
      font:11px system-ui,sans-serif; flex-wrap:wrap;
    `;

    const locCol = document.createElement('div');
    locCol.style.cssText = 'min-width:130px; font-weight:600;';
    locCol.textContent = locData.locationLabel;

    const mayorCol = document.createElement('div');
    mayorCol.style.cssText = 'min-width:80px; opacity:0.85;';
    mayorCol.textContent = locData.mayor ? locData.mayor.username : '—';

    const reportsBadge = document.createElement('span');
    const count = locData.mayor?.pendingReports ?? 0;
    reportsBadge.textContent = count > 0 ? `${count} signal.` : '';
    reportsBadge.style.cssText = `
      padding:1px 6px; border-radius:4px; font-size:10px;
      background:${count > 0 ? 'rgba(252,165,165,0.25)' : 'transparent'};
      color:${count > 0 ? '#fca5a5' : 'transparent'};
    `;

    row.appendChild(locCol);
    row.appendChild(mayorCol);
    row.appendChild(reportsBadge);

    if (locData.mayor && count > 0) {
      const mayorId = locData.mayor.mayorId;

      const approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.textContent = 'Approuver';
      approveBtn.style.cssText = `
        min-height:34px; padding:4px 8px;
        background:#86efac; color:#111827;
        font:10px system-ui,sans-serif; font-weight:600;
        border:none; border-radius:5px; cursor:pointer;
      `;

      const rejectBtn = document.createElement('button');
      rejectBtn.type = 'button';
      rejectBtn.textContent = 'Refuser';
      rejectBtn.style.cssText = `
        min-height:34px; padding:4px 8px;
        background:#fca5a5; color:#111827;
        font:10px system-ui,sans-serif; font-weight:600;
        border:none; border-radius:5px; cursor:pointer;
      `;

      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        try {
          await reviewMayor(mayorId, 'approve');
          reloadFn();
        } catch (err) {
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
          approveBtn.textContent = err.message || 'Erreur';
        }
      });

      rejectBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        try {
          await reviewMayor(mayorId, 'reject');
          reloadFn();
        } catch (err) {
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
          rejectBtn.textContent = err.message || 'Erreur';
        }
      });

      row.appendChild(approveBtn);
      row.appendChild(rejectBtn);
    }

    return row;
  }

  function unmount() {
    sectionRoot?.remove();
    sectionRoot = null;
  }

  return { mount, unmount };
}
