import { login, register, logout } from '../services/auth-api.js';

const KING_RULES = [
  'Dans King of Campus, trois équipes s\'affrontent pour contrôler le plus de salles',
  '50 salles de l\'EPFL peuvent être revendiquées sur 4 étages',
  'Pour revendiquer une salle et en devenir le ou la maire, rendez-vous physiquement sur les lieux et prenez une photo de la salle.',
  'La photo doit permettre d\'identifier clairement la salle, et peut être signalée par vos adversaires si elle n\'est pas valide',
  'Quand vous devenez maire, vous contrôlez la salle pendant 24h: au-delà de ce délai elle redevient neutre si vous ne prenez pas une nouvelle photo',
  'Mais attention, rien n\'est acquis, car vos adversaires peuvent aussi revendiquer une salle que vous contrôlez et vous prendre votre place de maire !',
  'CLASSEMENT ET SCORE:',
  ' - à chaque heure pile, tu reçois un point par salle que tu contrôles',
  ' - à chaque heure pile, ton équipe reçoit un point par salle que tu contrôles',
  ' - à chaque heure pile, l\'équipe qui contrôle le plus de salles au total reçoit 3 points de bonus pour domination',
  ' - à 13h et 14h, les équipes reçoivent 1 point bonus pour chaque salle qu\'elles contrôlent (bonus pause déj)',
  'ATTENTION: la triche n\'est pas tolérée et sera sévèrement réprimandée',
  'Par example, les photos invalides signalées sont punies par un malus de 10 points'
];

const GUESSR_RULES = [
  'EPFL Guessr n\est actuellement pas testé'
];

export function createLandingOverlay({ onGameChosen, onUserLoaded, onLogout } = {}) {
  let el = null;

  function show(userOrLoading) {
    if (el) el.remove();
    el = build(userOrLoading);
    document.body.appendChild(el);
  }

  function hide() {
    if (el) { el.remove(); el = null; }
  }

  function build(userOrLoading) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:10001;
      background: linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #1a1a2e 100%);
      display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
      font-family: system-ui, sans-serif; overflow-y:auto; padding:24px 16px 40px;
    `;

    if (userOrLoading === 'loading') {
      const spinner = document.createElement('div');
      spinner.style.cssText = `
        position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        color:#fff; font:600 16px system-ui;
      `;
      spinner.textContent = 'Chargement…';
      overlay.appendChild(spinner);
      return overlay;
    }

    const user = userOrLoading;
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px; padding: 40px 28px 32px;
      max-width: 400px; width: 100%; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      margin-top: 16px;
    `;

    buildHeader(card);

    if (user) {
      buildWelcomeSection(card, user, overlay);
    } else {
      buildAuthSection(card, overlay);
    }

    buildRulesSection(card);
    overlay.appendChild(card);
    return overlay;
  }

  function buildHeader(card) {
    const logo = document.createElement('div');
    logo.textContent = '🏙️';
    logo.style.cssText = 'font-size:48px; margin-bottom:8px; line-height:1;';

    const title = document.createElement('h1');
    title.textContent = 'EPFL Minigames';
    title.style.cssText = `
      color:#fff; font:800 30px system-ui; margin:0 0 4px; letter-spacing:-0.5px;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Urban Digital Twin — EPFL';
    subtitle.style.cssText = `color:#888; font:400 13px system-ui; margin:0 0 32px;`;

    card.appendChild(logo);
    card.appendChild(title);
    card.appendChild(subtitle);
  }

  function buildWelcomeSection(card, user, overlay) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; align-items:center; justify-content:space-between;
      margin:0 0 28px; padding:12px 16px;
      background:rgba(99,102,241,0.15);
      border-radius:10px; border:1px solid rgba(99,102,241,0.3);
    `;

    const welcome = document.createElement('span');
    welcome.style.cssText = 'color:#818cf8; font:600 15px system-ui;';
    welcome.textContent = `Bienvenue, ${user.username} !`;

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Déconnexion';
    logoutBtn.style.cssText = `
      background:transparent; color:#888; border:1px solid #555;
      border-radius:6px; padding:4px 10px; font:500 12px system-ui;
      cursor:pointer; transition:color 0.15s, border-color 0.15s; white-space:nowrap;
    `;
    logoutBtn.addEventListener('mouseenter', () => {
      logoutBtn.style.color = '#f87171';
      logoutBtn.style.borderColor = '#f87171';
    });
    logoutBtn.addEventListener('mouseleave', () => {
      logoutBtn.style.color = '#888';
      logoutBtn.style.borderColor = '#555';
    });
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      await logout().catch(() => {});
      onLogout?.();
      show(null);
    });

    row.appendChild(welcome);
    row.appendChild(logoutBtn);
    card.appendChild(row);
    buildGameChoice(card, user, overlay);
  }

  function buildGameChoice(card, user, overlay) {
    const label = document.createElement('p');
    label.textContent = 'Choisissez votre jeu';
    label.style.cssText = `
      color:#bbb; font:600 12px system-ui; margin:0 0 16px;
      text-transform:uppercase; letter-spacing:1px;
    `;
    card.appendChild(label);

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; gap:12px; justify-content:center; margin-bottom:8px;
    `;

    const cardGuessr = makeLogoCard('/logo.png', 'EPFL Guessr', '#0ea5e9');
    const cardKing   = makeLogoCard('/logo_king.png', 'King of Campus', '#6366f1');

