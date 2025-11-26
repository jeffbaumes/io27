function transpose(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) return [];

  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][r] = matrix[r][c];
    }
  }

  return result;
}

const emojiMap = {
  [-3]: '⛄',
  [-2]: '🧊',
  [-1]: '❄️',
  0: '',
  1: '🧦',
  2: '🧤',
  3: '🧣',
  Infinity: '',
};

const template = `
 S 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 0
 0 0 0 0 0 0 0 0 0 E
`;

const levels = [
  {
    message: 'Help Santa get to the Christmas tree. Don\'t get too hot or too cold!',
    board: `
 S 0 0 0 0 0
 0 0-1-1-1 0
 0 0-1 E-1 0
 1 0-1-1-1 0
 0 0 0 0 0 0
`,
    range: 4,
    startHealth: 1,
  },
  {
    message: 'It\'s cold out there',
    board: `
 S-1-1-1-1 1 1-1-1-1
-1-1-1-1-1 1 1-1-1-1
-1-1-1-1-1-1-1-1-1-1
-1-1 1-1-1-1-1-1-1 1
-1-1 1-1 1 1-1 1-1-1
-1-1-1-1-1-1-1-1-1-1
-1 1-1-1-1-1-1-1-1-1
-1-1 1-1-1-1-1-1-1-1
-1-1-1 1-1-1-1-1-1-1
-1-1-1-1-1-1 1-1-1 E
`,
    range: 10,
    startHealth: 5,
  },
  {
    message: 'Ice cubes 🧊 are colder!',
    board: `
 S 0 0 0 0 0
 0 0 0 0 X-2
 0 0 0 0 X-2
 0 0 0 0 X-2
 1 1 1 0 X-2
 1 1 1 1 X E
`,
    range: 4,
    startHealth: 2,
  },
  {
    message: 'Paths',
    board: `
 S 0 0 0 0 0 0 0 0 0
 0 X X X X X X X X 0
 0 0 0 X 0 0 0 0 0 0
 X X 0 X 0 X X X X 0
-1-1 0 X 0 0 0 0 X 0
-1 X X X X X X 0 X 0
-1 X X X X X X 1 2-1
-1 0 X X X X X X X X
 2 2 0 0 0-3-3-3 E X
 2 2 2 X X X X X X X
`,
    range: 6,
    startHealth: 3,
  },
  {
    message: '🎄You win!🎄',
    link: 'https://docs.google.com/document/d/1TK_qPU_GwCJBB69S0zJgTZ5t0vqEbASXyPahBYlUABY?usp=sharing',
    board: `
 S
`,
    range: 4,
    startHealth: 2,
  },
];

const healthDiv = document.getElementById('health');
const levelDiv = document.getElementById('level-text');
const gridDiv = document.getElementById('grid');
const messageDiv = document.getElementById('message-text');
const restartButton = document.getElementById('restart');
const upButton = document.getElementById('up');
const downButton = document.getElementById('down');
const leftButton = document.getElementById('left');
const rightButton = document.getElementById('right');
const linkAnchor = document.getElementById('link');

let level = -1;
let board = null;
let cells = null;
let startX = 0;
let startY = 0;
let winX = 0;
let winY = 0;
let healthBar = null;
let px = 0;
let py = 0;
let health = 5;
let gameOver = false;

