const STORAGE_KEY = 'sv_vault_files';
const SESSION_KEY = 'vaultLoggedIn';
const SESSION_USER_KEY = 'vaultUser';
const SESSION_CIPHER_KEY = 'vaultCipherKey';
const AUTH_CODE_KEY = 'vault_auth_code';
const AUTH_STATUS_KEY = 'vault_auth_status';
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin';

// BroadcastChannel for cross-tab authentication
const authChannel = new BroadcastChannel('vault_auth_channel');

// DOM Elements
let loginSection, authSection, dashboardSection, uploadModal;
let usernameInput, passwordInput, loginBtn, logoutBtn;
let fileInput, filesTable, filesTbody, emptyState, clearBtn;
let loginErrorEl, toastEl, userLabel, modalMessage;
let authCodeInput, authInitiateBtn, authApproveBtn, authCancelBtn, displayCode;

function initDOM() {
  loginSection = document.getElementById('login-section');
  authSection = document.getElementById('auth-section');
  dashboardSection = document.getElementById('dashboard-section');
  uploadModal = document.getElementById('uploadModal');
  
  usernameInput = document.getElementById('username');
  passwordInput = document.getElementById('loginPassword');
  loginBtn = document.getElementById('loginBtn');
  logoutBtn = document.getElementById('logoutBtn');
  
  fileInput = document.getElementById('file-input');
  filesTable = document.getElementById('files-table');
  filesTbody = document.getElementById('files-tbody');
  emptyState = document.getElementById('empty-state');
  clearBtn = document.getElementById('clearBtn');
  
  loginErrorEl = document.getElementById('login-error');
  toastEl = document.getElementById('toast');
  userLabel = document.getElementById('user-label');
  modalMessage = document.getElementById('modalMessage');
  
  authCodeInput = document.getElementById('auth-code-input');
  authInitiateBtn = document.getElementById('auth-initiate-btn');
  authApproveBtn = document.getElementById('auth-approve-btn');
  authCancelBtn = document.getElementById('auth-cancel-btn');
  displayCode = document.getElementById('display-code');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDOM);
} else {
  initDOM();
}

// Event Listeners
loginBtn?.addEventListener('click', initiateLogin);
authInitiateBtn?.addEventListener('click', handleAuthCode);
authApproveBtn?.addEventListener('click', approveAuth);
authCancelBtn?.addEventListener('click', cancelAuth);
logoutBtn?.addEventListener('click', handleLogout);
fileInput?.addEventListener('change', (e) => handleFiles(e.target.files));
clearBtn?.addEventListener('click', clearVault);

// Check if user is already logged in
window.addEventListener('load', () => {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    const user = sessionStorage.getItem(SESSION_USER_KEY);
    if (user && userLabel) {
      userLabel.textContent = user.toUpperCase();
      showDashboard();
      loadFileList();
    }
  }
});

authChannel.onmessage = (e) => {
  if (e.data.status === 'APPROVED') {
    unlockVault();
  }
};

function initiateLogin() {
  const username = usernameInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!username || !password) {
    showLoginError('MISSING_CREDENTIALS');
    return;
  }

  if (username === TEST_USERNAME && password === TEST_PASSWORD) {
    // Generate auth code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem(AUTH_CODE_KEY, code);
    localStorage.setItem(AUTH_STATUS_KEY, 'PENDING');
    
    // Store temp credentials
    sessionStorage.setItem('temp_user', username);
    sessionStorage.setItem('temp_pass', password);
    
    if (displayCode) displayCode.textContent = code;
    showAuthSection();
    startPolling();
  } else {
    showLoginError('INVALID_CREDENTIALS');
  }
}

function handleAuthCode() {
  const inputCode = authCodeInput?.value.toUpperCase();
  const storedCode = localStorage.getItem(AUTH_CODE_KEY);
  
  if (!inputCode || inputCode.length !== 8) {
    toast('INVALID_CODE_LENGTH', 'error');
    return;
  }
  
  if (inputCode === storedCode) {
    approveAuth();
  } else {
    toast('CODE_MISMATCH', 'error');
  }
}

function approveAuth() {
  localStorage.setItem(AUTH_STATUS_KEY, 'APPROVED');
  authChannel.postMessage({ status: 'APPROVED' });
  unlockVault();
}

function unlockVault() {
  const username = sessionStorage.getItem('temp_user');
  const password = sessionStorage.getItem('temp_pass');
  
  if (username && password) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    sessionStorage.setItem(SESSION_USER_KEY, username);
    sessionStorage.setItem(SESSION_CIPHER_KEY, CryptoJS.SHA256(password).toString());
    
    sessionStorage.removeItem('temp_user');
    sessionStorage.removeItem('temp_pass');
    
    if (loginErrorEl) loginErrorEl.style.display = 'none';
    if (userLabel) userLabel.textContent = username.toUpperCase();
    
    showDashboard();
    loadFileList();
    toast('ACCESS_GRANTED', 'success');
  }
}

function showLoginError(message) {
  if (loginErrorEl) {
    loginErrorEl.style.display = 'block';
    const errorText = document.getElementById('login-error-text');
    if (errorText) errorText.textContent = message;
  }
}