//    cardGuessr.addEventListener('click', () => { onGameChosen?.('guessr', user); hide(); });
// for now, no EPFL Guessr available to avoid confusion
    cardGuessr.addEventListener('click', () => {
      showUnavailableOverlay();
    });

    cardKing.addEventListener('click',   () => { onGameChosen?.('king',   user); hide(); });

    row.appendChild(cardGuessr);
    row.appendChild(cardKing);
    card.appendChild(row);
  }

  function makeLogoCard(src, name, accentColor) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `
      flex:1; display:flex; flex-direction:column; align-items:center; gap:10px;
      background:rgba(255,255,255,0.05);
      border:2px solid rgba(255,255,255,0.1);
      border-radius:14px; padding:14px 8px 12px;
      cursor:pointer;
      transition:border-color 0.15s, transform 0.1s, background 0.15s;
      -webkit-tap-highlight-color:transparent;
    `;

    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.style.cssText = `
      width:100%; max-width:120px; aspect-ratio:1/1;
      object-fit:contain; border-radius:10px;
      pointer-events:none;
    `;

    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    nameEl.style.cssText = `
      color:#fff; font:600 12px system-ui; text-align:center;
      pointer-events:none;
    `;

    btn.appendChild(img);
    btn.appendChild(nameEl);

    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = accentColor;
      btn.style.background = `${accentColor}22`;
      btn.style.transform = 'translateY(-2px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'rgba(255,255,255,0.1)';
      btn.style.background = 'rgba(255,255,255,0.05)';
      btn.style.transform = 'translateY(0)';
    });

    return btn;
  }

  function buildAuthSection(card, overlay) {
    const tabBar = document.createElement('div');
    tabBar.style.cssText = `
      display:flex; margin-bottom:20px; border-radius:10px; overflow:hidden;
      border:1px solid rgba(255,255,255,0.15);
    `;

    const tabLogin = makeTab('Connexion');
    const tabRegister = makeTab('Inscription');
    tabBar.appendChild(tabLogin);
    tabBar.appendChild(tabRegister);
    card.appendChild(tabBar);

    const formContainer = document.createElement('div');
    card.appendChild(formContainer);

    function activateTab(name) {
      const isLogin = name === 'login';
      tabLogin.style.background = isLogin ? 'rgba(255,255,255,0.12)' : 'transparent';
      tabLogin.style.color = isLogin ? '#fff' : '#888';
      tabRegister.style.background = isLogin ? 'transparent' : 'rgba(255,255,255,0.12)';
      tabRegister.style.color = isLogin ? '#888' : '#fff';
      formContainer.innerHTML = '';
      if (isLogin) buildLoginForm(formContainer, card, overlay);
      else buildRegisterForm(formContainer, card, overlay);
    }

    tabLogin.addEventListener('click', () => activateTab('login'));
    tabRegister.addEventListener('click', () => activateTab('register'));
    activateTab('login');
  }

  function makeTab(label) {
    const t = document.createElement('button');
    t.textContent = label;
    t.style.cssText = `
      flex:1; padding:10px; border:none; cursor:pointer; background:transparent;
      font:600 14px system-ui; color:#888; transition:background 0.15s, color 0.15s;
    `;
    return t;
  }

  function makeInput(placeholder, type) {
    const inp = document.createElement('input');
    inp.type = type;
    inp.placeholder = placeholder;
    inp.autocomplete = type === 'password' ? 'current-password' : 'username';
    inp.style.cssText = `
      display:block; width:100%; box-sizing:border-box;
      background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2);
      border-radius:10px; padding:12px 14px; margin-bottom:12px;
      color:#fff; font:400 15px system-ui; outline:none;
    `;
    inp.addEventListener('focus', () => { inp.style.borderColor = 'rgba(99,102,241,0.6)'; });
    inp.addEventListener('blur', () => { inp.style.borderColor = 'rgba(255,255,255,0.2)'; });
    return inp;
  }

  function makeErrorEl() {
    const err = document.createElement('p');
    err.style.cssText = `
      color:#f87171; font:400 13px system-ui; min-height:18px; margin:0 0 12px;
    `;
    return err;
  }

  function makeSubmitBtn(label, bg, hover) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      display:block; width:100%; background:${bg}; color:#fff;
      border:none; border-radius:10px; min-height:48px;
      font:700 15px system-ui; cursor:pointer; transition:background 0.15s;
      margin-bottom:4px;
    `;
    btn.addEventListener('mouseenter', () => { if (!btn.disabled) btn.style.background = hover; });
    btn.addEventListener('mouseleave', () => { if (!btn.disabled) btn.style.background = bg; });
    return btn;
  }

  function handleAuthSuccess(user, card, overlay) {
    onUserLoaded?.(user);
    // Replace everything after the header (3 children) with welcome + game choice
    while (card.children.length > 3) card.removeChild(card.lastChild);
    buildWelcomeSection(card, user, overlay);
    buildRulesSection(card);
  }

  function buildLoginForm(container, card, overlay) {
    const usernameInput = makeInput('Nom d\'utilisateur', 'text');
    const passwordInput = makeInput('Mot de passe', 'password');

    const rememberRow = document.createElement('label');
    rememberRow.style.cssText = `
      display:flex; align-items:center; gap:8px; margin-bottom:16px;
      color:#aaa; font:400 13px system-ui; cursor:pointer; text-align:left;
    `;
    const rememberCheck = document.createElement('input');
    rememberCheck.type = 'checkbox';
    rememberCheck.style.cssText = 'width:16px; height:16px; cursor:pointer; flex-shrink:0;';
    rememberRow.appendChild(rememberCheck);
    rememberRow.appendChild(document.createTextNode('Se souvenir de moi (30 jours)'));

    const errEl = makeErrorEl();
    const submitBtn = makeSubmitBtn('Se connecter', '#6366f1', '#4f46e5');

    submitBtn.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        errEl.textContent = 'Veuillez remplir tous les champs.';
        return;
      }
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.textContent = 'Connexion…';
      errEl.textContent = '';
      try {
        const data = await login({ username, password, rememberMe: rememberCheck.checked });
        handleAuthSuccess(data.user, card, overlay);
      } catch (err) {
        errEl.textContent = err.message || 'Erreur de connexion.';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = 'Se connecter';
      }
    });

    [usernameInput, passwordInput].forEach(inp => {
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
    });

    container.appendChild(usernameInput);
    container.appendChild(passwordInput);
    container.appendChild(rememberRow);
    container.appendChild(errEl);
    container.appendChild(submitBtn);
  }

  function buildRegisterForm(container, card, overlay) {
    const usernameInput = makeInput('Nom d\'utilisateur', 'text');
    const passwordInput = makeInput('Mot de passe (8 caractères min.)', 'password');

    const errEl = makeErrorEl();
    const submitBtn = makeSubmitBtn('Créer un compte', '#6366f1', '#4f46e5');

    submitBtn.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        errEl.textContent = 'Veuillez remplir tous les champs.';
        return;
      }
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.textContent = 'Création…';
      errEl.textContent = '';
      try {
        const data = await register({ username, password });
        handleAuthSuccess(data.user, card, overlay);
      } catch (err) {
        errEl.textContent = err.message || 'Erreur lors de l\'inscription.';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = 'Créer un compte';
      }
    });

    [usernameInput, passwordInput].forEach(inp => {
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
    });

    container.appendChild(usernameInput);
    container.appendChild(passwordInput);
    container.appendChild(errEl);
    container.appendChild(submitBtn);
  }

function buildRulesSection(card) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'margin-top:24px; text-align:center;';

  const rulesBtn = document.createElement('button');
  rulesBtn.textContent = '📖 Voir le règlement des jeux';

  rulesBtn.style.cssText = `
    padding:12px 20px;
    background:#555;
    color:white;
    border:none;
    border-radius:10px;
    font-weight:600;
    cursor:pointer;
    transition:background 0.2s ease;
  `;

  rulesBtn.addEventListener('mouseenter', () => {
    rulesBtn.style.background = '#444';
  });

  rulesBtn.addEventListener('mouseleave', () => {
    rulesBtn.style.background = '#555';
  });

  rulesBtn.addEventListener('click', () => {
    window.open('/reglement.html', '_blank');
  });

  wrapper.appendChild(rulesBtn);
  card.appendChild(wrapper);
}

  function makeAccordionToggle(label, bg, hover) {
    const btn = document.createElement('button');
    btn.style.cssText = `
      width:100%; display:flex; align-items:center; justify-content:space-between;
      background:${bg}; color:#ddd; border:none; border-radius:8px;
      padding:10px 14px; font:600 13px system-ui; cursor:pointer;
      transition:background 0.15s;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = hover; });
    btn.addEventListener('mouseleave', () => { btn.style.background = bg; });

    const text = document.createElement('span');
    text.textContent = label;
    const arrow = document.createElement('span');
    arrow.textContent = '▸';
    arrow.style.cssText = 'font-size:12px; transition:transform 0.15s;';
    btn.appendChild(text);
    btn.appendChild(arrow);
    return { btn, arrow };
  }

  function makeRulesBlock(title, rules, accentColor) {
    const block = document.createElement('div');
    block.style.cssText = `
      background:rgba(255,255,255,0.04); border-radius:10px;
      border-left:3px solid ${accentColor}; margin-bottom:10px;
    `;

    const toggle = makeAccordionToggle(title, 'transparent', 'rgba(255,255,255,0.05)');
    toggle.btn.style.borderRadius = '10px';
    block.appendChild(toggle.btn);

    const body = document.createElement('ul');
    body.style.cssText = `
      display:none; margin:0; padding:10px 16px 14px 28px;
      color:#ccc; font:400 13px/1.6 system-ui; list-style:disc;
    `;
    for (const rule of rules) {
      const li = document.createElement('li');
      li.textContent = rule;
      li.style.marginBottom = '4px';
      body.appendChild(li);
    }
    block.appendChild(body);

    toggle.btn.addEventListener('click', () => {
      const open = body.style.display === 'none';
      body.style.display = open ? 'block' : 'none';
      toggle.arrow.textContent = open ? '▾' : '▸';
    });

    return block;
  }