function nextLevel() {
  level += 1;
  levelDiv.innerText = `Level ${level + 1}`;
  board = transpose(levels[level].board.split('\n')
    .map((line, y) => (line.match(/.{1,2}/g) || [])
      .map((str, x) => {
        if (str.trim() === 'S') {
          startX = x;
          startY = y - 1; // Empty line at beginning
          return 0;
        }
        if (str.trim() === 'E') {
          winX = x;
          winY = y - 1; // Empty line at beginning
          return 0;
        }
        return isNaN(+str) ? Infinity : +str;
      }))
    .filter((arr) => arr.length > 0));
  cells = [];

  gridDiv.style.setProperty('--cols', `${board.length}`);
  gridDiv.style.setProperty('--rows', `${board[0].length}`);
  gridDiv.replaceChildren();
  for (var x = 0; x < board.length; x += 1) {
    const column = [];
    for (var y = 0; y < board[0].length; y += 1) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      const content = document.createElement('div');
      cell.appendChild(content);
      gridDiv.appendChild(cell);
      column.push({ cell, content });
    }
    cells.push(column);
  }
  healthDiv.style.setProperty('--health-bar-length', `${levels[level].range + 1}`);
  healthDiv.replaceChildren();
  healthBar = [];
  for (let i = 0; i < levels[level].range + 1; i += 1) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    const cellNumber = document.createElement('div');
    cellNumber.innerText = i === 0 ? '🥶' : i === levels[level].range ? '🔥' : '';
    cell.appendChild(cellNumber);
    healthDiv.appendChild(cell);
    healthBar.push(cell);
  }
  px = startX;
  py = startY;
  health = levels[level].startHealth;
  gameOver = false;
}

restartButton.addEventListener('click', () => {
  level -= 1;
  nextLevel();
  render();
});

function render() {
  for (let i = 0; i < levels[level].range + 1; i += 1) {
    if (i === health) {
      healthBar[i].classList.add('health-full');
    } else {
      healthBar[i].classList.remove('health-full');
    }
  }
  for (var x = 0; x < board.length; x += 1) {
    for (var y = 0; y < board[0].length; y += 1) {
      const { cell, content } = cells[x][y];
      cell.classList.remove('blank');
      if (board[x][y] === Infinity) {
        cell.classList.add('blank');
      }
      const v = board[x][y];
      if (x === px && y === py) {
        content.innerText = health === 0 ? '🥶' : health === levels[level].range ? '🔥' : '🎅';
      } else if (x === winX && y === winY) {
        content.innerText = '🎄';
      } else {
        content.innerText = emojiMap[v] || '';
      }
    }
  }
  messageDiv.innerText = gameOver ? `${health === 0 ? '🥶Too cold!🥶' : '🔥Too hot!🔥'} Press 🔄 to restart` : levels[level].message;
  if (levels[level].link) {
    linkAnchor.setAttribute('href', levels[level].link);
    linkAnchor.classList.remove('hidden');
  } else {
    linkAnchor.classList.add('hidden');
  }
  const moveButtons = [upButton, downButton, leftButton, rightButton];
  if (gameOver) {
    moveButtons.map((button) => button.setAttribute('disabled', 'true'));
  } else {
    moveButtons.map((button) => button.removeAttribute('disabled'));
  }
}

function move(direction) {
  if (gameOver) {
    return;
  }
  let nx = px;
  let ny = py;
  switch (direction) {
    case 'ArrowUp':
      ny = Math.max(0, ny - 1);
      break;
    case 'ArrowDown':
      ny = Math.min(board[0].length - 1, ny + 1);
      break;
    case 'ArrowLeft':
      nx = Math.max(0, nx - 1);
      break;
    case 'ArrowRight':
      nx = Math.min(board.length - 1, nx + 1);
      break;
  }
  if ((nx !== px || ny !== py) && board[nx][ny] !== Infinity) {
    px = nx;
    py = ny;
    health += board[px][py];
    board[px][py] = 0;
    health = Math.max(0, health);
    health = Math.min(levels[level].range, health);
    if (health === 0 || health === levels[level].range) {
      gameOver = true;
    }
    render();
    if (px === winX && py === winY) {
      nextLevel();
      render();
    }
  }
}

window.addEventListener('keydown', (event) => {
  move(event.key);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
  }
});
upButton.addEventListener('click', () => move('ArrowUp'));
downButton.addEventListener('click', () => move('ArrowDown'));
leftButton.addEventListener('click', () => move('ArrowLeft'));
rightButton.addEventListener('click', () => move('ArrowRight'));

nextLevel();
render();
