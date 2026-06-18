/* ===== CONFIG ===== */
const API = '';  // Same origin - backend serves frontend

/* ===== STATE ===== */
let currentUser = null;
let authToken = localStorage.getItem('lotoToken');
let currentGameType = 'classic';
let selectedNumbers = [];
let gameConfigs = {};

const GAME_CONFIGS = {
  classic: { numbers: 6, range: 49, ticketCost: 50, prizes: { 6: 10000, 5: 2000, 4: 500, 3: 100, 2: 20 } },
  speed:   { numbers: 5, range: 36, ticketCost: 30, prizes: { 5: 5000,  4: 1000, 3: 200, 2: 40 } },
  mega:    { numbers: 7, range: 70, ticketCost: 100, prizes: { 7: 50000, 6: 10000, 5: 2000, 4: 500, 3: 150 } }
};

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
  createParticles();
  setupNavigation();
  if (authToken) {
    await fetchCurrentUser();
  } else {
    showAuthModal();
  }
});

/* ===== PARTICLES ===== */
function createParticles() {
  const container = document.getElementById('particles');
  const colors = ['#8B5CF6','#06B6D4','#F59E0B','#EC4899','#10B981'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 15) + 's';
    p.style.animationDelay = (Math.random() * 15) + 's';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    container.appendChild(p);
  }
}

/* ===== API HELPERS ===== */
async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  const res = await fetch('/api' + path, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Xəta baş verdi');
  return data;
}

/* ===== AUTH ===== */
function showAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function hideAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
}

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    document.getElementById('authError').textContent = '';
  });
});

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) {
    document.getElementById('authError').textContent = 'Bütün sahələri doldurun';
    return;
  }
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authToken = data.token;
    localStorage.setItem('lotoToken', authToken);
    currentUser = data.user;
    hideAuthModal();
    initApp();
    showToast('Xoş gəldiniz, ' + currentUser.username + '! 🎉', 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  }
}

async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!username || !email || !password) {
    document.getElementById('authError').textContent = 'Bütün sahələri doldurun';
    return;
  }
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    authToken = data.token;
    localStorage.setItem('lotoToken', authToken);
    currentUser = data.user;
    hideAuthModal();
    initApp();
    showToast('Qeydiyyat uğurlu! 1000 başlanğıc coin aldınız 🎊', 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
  }
}

async function fetchCurrentUser() {
  try {
    const data = await apiRequest('/auth/me');
    currentUser = data.user;
    hideAuthModal();
    initApp();
  } catch (err) {
    localStorage.removeItem('lotoToken');
    authToken = null;
    showAuthModal();
  }
}

function logout() {
  localStorage.removeItem('lotoToken');
  authToken = null;
  currentUser = null;
  document.getElementById('profileDropdown').classList.add('hidden');
  showAuthModal();
}

/* ===== APP INIT ===== */
function initApp() {
  updateUserUI();
  loadStats();
  loadRecentWins();
  buildNumberGrid();
  renderPrizeTable();
  setupAvatarGrid();
}

function updateUserUI() {
  if (!currentUser) return;
  document.getElementById('navCoins').textContent = currentUser.coins.toLocaleString();
  document.getElementById('navAvatar').textContent = currentUser.avatar;
  document.getElementById('profileUsername').textContent = currentUser.username;
  document.getElementById('profileVip').textContent = 'VIP ' + currentUser.vipLevel;
  document.getElementById('profileAvatarBig').textContent = currentUser.avatar;
  document.getElementById('profileName').textContent = currentUser.username;
  document.getElementById('profileVipBadge').textContent = 'VIP ' + currentUser.vipLevel;
  document.getElementById('pCoins').textContent = currentUser.coins.toLocaleString();
  document.getElementById('pGames').textContent = currentUser.totalGames;
  document.getElementById('pWins').textContent = currentUser.totalWins;
  document.getElementById('pBigWin').textContent = currentUser.biggestWin.toLocaleString();
  document.getElementById('gameBalance').textContent = currentUser.coins.toLocaleString();
}

