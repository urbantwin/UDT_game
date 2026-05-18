import { getCtfLeaderboard, getCtfPlayerLeaderboard, getCtfTeamComposition } from '../services/ctf-api.js';

export function createCtfLeaderboardOverlay({ container = document.body } = {}) {
  let el = null;
  let activeTab = 'teams';

  function show() {
    if (el) { el.remove(); }
    el = build();
    container.appendChild(el);
    loadTab(activeTab);
  }

  function hide() {
    if (el) { el.remove(); el = null; }
  }

  function toggle() {
    if (el) hide(); else show();
  }

  function build() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:1300;
      background:rgba(0,0,0,0.55); display:flex; align-items:flex-end;
      font-family:system-ui,sans-serif;
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

    const panel = document.createElement('div');
    panel.style.cssText = `
      width:100%; max-width:480px; margin:0 auto;
      background:#111827; border-radius:16px 16px 0 0;
      padding:0 0 24px; max-height:80vh; display:flex; flex-direction:column;
      box-shadow:0 -4px 24px rgba(0,0,0,0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 16px 0; flex-shrink:0;
    `;
    const title = document.createElement('span');
    title.textContent = '📊 Classements';
    title.style.cssText = 'font:700 15px system-ui; color:#fff;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background:transparent; border:none; color:#9ca3af; font-size:18px;
      cursor:pointer; padding:0; line-height:1;
    `;
    closeBtn.addEventListener('click', hide);
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Tabs
    const tabBar = document.createElement('div');
    tabBar.style.cssText = `
      display:flex; padding:10px 16px 0; gap:4px; flex-shrink:0;
    `;
    const tabs = [
      { id: 'teams',       label: '🏆 Équipes' },
      { id: 'players',     label: '👤 Joueurs' },
      { id: 'composition', label: '👥 Composition' },
    ];
    const tabBtns = {};
    tabs.forEach(t => {
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = `
        flex:1; padding:7px 4px; border:none; border-radius:8px; cursor:pointer;
        font:600 11px system-ui; transition:background 0.15s, color 0.15s;
      `;
      btn.addEventListener('click', () => {
        activeTab = t.id;
        updateTabStyles();
        loadTab(t.id);
      });
      tabBtns[t.id] = btn;
      tabBar.appendChild(btn);
    });
    panel.appendChild(tabBar);

    function updateTabStyles() {
      tabs.forEach(t => {
        const btn = tabBtns[t.id];
        const active = t.id === activeTab;
        btn.style.background = active ? 'rgba(99,102,241,0.85)' : 'rgba(255,255,255,0.08)';
        btn.style.color = active ? '#fff' : '#9ca3af';
      });
    }
    updateTabStyles();

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
      flex:1; overflow-y:auto; padding:12px 16px;
      display:flex; flex-direction:column; gap:8px;
    `;
    panel.appendChild(content);
    overlay.appendChild(panel);

    panel._content = content;
    panel._tabBtns = tabBtns;
    panel._updateTabStyles = updateTabStyles;

    return overlay;
  }

  function getContent() {
    return el?.querySelector('div[style*="overflow-y"]') ??
           el?.firstElementChild?.children[3];
  }

  async function loadTab(tab) {
    const content = el?.firstElementChild?.lastElementChild;
    if (!content) return;
    content.innerHTML = '<div style="color:#9ca3af;font:12px system-ui;padding:8px">Chargement…</div>';
    try {
      if (tab === 'teams')       await renderTeams(content);
      if (tab === 'players')     await renderPlayers(content);
      if (tab === 'composition') await renderComposition(content);
    } catch (err) {
      content.innerHTML = `<div style="color:#f87171;font:12px system-ui;padding:8px">${err.message}</div>`;
    }
  }

  async function renderTeams(content) {
    const rows = await getCtfLeaderboard();
    content.innerHTML = '';
    if (!rows.length) {
      content.innerHTML = '<div style="color:#9ca3af;font:12px system-ui">Aucune donnée.</div>';
      return;
    }
    rows.sort((a, b) => b.totalPoints - a.totalPoints);
    rows.forEach((team, i) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex; align-items:center; gap:10px;
        background:rgba(255,255,255,0.06); border-radius:10px; padding:10px 12px;
      `;
      const dot = document.createElement('span');
      dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${team.color};flex-shrink:0;`;
      const nameEl = document.createElement('span');
      nameEl.style.cssText = 'font:700 14px system-ui; color:#fff; flex:1;';
      nameEl.textContent = team.name;
      const stats = document.createElement('div');
      stats.style.cssText = 'text-align:right;';
      stats.innerHTML = `
        <div style="font:700 15px system-ui;color:#fff">${team.totalPoints} pts</div>
        <div style="font:400 10px system-ui;color:#9ca3af">${team.roomsControlled} salle${team.roomsControlled !== 1 ? 's' : ''}</div>
      `;
      if (i === 0) {
        const crown = document.createElement('span');
        crown.textContent = '👑';
        crown.style.fontSize = '16px';
        row.appendChild(crown);
      }
      row.appendChild(dot);
      row.appendChild(nameEl);
      row.appendChild(stats);
      content.appendChild(row);
    });
  }

  async function renderPlayers(content) {
    const rows = await getCtfPlayerLeaderboard();
    content.innerHTML = '';
    if (!rows.length) {
      content.innerHTML = '<div style="color:#9ca3af;font:12px system-ui">Aucun joueur classé pour l\'instant.</div>';
      return;
    }
    rows.forEach((p, i) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex; align-items:center; gap:8px;
        padding:8px 10px; border-radius:8px;
        background:rgba(255,255,255,0.04);
      `;
      const rank = document.createElement('span');
      rank.style.cssText = 'font:700 11px system-ui; color:#6b7280; min-width:20px;';
      rank.textContent = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const dot = document.createElement('span');
      dot.style.cssText = `
        width:8px;height:8px;border-radius:50%;flex-shrink:0;
        background:${p.teamColor ?? '#6b7280'};
      `;
      const name = document.createElement('span');
      name.style.cssText = 'font:600 13px system-ui; color:#e5e7eb; flex:1;';
      name.textContent = p.username;
      const score = document.createElement('span');
      score.style.cssText = 'font:700 13px system-ui; color:#fff;';
      score.textContent = `${p.ctfScore} pts`;
      row.appendChild(rank);
      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(score);
      content.appendChild(row);
    });
  }

  async function renderComposition(content) {
    const teams = await getCtfTeamComposition();
    content.innerHTML = '';
    teams.forEach(team => {
      const block = document.createElement('div');
      block.style.cssText = `
        border-radius:10px; overflow:hidden;
        border:1px solid rgba(255,255,255,0.08);
      `;
      const teamHeader = document.createElement('div');
      teamHeader.style.cssText = `
        display:flex; align-items:center; gap:8px;
        padding:8px 12px; background:${team.color}22;
        border-bottom:1px solid rgba(255,255,255,0.06);
      `;
      const dot = document.createElement('span');
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${team.color};`;
      const tname = document.createElement('span');
      tname.style.cssText = `font:700 13px system-ui; color:${team.color};`;
      tname.textContent = `${team.name}  (${team.members.length} joueur${team.members.length !== 1 ? 's' : ''})`;
      teamHeader.appendChild(dot);
      teamHeader.appendChild(tname);
      block.appendChild(teamHeader);
      if (team.members.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:8px 12px; font:400 12px system-ui; color:#6b7280;';
        empty.textContent = 'Aucun membre';
        block.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.style.cssText = 'display:flex; flex-direction:column;';
        team.members.forEach(m => {
          const item = document.createElement('div');
          item.style.cssText = `
            padding:6px 12px; font:400 12px system-ui; color:#d1d5db;
            border-bottom:1px solid rgba(255,255,255,0.04);
          `;
          item.textContent = m.username;
          list.appendChild(item);
        });
        block.appendChild(list);
      }
      content.appendChild(block);
    });
  }

  function remove() { hide(); }

  return { show, hide, toggle, remove };
}