function showAuthSection() {
  if (loginSection) loginSection.style.display = 'none';
  if (authSection) {
    authSection.style.display = 'flex';
  }
  if (dashboardSection) dashboardSection.style.display = 'none';
  if (authCodeInput) authCodeInput.value = '';
}

function cancelAuth() {
  localStorage.removeItem(AUTH_CODE_KEY);
  localStorage.removeItem(AUTH_STATUS_KEY);
  sessionStorage.removeItem('temp_user');
  sessionStorage.removeItem('temp_pass');
  
  if (loginSection) loginSection.style.display = 'flex';
  if (authSection) authSection.style.display = 'none';
  toast('AUTH_CANCELLED', 'info');
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_CIPHER_KEY);
  
  if (loginSection) loginSection.style.display = 'flex';
  if (authSection) authSection.style.display = 'none';
  if (dashboardSection) dashboardSection.style.display = 'none';
  if (loginErrorEl) loginErrorEl.style.display = 'none';
  if (usernameInput) usernameInput.value = 'admin';
  if (passwordInput) passwordInput.value = 'admin';
  toast('SESSION_TERMINATED', 'info');
}

function showDashboard() {
  if (loginSection) loginSection.style.display = 'none';
  if (authSection) authSection.style.display = 'none';
  if (dashboardSection) dashboardSection.style.display = 'block';
}

function toast(msg, type = 'info') {
  if (toastEl) {
    toastEl.textContent = msg;
    toastEl.className = 'show ' + type;
    setTimeout(() => toastEl?.classList.remove('show'), 3000);
  }
}

let pollInterval = null;
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    if (localStorage.getItem(AUTH_STATUS_KEY) === 'APPROVED') {
      clearInterval(pollInterval);
      unlockVault();
    }
  }, 500);
}

async function handleFiles(files) {
  const cipherKey = sessionStorage.getItem(SESSION_CIPHER_KEY);
  const currentUser = sessionStorage.getItem(SESSION_USER_KEY);

  if (!cipherKey || !currentUser) {
    toast('SESSION_EXPIRED', 'error');
    return;
  }

  for (let file of files) {
    try {
      const fileBuffer = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const encrypted = CryptoJS.AES.encrypt(base64, cipherKey).toString();
      
      const fileId = 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sv_file_' + fileId, encrypted);

      const index = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      index.push({ 
        id: fileId, 
        name: file.name, 
        size: file.size, 
        owner: currentUser,
        uploadedAt: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('Encryption failed:', error);
      toast('ENCRYPTION_FAILED', 'error');
    }
  }

  fileInput.value = '';
  loadFileList();
  if (uploadModal) uploadModal.classList.remove('show');
  toast('FILES_ENCRYPTED_STORED', 'success');
}

function loadFileList() {
  const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
  const index = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const userFiles = index.filter(f => f.owner === currentUser);

  if (!filesTbody || !emptyState || !filesTable) return;

  if (userFiles.length === 0) {
    emptyState.style.display = 'block';
    filesTable.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  filesTable.style.display = 'table';
  filesTbody.innerHTML = '';

  userFiles.forEach(f => {
    const tr = document.createElement('tr');
    const sizeKB = (f.size / 1024).toFixed(1);
    tr.innerHTML = `
      <td>${f.name}</td>
      <td>${sizeKB} KB</td>
      <td style="text-align:right;">
        <button class="btn-ghost" onclick="decryptFile('${f.id}', '${f.name}')">DECRYPT</button>
        <button class="btn-ghost danger" onclick="deleteFile('${f.id}')">DELETE</button>
      </td>
    `;
    filesTbody.appendChild(tr);
  });
}

function decryptFile(fileId, fileName) {
  const cipherKey = sessionStorage.getItem(SESSION_CIPHER_KEY);
  
  try {
    const encrypted = localStorage.getItem('sv_file_' + fileId);
    const decrypted = CryptoJS.AES.decrypt(encrypted, cipherKey);
    const base64 = decrypted.toString(CryptoJS.enc.Utf8);
    
    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArray]);
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast('FILE_DECRYPTED_DOWNLOADED', 'success');
  } catch (error) {
    console.error('Decryption failed:', error);
    toast('DECRYPTION_FAILED', 'error');
  }
}

function deleteFile(fileId) {
  const index = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const fileData = index.find(f => f.id === fileId);
  
  if (fileData) {
    localStorage.removeItem('sv_file_' + fileId);
    const updated = index.filter(f => f.id !== fileId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    loadFileList();
    toast('FILE_DELETED', 'info');
  }
}

function clearVault() {
  const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
  const index = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const userFiles = index.filter(f => f.owner === currentUser);
  
  if (userFiles.length === 0) {
    toast('VAULT_ALREADY_EMPTY', 'info');
    return;
  }

  if (confirm('CLEAR_ENTIRE_VAULT? THIS_ACTION_CANNOT_BE_UNDONE')) {
    userFiles.forEach(f => {
      localStorage.removeItem('sv_file_' + f.id);
    });
    const updated = index.filter(f => f.owner !== currentUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    loadFileList();
    toast('VAULT_CLEARED', 'success');
  }
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
