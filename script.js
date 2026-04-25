const loginContainer = document.getElementById('loginContainer');
const vaultApp = document.getElementById('vaultApp');
const authUserEl = document.getElementById('username');
const authPassEl = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const authMessageEl = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const fileInput = document.getElementById('fileInput');
const encryptBtn = document.getElementById('encryptBtn');
const clearBtn = document.getElementById('clearBtn');
const messageEl = document.getElementById('message');
const modalMessageEl = document.getElementById('modalMessage');
const vaultList = document.getElementById('vaultList');

const STORAGE_KEY = 'fileVault';
const SESSION_KEY = 'vaultLoggedIn';
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin';

loginBtn.addEventListener('click', (event) => {
  event.preventDefault();

  const username = authUserEl.value.trim();
  const password = authPassEl.value.trim();

  if (username === TEST_USERNAME && password === TEST_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setAuthMessage('Login successful.', 'success');
    showVault();
    renderVault();
  } else {
    setAuthMessage('Invalid login. Use admin / admin.', 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  hideVault();
  setAuthMessage('Logged out. Use admin / admin to log back in.', 'info');
});

uploadBtn.addEventListener('click', () => {
  uploadModal.classList.remove('hidden');
  modalMessageEl.textContent = '';
});

modalCloseBtn.addEventListener('click', closeUploadModal);
modalCancelBtn.addEventListener('click', closeUploadModal);
uploadModal.addEventListener('click', (event) => {
  if (event.target === uploadModal) {
    closeUploadModal();
  }
});

function closeUploadModal() {
  uploadModal.classList.add('hidden');
  fileInput.value = '';
  modalMessageEl.textContent = '';
}

encryptBtn.addEventListener('click', async () => {
  setMessage('', '');

  const file = fileInput.files[0];
  if (!file) {
    return setMessage('Choose a file to upload.', 'error');
  }

  encryptBtn.disabled = true;
  encryptBtn.textContent = 'Uploading…';

  try {
    const fileBuffer = await file.arrayBuffer();
    const record = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
      data: toBase64(new Uint8Array(fileBuffer)),
    };

    saveRecord(record);
    fileInput.value = '';
    setMessage(`Uploaded "${file.name}" to the vault.`, 'success');
    renderVault();
  } catch (error) {
    console.error(error);
    setMessage('Upload failed. Please try again.', 'error');
  } finally {
    encryptBtn.disabled = false;
    encryptBtn.textContent = 'Upload & Save';
  }
});

clearBtn.addEventListener('click', () => {
  if (confirm('Remove all files from the vault?')) {
    localStorage.removeItem(STORAGE_KEY);
    renderVault();
    setMessage('Vault cleared.', 'success');
  }
});

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type === 'success'
    ? 'text-emerald-400'
    : type === 'error'
      ? 'text-rose-400'
      : 'text-slate-200';
}

function saveRecord(record) {
  const vault = loadVault();
  vault.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

function loadVault() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function showVault() {
  loginContainer.classList.add('hidden');
  vaultApp.classList.remove('hidden');
  setAuthMessage('', '');
}

function hideVault() {
  vaultApp.classList.add('hidden');
  loginContainer.classList.remove('hidden');
}

function setAuthMessage(text, type) {
  authMessageEl.textContent = text;
  authMessageEl.className = type === 'success'
    ? 'text-emerald-400'
    : type === 'error'
      ? 'text-rose-400'
      : 'text-slate-200';
}

function renderVault() {
  const vault = loadVault();
  vaultList.innerHTML = '';

  if (!vault.length) {
    vaultList.innerHTML = '<p class="text-slate-400">Vault is empty. Upload a file to begin.</p>';
    return;
  }

  vault.forEach(record => {
    const card = document.createElement('div');
    card.className = 'rounded-3xl border border-slate-800 bg-slate-900/90 p-4';
    card.innerHTML = `
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-lg font-semibold text-slate-100">${escapeHtml(record.name)}</p>
          <p class="text-sm text-slate-500">${new Date(record.createdAt).toLocaleString()} · ${Math.round(record.size / 1024)} KB</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button data-action="download" data-id="${record.id}" class="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">Download</button>
          <button data-action="delete" data-id="${record.id}" class="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="download"]').addEventListener('click', () => downloadItem(record.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteItem(record.id));

    vaultList.appendChild(card);
  });
}

function downloadItem(id) {
  const record = loadVault().find(item => item.id === id);
  if (!record) {
    return setMessage('Vault item not found.', 'error');
  }

  try {
    const fileBuffer = fromBase64(record.data);
    const blob = new Blob([fileBuffer], { type: record.type });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = record.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage(`Downloaded "${record.name}" successfully.`, 'success');
  } catch (error) {
    console.error(error);
    setMessage('Download failed. Please try again.', 'error');
  }
}

function deleteItem(id) {
  if (!confirm('Delete this file from the vault?')) {
    return;
  }

  const vault = loadVault().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
  renderVault();
  setMessage('File deleted from the vault.', 'success');
}

function escapeHtml(text) {
  return text.replace(/[&<>"]+/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
}

function initialize() {
  if (isAuthenticated()) {
    showVault();
    renderVault();
  } else {
    hideVault();
  }
}

initialize();
