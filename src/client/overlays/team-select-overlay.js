// Full-screen forced-choice modal for team selection after login.
// Must not be dismissible — player must pick a team.

import { setTeam } from '../services/ctf-api.js';

export function createTeamSelectOverlay({ container = document.body, onTeamSelected } = {}) {
  let el = null;

  function buildOverlay(teams) {
    el = document.createElement('div');
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 9500;
      background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a1a2e; border-radius: 16px; padding: 36px 32px;
      max-width: 380px; width: 90%; text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Choisissez votre equipe';
    title.style.cssText = `
      color: #fff; font: 700 22px system-ui, sans-serif;
      margin: 0 0 8px;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Ce choix est definitif. Bonne chance !';
    subtitle.style.cssText = `
      color: #aaa; font: 400 14px system-ui, sans-serif;
      margin: 0 0 28px;
    `;

    const errorEl = document.createElement('p');
    errorEl.style.cssText = `
      color: #e74c3c; font: 400 13px system-ui, sans-serif;
      margin: 12px 0 0; min-height: 18px;
    `;

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    for (const team of teams) {
      const btn = document.createElement('button');
      btn.textContent = team.name;
      btn.style.cssText = `
        background: ${team.color}; color: #fff;
        border: none; border-radius: 10px;
        min-height: 56px; width: 100%;
        font: 700 16px system-ui, sans-serif;
        cursor: pointer; transition: opacity 0.15s;
      `;
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.85'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });

      btn.addEventListener('click', async () => {
        btn.disabled = true;
        errorEl.textContent = '';
        try {
          await setTeam(team.id);
          onTeamSelected?.(team);
          afterSelectCb?.(team);
          hide();
        } catch (err) {
          // Team already assigned on server — treat as success
          if (err.message?.includes('assignee') || err.message?.includes('already')) {
            onTeamSelected?.(team);
            afterSelectCb?.(team);
            hide();
          } else {
            errorEl.textContent = err.message || 'Erreur lors du choix. Reessaie.';
            btn.disabled = false;
          }
        }
      });

      btnGroup.appendChild(btn);
    }

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(btnGroup);
    card.appendChild(errorEl);
    el.appendChild(card);
    container.appendChild(el);
  }

  let afterSelectCb = null;

  function show(teams, { onAfterSelect } = {}) {
    afterSelectCb = onAfterSelect ?? null;
    if (el) el.remove();
    buildOverlay(teams);
  }

  function hide() {
    if (el) {
      el.remove();
      el = null;
    }
  }

  function remove() {
    hide();
  }

  return { show, hide, remove };
}