/* ===== NAVIGATION ===== */
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showPage(btn.dataset.page);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const page = document.getElementById(pageName + 'Page');
  if (page) { page.classList.remove('hidden'); page.classList.add('active'); }

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageName);
  });

  // Load page-specific data
  if (pageName === 'leaderboard') loadLeaderboard();
  if (pageName === 'history') loadHistory();
  if (pageName === 'profile') updateUserUI();
}

function selectGameType(type) {
  currentGameType = type;
  showPage('game');
  setGameType(type);
}

function showProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  dropdown.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('profileDropdown');
  const avatar = document.getElementById('navAvatar');
  if (!dropdown.contains(e.target) && e.target !== avatar) {
    dropdown.classList.add('hidden');
  }
});

/* ===== STATS ===== */
async function loadStats() {
  try {
    const data = await apiRequest('/leaderboard/stats');
    animateNumber('statPlayers', data.totalPlayers);
    animateNumber('statGames', data.totalGames);
    animateNumber('statWins', data.totalWins);
    animateNumber('statBigWin', data.biggestWin);
  } catch (e) {}
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(target / 50);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 30);
}

async function loadRecentWins() {
  try {
    const data = await apiRequest('/leaderboard/recent-wins');
    const track = document.getElementById('tickerTrack');
    if (data.wins.length === 0) { track.innerHTML = '<span>Hələ böyük qazanc yoxdur... İlk ol!</span>'; return; }
    const items = data.wins.map(w =>
      `<span>🎉 <strong>${w.username}</strong> — +${w.winAmount.toLocaleString()} 🪙 (${w.gameType})</span>`
    );
    // Duplicate for seamless scroll
    track.innerHTML = [...items, ...items].join('');
  } catch (e) {}
}

/* ===== GAME ===== */
function buildNumberGrid() {
  const config = GAME_CONFIGS[currentGameType];
  const grid = document.getElementById('numberGrid');
  grid.innerHTML = '';
  selectedNumbers = [];
  updateSelectedCount();

  for (let i = 1; i <= config.range; i++) {
    const ball = document.createElement('div');
    ball.className = 'num-ball';
    ball.textContent = i;
    ball.dataset.num = i;
    ball.addEventListener('click', () => toggleNumber(i, ball));
    grid.appendChild(ball);
  }

  document.getElementById('requiredCount').textContent = config.numbers;
  document.getElementById('ticketCost').textContent = config.ticketCost;
}

function toggleNumber(num, el) {
  const config = GAME_CONFIGS[currentGameType];
  if (selectedNumbers.includes(num)) {
    selectedNumbers = selectedNumbers.filter(n => n !== num);
    el.classList.remove('selected');
  } else {
    if (selectedNumbers.length >= config.numbers) {
      showToast(`Maksimum ${config.numbers} rəqəm seçə bilərsiniz`, 'error');
      return;
    }
    selectedNumbers.push(num);
    el.classList.add('selected');
  }
  updateSelectedCount();
}

function updateSelectedCount() {
  const config = GAME_CONFIGS[currentGameType];
  document.getElementById('selectedCount').textContent = selectedNumbers.length;
  const playBtn = document.getElementById('playBtn');
  playBtn.disabled = selectedNumbers.length !== config.numbers;
}