// MODE DE JEU EPFL GUESSR INDISPONIBLE FUNCTION
function showUnavailableOverlay() {
  const unavailable = document.createElement('div');

  unavailable.style.cssText = `
    position:fixed;
    inset:0;
    z-index:20000;
    background:#808080;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
    text-align:center;
    padding:24px;
    font-family:system-ui, sans-serif;
  `;

  const title = document.createElement('h1');
  title.textContent = 'Mode de jeu temporairement indisponible';
  title.style.cssText = `
    color:white;
    font-size:32px;
    font-weight:800;
    margin:0 0 12px;
  `;

  const text = document.createElement('p');
  text.textContent = 'EPFL Guessr est actuellement désactivé pour développement, mais vous pouvez jouer au mode King of Campus';
  text.style.cssText = `
    color:#f0f0f0;
    font-size:16px;
    margin:0 0 28px;
    max-width:420px;
    line-height:1.5;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Retour';
  closeBtn.style.cssText = `
    background:white;
    color:#444;
    border:none;
    border-radius:10px;
    padding:12px 20px;
    font:700 14px system-ui;
    cursor:pointer;
  `;

  closeBtn.addEventListener('click', () => {
    unavailable.remove();
  });

  unavailable.appendChild(title);
  unavailable.appendChild(text);
  unavailable.appendChild(closeBtn);

  document.body.appendChild(unavailable);
}


  function remove() {
    hide();
  }

  return { show, hide, remove };
}
