(() => {
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlay-content');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnResume = document.getElementById('btn-resume');
  const dpad = document.getElementById('touch-dpad');

  const CELL = 24;          // grid size
  const COLS = canvas.width / CELL;
  const ROWS = canvas.height / CELL;

  const SPEED_START_MS = 140;
  const SPEED_MIN_MS = 70;
  const SPEED_STEP_MS = 4;

  const KEY_TO_DIR = {
    ArrowUp: { x: 0, y: -1, name: 'up' },
    ArrowDown: { x: 0, y: 1, name: 'down' },
    ArrowLeft: { x: -1, y: 0, name: 'left' },
    ArrowRight: { x: 1, y: 0, name: 'right' },
    w: { x: 0, y: -1, name: 'up' },
    s: { x: 0, y: 1, name: 'down' },
    a: { x: -1, y: 0, name: 'left' },
    d: { x: 1, y: 0, name: 'right' },
  };

  const STORAGE_KEY = 'snake_best_score_v1';

  let snake;
  let dir;
  let pendingDir;
  let food;
  let score;
  let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let tickMs;
  let timerId = null;
  let isPaused = true;
  let justAte = false;

  bestEl.textContent = String(best);

  function resetGame() {
    snake = [
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) },
      { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) },
    ];
    dir = { x: 1, y: 0, name: 'right' };
    pendingDir = dir;
    score = 0;
    tickMs = SPEED_START_MS;
    justAte = false;
    placeFood();
    updateScore(0);
    draw();
  }

  function updateScore(delta) {
    score += delta;
    scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      localStorage.setItem(STORAGE_KEY, String(best));
    }
  }

  function placeFood() {
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    let x, y, tries = 0;
    do {
      x = Math.floor(Math.random() * COLS);
      y = Math.floor(Math.random() * ROWS);
      tries++;
      if (tries > 1000) break;
    } while (occupied.has(`${x},${y}`));
    food = { x, y };
  }

  function start() {
    if (!isPaused) return;
    isPaused = false;
    overlay.classList.add('hidden');
    scheduleNextTick();
  }

  function pause() {
    if (isPaused) return;
    isPaused = true;
    clearTimeout(timerId);
    timerId = null;
    overlayContent.innerHTML = `<h2>暫停</h2><p>按 P 或點「繼續」繼續遊戲</p>`;
    btnStart.style.display = 'none';
    btnRestart.style.display = 'inline-block';
    btnResume.style.display = 'inline-block';
    overlay.classList.remove('hidden');
  }

  function gameOver() {
    isPaused = true;
    clearTimeout(timerId);
    timerId = null;
    overlayContent.innerHTML = `<h2>遊戲結束</h2><p>你的分數：<strong>${score}</strong></p>`;
    btnStart.style.display = 'none';
    btnRestart.style.display = 'inline-block';
    btnResume.style.display = 'none';
    overlay.classList.remove('hidden');
  }

  function scheduleNextTick() {
    clearTimeout(timerId);
    timerId = setTimeout(tick, tickMs);
  }

  function canChangeTo(next, current) {
    return !(next.x === -current.x && next.y === -current.y);
  }

  function setDirectionByName(name) {
    const mapping = {
      up: { x: 0, y: -1, name: 'up' },
      down: { x: 0, y: 1, name: 'down' },
      left: { x: -1, y: 0, name: 'left' },
      right: { x: 1, y: 0, name: 'right' },
    };
    const next = mapping[name];
    if (next && canChangeTo(next, dir)) {
      pendingDir = next;
    }
  }

  function tick() {
    dir = pendingDir;

    const head = snake[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // wrap-around world
    if (newHead.x < 0) newHead.x = COLS - 1;
    if (newHead.x >= COLS) newHead.x = 0;
    if (newHead.y < 0) newHead.y = ROWS - 1;
    if (newHead.y >= ROWS) newHead.y = 0;

    // self-collision
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        gameOver();
        draw();
        return;
      }
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
      justAte = true;
      updateScore(1);
      placeFood();
      tickMs = Math.max(SPEED_MIN_MS, tickMs - SPEED_STEP_MS);
    } else {
      justAte = false;
      snake.pop();
    }

    draw();
    if (!isPaused) scheduleNextTick();
  }

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // snake body
    for (let i = snake.length - 1; i >= 1; i--) {
      const s = snake[i];
      drawCell(s.x, s.y, 'var(--snake)');
    }
    // head
    const head = snake[0];
    drawCell(head.x, head.y, 'var(--snake-head)');

    // food
    drawCell(food.x, food.y, 'var(--food)');
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'p' || key === 'P') {
      isPaused ? start() : pause();
      return;
    }
    if (key === 'r' || key === 'R') {
      resetGame();
      overlay.classList.add('hidden');
      isPaused = false;
      scheduleNextTick();
      return;
    }
    const mapped = KEY_TO_DIR[key];
    if (mapped) {
      e.preventDefault();
      setDirectionByName(mapped.name);
      if (isPaused) start();
    }
  });

  // Buttons
  btnStart.addEventListener('click', () => {
    start();
  });
  btnRestart.addEventListener('click', () => {
    resetGame();
    isPaused = false;
    overlay.classList.add('hidden');
    scheduleNextTick();
  });
  btnResume.addEventListener('click', () => {
    start();
  });

  // Touch dpad
  dpad.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-dir]');
    if (!btn) return;
    const name = btn.getAttribute('data-dir');
    setDirectionByName(name);
    if (isPaused) start();
  });

  // Swipe on canvas (basic)
  let startX = 0, startY = 0;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirectionByName(dx > 0 ? 'right' : 'left');
    } else {
      setDirectionByName(dy > 0 ? 'down' : 'up');
    }
    if (isPaused) start();
  }, { passive: true });

  // Initial state
  resetGame();
  overlayContent.innerHTML = `<h2>開始遊戲</h2><p>方向鍵移動，P 暫停/繼續，R 重來</p>`;
  btnStart.style.display = 'inline-block';
  btnRestart.style.display = 'none';
  btnResume.style.display = 'none';
  overlay.classList.remove('hidden');
})();