function autoSelect() {
  const config = GAME_CONFIGS[currentGameType];
  clearSelection();
  const nums = [];
  while (nums.length < config.numbers) {
    const n = Math.floor(Math.random() * config.range) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  nums.forEach(n => {
    selectedNumbers.push(n);
    const ball = document.querySelector(`.num-ball[data-num="${n}"]`);
    if (ball) ball.classList.add('selected');
  });
  updateSelectedCount();
  showToast('Avtomatik seçildi! 🎲', 'info');
}

function clearSelection() {
  selectedNumbers = [];
  document.querySelectorAll('.num-ball.selected').forEach(b => b.classList.remove('selected'));
  updateSelectedCount();
  document.getElementById('resultArea').classList.add('hidden');
}

function setGameType(type) {
  currentGameType = type;
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  buildNumberGrid();
  renderPrizeTable();
  document.getElementById('ticketCost').textContent = GAME_CONFIGS[type].ticketCost;
}

async function playGame() {
  const config = GAME_CONFIGS[currentGameType];
  if (selectedNumbers.length !== config.numbers) {
    showToast(`${config.numbers} rəqəm seçin`, 'error');
    return;
  }
  if (currentUser.coins < config.ticketCost) {
    showToast('Kifayət qədər coin yoxdur! Mağazaya gedin 🪙', 'error');
    return;
  }

  const playBtn = document.getElementById('playBtn');
  playBtn.disabled = true;
  playBtn.innerHTML = '<span class="btn-glow"></span>⏳ Oynanır...';

  try {
    const data = await apiRequest('/game/play', {
      method: 'POST',
      body: JSON.stringify({ gameType: currentGameType, selectedNumbers })
    });

    currentUser = data.user;
    updateUserUI();

    // Show result with animation
    await showGameResult(data.game);

    if (data.game.isWin) {
      showWinModal(data.game);
    } else {
      showToast('Bu dəfə olmadı. Yenidən cəhd edin! 🍀', 'info');
    }

    clearSelection();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    playBtn.disabled = false;
    playBtn.innerHTML = '<span class="btn-glow"></span>🎰 Oyna!';
  }
}

async function showGameResult(game) {
  const resultArea = document.getElementById('resultArea');
  resultArea.classList.remove('hidden');

  const resultTitle = document.getElementById('resultTitle');
  resultTitle.textContent = game.isWin ? `🎉 ${game.matchCount} Uyğun — +${game.winAmount.toLocaleString()} Coin!` : `${game.matchCount} Uyğun — Şans gəlir!`;
  resultTitle.style.color = game.isWin ? 'var(--gold)' : 'var(--text-secondary)';

  // Your numbers
  const yourNums = document.getElementById('yourNums');
  yourNums.innerHTML = '';
  game.ticketNumbers.forEach((n, i) => {
    const ball = document.createElement('div');
    ball.className = 'result-num' + (game.matchedNumbers.includes(n) ? ' matched' : '');
    ball.style.animationDelay = (i * 0.05) + 's';
    ball.textContent = n;
    yourNums.appendChild(ball);
  });

  // Drawn numbers (animated reveal)
  const drawnNums = document.getElementById('drawnNums');
  drawnNums.innerHTML = '';
  for (let i = 0; i < game.drawnNumbers.length; i++) {
    await new Promise(r => setTimeout(r, 150));
    const ball = document.createElement('div');
    ball.className = 'result-num' + (game.matchedNumbers.includes(game.drawnNumbers[i]) ? ' matched' : '');
    ball.style.animationDelay = '0s';
    ball.textContent = game.drawnNumbers[i];
    drawnNums.appendChild(ball);
  }

  const prizeNames = { none: '❌ Ödül yoxdur', bronze: '🥉 Bürünc', silver: '🥈 Gümüş', gold: '🥇 Qızıl', platinum: '💎 Platin', jackpot: '👑 JACKPOT!' };
  document.getElementById('resultMatch').textContent =
    `Ödül: ${prizeNames[game.prizeType]} | ${game.matchCount} uyğun nömrə`;

  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showWinModal(game) {
  const icons = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', jackpot: '👑' };
  const modal = document.getElementById('winModal');
  document.getElementById('winIcon').textContent = icons[game.prizeType] || '🏆';
  document.getElementById('winTitle').textContent = game.prizeType === 'jackpot' ? '🎊 JACKPOT!' : 'QAZANDINIZ!';
  document.getElementById('winAmount').textContent = `+${game.winAmount.toLocaleString()} Coin`;
  document.getElementById('winDetails').textContent = `${game.matchCount} uyğun nömrə • ${game.gameType === 'classic' ? 'Klassik' : game.gameType === 'speed' ? 'Sürət' : 'Mega'} Loto`;
  modal.classList.remove('hidden');

  // Confetti
  createConfetti();
}

function closeWinModal() {
  document.getElementById('winModal').classList.add('hidden');
}

function createConfetti() {
  const container = document.getElementById('confetti');
  container.innerHTML = '';
  const colors = ['#8B5CF6','#F59E0B','#EC4899','#06B6D4','#10B981'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.style.cssText = `
      position:absolute; width:8px; height:8px; border-radius:2px;
      background:${colors[i%colors.length]};
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      animation: floatParticle ${2+Math.random()*3}s ease-out forwards;
      animation-delay:${Math.random()*0.5}s;
      transform: rotate(${Math.random()*360}deg);
    `;
    container.appendChild(c);
  }
}

function renderPrizeTable() {
  const config = GAME_CONFIGS[currentGameType];
  const rows = document.getElementById('prizeRows');
  rows.innerHTML = '';
  const prizes = Object.entries(config.prizes).reverse();
  prizes.forEach(([match, amount]) => {
    const row = document.createElement('div');
    const isJackpot = parseInt(match) === config.numbers;
    row.className = 'prize-row' + (isJackpot ? ' jackpot' : '');
    row.innerHTML = `
      <span class="prize-label">${isJackpot ? '👑' : '🎯'} ${match}/${config.numbers} uyğun</span>
      <span class="prize-amount">${amount.toLocaleString()} 🪙</span>
    `;
    rows.appendChild(row);
  });
}

/* ===== LEADERBOARD ===== */
async function loadLeaderboard() {
  try {
    const [topData, winsData] = await Promise.all([
      apiRequest('/leaderboard/top'),
      apiRequest('/leaderboard/recent-wins')
    ]);

    const topList = document.getElementById('topList');
    topList.innerHTML = '';
    topData.players.forEach((player, i) => {
      const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
      const item = document.createElement('div');
      item.className = 'lb-item';
      item.style.animationDelay = (i * 0.05) + 's';
      item.innerHTML = `
        <div class="lb-rank ${rankClass}">${rankEmoji}</div>
        <div class="lb-avatar">${player.avatar}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(player.username)} <span class="vip-badge">VIP ${player.vipLevel}</span></div>
          <div class="lb-sub">${player.totalGames} oyun • ${player.totalWins} qazanc</div>
        </div>
        <div class="lb-coins">${player.coins.toLocaleString()} 🪙</div>
      `;
      topList.appendChild(item);
    });

    const winsList = document.getElementById('winsList');
    winsList.innerHTML = '';
    const prizeColors = { jackpot: '#F59E0B', platinum: '#A78BFA', gold: '#FCD34D', silver: '#C0C0C0', bronze: '#CD7F32' };
    winsData.wins.forEach((win, i) => {
      const item = document.createElement('div');
      item.className = 'lb-item';
      item.style.animationDelay = (i * 0.05) + 's';
      const timeAgo = getTimeAgo(win.playedAt);
      item.innerHTML = `
        <div class="lb-rank" style="color:${prizeColors[win.prizeType]||'#fff'}">
          ${win.prizeType === 'jackpot' ? '👑' : win.prizeType === 'platinum' ? '💎' : win.prizeType === 'gold' ? '🥇' : win.prizeType === 'silver' ? '🥈' : '🥉'}
        </div>
        <div class="lb-avatar">🎊</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(win.username)}</div>
          <div class="lb-sub">${win.gameType === 'classic' ? 'Klassik' : win.gameType === 'speed' ? 'Sürət' : 'Mega'} • ${timeAgo}</div>
        </div>
        <div class="lb-coins" style="color:${prizeColors[win.prizeType]||'var(--gold)'}">+${win.winAmount.toLocaleString()} 🪙</div>
      `;
      winsList.appendChild(item);
    });
  } catch (e) { showToast('Liderboard yüklənmədi', 'error'); }
}

function showLbTab(tab) {
  document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.lb-content').forEach(c => { c.classList.remove('active'); c.classList.add('hidden'); });
  event.target.classList.add('active');
  const content = document.getElementById('lb' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (content) { content.classList.remove('hidden'); content.classList.add('active'); }
}

/* ===== HISTORY ===== */
async function loadHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await apiRequest('/game/history');
    list.innerHTML = '';
    if (data.games.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">Hələ oyun oynamısınız</p>';
      return;
    }
    data.games.forEach((game, i) => {
      const item = document.createElement('div');
      item.className = 'history-item ' + (game.isWin ? 'win' : 'loss');
      item.style.animationDelay = (i * 0.04) + 's';
      const prizeIcons = { jackpot: '👑', platinum: '💎', gold: '🥇', silver: '🥈', bronze: '🥉', none: '❌' };
      item.innerHTML = `
        <div class="history-result">${prizeIcons[game.prizeType]}</div>
        <div class="history-info">
          <h4>${game.gameType === 'classic' ? 'Klassik' : game.gameType === 'speed' ? 'Sürət' : 'Mega'} Loto — ${game.matchCount} uyğun</h4>
          <p>${game.ticketNumbers.join(', ')} → ${getTimeAgo(game.playedAt)}</p>
        </div>
        <div class="history-win ${game.isWin ? '' : 'loss'}">${game.isWin ? '+' + game.winAmount.toLocaleString() : '-' + game.betAmount} 🪙</div>
      `;
      list.appendChild(item);
    });
  } catch (e) { list.innerHTML = '<p style="color:var(--red)">Tarix yüklənmədi</p>'; }
}

/* ===== SHOP ===== */
async function buyCoins(pkg) {
  try {
    const data = await apiRequest('/game/buy-coins', {
      method: 'POST',
      body: JSON.stringify({ package: pkg })
    });
    currentUser.coins = data.coins;
    updateUserUI();
    const amounts = { starter: 1000, popular: 5000, premium: 15000, vip: 50000 };
    showToast(`+${amounts[pkg].toLocaleString()} coin hesabınıza əlavə edildi! 🪙`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function claimDailyBonus() {
  try {
    const data = await apiRequest('/auth/daily-bonus', { method: 'POST' });
    currentUser.coins = data.coins;
    updateUserUI();
    showToast('🎁 500 gündəlik bonus alındı!', 'success');
    document.getElementById('bonusBtn').disabled = true;
    document.getElementById('bonusBtn').innerHTML = '<span class="btn-glow"></span>✅ Alındı';
  } catch (e) { showToast(e.message, 'error'); }
}

/* ===== PROFILE / AVATARS ===== */
function setupAvatarGrid() {
  const avatars = ['🎯', '🌟', '💎', '🔥', '🚀', '👑', '🎪', '🎨', '🏆', '⚡'];
  const grid = document.getElementById('avatarGrid');
  grid.innerHTML = '';
  avatars.forEach(av => {
    const btn = document.createElement('div');
    btn.className = 'avatar-option' + (currentUser?.avatar === av ? ' active' : '');
    btn.textContent = av;
    btn.addEventListener('click', () => selectAvatar(av));
    grid.appendChild(btn);
  });
}

async function selectAvatar(avatar) {
  try {
    const data = await apiRequest('/auth/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatar })
    });
    currentUser = data.user;
    updateUserUI();
    setupAvatarGrid();
    showToast('Avatar yeniləndi! ' + avatar, 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

/* ===== TOAST ===== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ===== UTILS ===== */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function getTimeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'indi';
  if (m < 60) return m + ' dəq əvvəl';
  if (h < 24) return h + ' saat əvvəl';
  return d + ' gün əvvəl';
}

// Enter key support for auth
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm.classList.contains('active')) login();
    else if (registerForm.classList.contains('active')) register();
  }
});
