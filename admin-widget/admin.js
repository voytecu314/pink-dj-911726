(function () {
  const config = window.__ADMIN_WIDGET_CONFIG__ || {};
  const API_BASE = config.apiBase;
  const LOGIN_USER = config.loginUser;
  const TEXT_USER = config.textUser;
  const LANGUAGE = document.documentElement.lang || 'en';

  if (!API_BASE || !LOGIN_USER || !TEXT_USER) {
    console.warn('[admin-widget] window.__ADMIN_WIDGET_CONFIG__ missing required fields — widget disabled.');
    return;
  }

  const adminLogin = document.getElementById('admin-form');
  const key = document.getElementById('key');
  if (!adminLogin || !key) {
    console.warn('[admin-widget] Expected markup not found — widget disabled.');
    return;
  }

  let mode = 'login';

  function toggleKey(el) {
    adminLogin.classList.toggle('disappear');
    key.classList.toggle('disappear');
    mode = 'login';
    resetFormUI();
    if (el.id === 'key') adminLogin['password'].focus();
  }

  function resetFormUI() {
    adminLogin['new_password'].classList.add('disappear');
    adminLogin['repeat_new_password'].classList.add('disappear');
    document.getElementById('chngPsw').classList.remove('disappear');
    document.getElementById('chngPsw').textContent = 'Zmień hasło';
  }

  function managePassword(el) {
    const newPass = adminLogin['new_password'];
    const repeatPass = adminLogin['repeat_new_password'];
    repeatPass.value = '';

    const isHidden = newPass.classList.contains('disappear');

    if (el.id === 'chngPsw') mode = isHidden ? 'change' : 'login';
    if (el.id === 'addPsw') mode = isHidden ? 'add' : 'login';

    newPass.classList.toggle('disappear');
    repeatPass.classList.toggle('disappear');
    document.getElementById('chngPsw').classList.toggle('disappear', mode === 'add');

    el.textContent = isHidden
      ? 'Wróć do logowania'
      : el.id === 'chngPsw' ? 'Zmień hasło' : 'Dodaj hasło';

    adminLogin['password'].focus();
  }

  function login(e) {
    e.preventDefault();
    const data = {
      action: null,
      user: LOGIN_USER,
      password: adminLogin['password'].value,
      new_password: adminLogin['new_password'].value,
    };

    if (mode !== 'login' && adminLogin['repeat_new_password'].value !== data.new_password) {
      console.log('Password confirmation failed');
      return;
    }
    if (mode !== 'login' && data.new_password.length < 8) {
      console.log('New password is too short');
      return;
    }

    if (mode === 'login') {
      data.action = 'login';
      fetch(`${API_BASE}/admin-login/${data.user}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then(({ jwtToken, auth, message }) => {
          if (jwtToken && auth) {
            localStorage.setItem('jwtToken', jwtToken);
            makeBodyTextEditable();
            document.getElementById('admin-login-wrapper').classList.toggle('disappear');
            document.getElementById('admin-edit-wrapper').classList.toggle('disappear');

            const payload = JSON.parse(atob(jwtToken.split('.')[1]));
            const tokenSeconds = payload.exp - payload.iat;
            const secondsLeft = document.getElementById('token-time-seconds');
            secondsLeft.textContent = tokenSeconds;

            setInterval(() => {
              secondsLeft.textContent = parseInt(secondsLeft.textContent, 10) - 1;
              if (secondsLeft.textContent === '0') window.location.reload();
            }, 1000);
          } else {
            const info = document.getElementById('login-msg');
            info.textContent = message;
            info.style.color = 'red';
          }
        })
        .catch(console.log);
    }

    if (mode === 'change') {
      data.action = 'change';
      fetch(`${API_BASE}/admin-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then(console.log)
        .catch(console.log);
    }
  }

  function makeBodyTextEditable() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });

    function isTextNode(node) {
      return node.nodeType === 3 && node.textContent.trim().length > 1;
    }

    function wrapTextContent(element) {
      for (const node of Array.from(element.childNodes)) {
        if (isTextNode(node)) {
          const span = document.createElement('span');
          node.after(span);
          span.appendChild(node);
          span.contentEditable = 'true';
          span.classList.add('admin-edit');
          span.dataset.textEdited = 'false';
          span.addEventListener('input', () => {
            if (span.dataset.textEdited === 'false') span.dataset.textEdited = 'true';
          });
        }
        if (node.nodeType === 1 && !node.classList.contains('no-edit')) {
          wrapTextContent(node);
        }
      }
    }

    wrapTextContent(document.body);
  }

  function getTextNodesAddressesAfterSave(element, index = '', tagRoute = 'BODY', acc = []) {
    const nodes = element.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.childNodes.length && !node.classList.contains('no-edit')) {
        getTextNodesAddressesAfterSave(node, index + i + '.', tagRoute + '>' + node.tagName, acc);
      } else if (
        node.parentElement &&
        node.parentElement.dataset.textEdited === 'true' &&
        node.nodeType === 3 &&
        node.textContent.trim().length > 1
      ) {
        acc.push({
          numberOfOrder: acc.length,
          nodeAddress: (index + i).slice(0, -2),
          textContent: { [LANGUAGE]: node.textContent },
          tagRoute: tagRoute.slice(0, -5),
        });
      }
    }
    return acc;
  }

  key.addEventListener('click', () => toggleKey(key));
  document.getElementById('chngPsw').addEventListener('click', function () { managePassword(this); });
  const addPswBtn = document.getElementById('addPsw');
  if (addPswBtn) addPswBtn.addEventListener('click', function () { managePassword(this); });

  adminLogin.addEventListener('submit', login);

  document.getElementById('admin-save-text').addEventListener('click', () => {
    const jwtToken = localStorage.getItem('jwtToken');
    const textNodesArray = getTextNodesAddressesAfterSave(document.body);

    fetch(`${API_BASE}/send-text-nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwtToken, user: TEXT_USER, language: LANGUAGE, textNodesArray }),
    })
      .then((res) => res.json())
      .then((res) => {
        const title = document.getElementById('panel-title');
        title.textContent = res.message;
        setTimeout(() => (title.textContent = ''), 5000);
      })
      .catch(console.log);
  });

  document.getElementById('admin-reset-text').addEventListener('click', () => {
    if (typeof config.onResetText === 'function') config.onResetText();
    else window.location.reload();
  });

  document.getElementById('admin-exit').addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    location.reload();
  });
})();