const {
  assoc,
  forEach,
  join,
  map,
  pipe,
  range,
  reduce,
  sort,
  toPairs,
  uniq,
  __
} = R;

const STATE = {
  LIVING: Symbol('living'),
  DEAD: Symbol('dead')
};

// CONSTANTS
let WIDTH = undefined;
let HEIGHT = undefined;

const LIV_PROB = 0;

const NB_OFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const createNewCell = y => x => ({state: STATE.DEAD, x, y});

const createRow = width => y => {
  const cellCreator = createNewCell(y);

  return pipe(
    range,
    map(cellCreator)
  )(0, width);
};

const createEmptyWorld = (width, height) => pipe(
  range,
  map(createRow(width))
)(0, height);

const getRandomCellState = () => (
  Math.random() < 0.5
    ? STATE.LIVING
    : STATE.DEAD
);

const setCellStateRandomly = c =>
  assoc('state', getRandomCellState(LIV_PROB), c);

const initializeWorldRandomly = map(map(setCellStateRandomly));

const initializeWorld = () => {
  const raw = document.getElementById('start-points').value;
  const points = JSON.parse('[' + raw + ']');

  const w = getWidth();
  const h = getHeight();
  const world = createEmptyWorld(w, h);

  points
    .filter(([x, y]) => (x >= 0 && x < w && y >= 0 && y < h))
    .forEach(([x, y]) => world[y][x].state = STATE.LIVING);

  return world;
};

const isCellAlive = (x, y, world) => {
  const _x = (x + WIDTH) % WIDTH;
  const _y = (y + HEIGHT) % HEIGHT;

  return world[_y][_x].state === STATE.LIVING;
};

const isAliveAsNum = pipe(isCellAlive, Number);

const aSum = reduce((a, b) => a + b, 0);

const livingNbs = (cell, world) =>
  aSum(
    map(
      ([xo, yo]) => isAliveAsNum(cell.x + xo, cell.y + yo, world),
      NB_OFSETS
    )
  );

const CONWAY_RULE = {
  [STATE.DEAD]: [ // NO of living neighbours for dead cell
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.LIVING,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD
  ],
  [STATE.LIVING]: [ // NO of living neighbours for living cell
    STATE.DEAD,
    STATE.DEAD,
    STATE.LIVING,
    STATE.LIVING,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD
  ]
};

const EMPTY_RULE = {
  [STATE.DEAD]: [ // NO of living neighbours for dead cell
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD
  ],
  [STATE.LIVING]: [ // NO of living neighbours for living cell
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD,
    STATE.DEAD
  ]
};

const randStateRule = () => pipe(
  range,
  map(() => getRandomCellState())
)(0, 9);

const n = Math.random();

const randRule = () => ({
  [STATE.LIVING]: randStateRule(),
  [STATE.DEAD]: randStateRule(),
});

let RULE = EMPTY_RULE;

const nextCellState = (cell, world) => RULE[cell.state][livingNbs(cell, world)];
const nextCell = world => cell => assoc('state', (nextCellState(cell, world)), cell);
const nextWorld = world => map(map(nextCell(world)), world);

const COLORS = {
  [STATE.LIVING]: '#000000',
  [STATE.DEAD]: '#FFFFFF',
};

let to = null;

const TO_TEXT = {
  [STATE.LIVING]: 'O',
  [STATE.DEAD]: 'X',
  [STATE.UNSET]: '?'
};

const dbgWorld = pipe(
  map(map(({state}) => TO_TEXT[state])),
  map(join('')),
  join('\n')
);

const start = () => {
  stop();

  let world = initializeWorld();
  WIDTH = getWidth();
  HEIGHT = getHeight();

  const timeStep = getTimeStep();

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const CX = getPixelSize();
  const CY = CX;

  canvas.width = WIDTH * CX;
  canvas.height = HEIGHT * CY;

  const drawCell = cell => {
    ctx.fillStyle = COLORS[cell.state];
    ctx.fillRect(cell.x * CX, cell.y * CY, CX, CY);
  };

  const drawWorld = world => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    forEach(forEach(drawCell), world);
  };

  const fps = document.getElementById('fps');

  const worldStep = () => {
    const time = Date.now();

    world = nextWorld(world);
    drawWorld(world);

    const elapsed = Date.now() - time;

    const nextTimeStep = timeStep - elapsed;

    const fpsBase = nextTimeStep < 0 ? elapsed : timeStep;
    fps.innerText = 'FPS: ' + (1000 / fpsBase).toFixed(2);

    to = setTimeout(worldStep, nextTimeStep < 0 ? 0 : nextTimeStep);
  };

  drawWorld(world);
  to = setTimeout(worldStep, 0);
};

const stop = () => {
  if(to) {
    clearTimeout(to);
  }

  to = null;
};


const addTd = (text, rowspan, colspan) => row => {
  const e = document.createElement('td');
  e.innerText = text;

  if (rowspan) {
    e.rowSpan = rowspan;
  }

  if (colspan) {
    e.colSpan = colspan;
  }

  row.appendChild(e);

  return row;
};

const addTdWithDiv = divclass => row => {
  const td = document.createElement('td');

  const div = document.createElement('div');
  div.className = divclass;

  td.appendChild(div);
  row.appendChild(td);

  return row;
};

const addTdWithStateSelector = (state, neighbours, selected) => row => {
  const td = document.createElement('td');
  td.onclick = () => {
    RULE[state][neighbours] = (selected === STATE.LIVING ? STATE.DEAD : STATE.LIVING);
    createRulesTable(RULE);
  };

  const s = document.createElement('div');
  s.className = selected === STATE.LIVING ? 'alive-ex' : 'dead-ex';
  td.appendChild(s);

  row.appendChild(td);

  return row;
};

const createFirstRuleRow = rules => table => {
  const firstRow = document.createElement('tr');
  pipe(
    addTd('ALIVE', 9),
    addTd('0'),
    addTdWithStateSelector(STATE.LIVING, 0, rules[STATE.LIVING][0]),
    addTd('DEAD', 9),
    addTd('0'),
    addTdWithStateSelector(STATE.DEAD, 0, rules[STATE.DEAD][0]),
  )(firstRow);

  table.appendChild(firstRow);

  return table;
};

const createCommonRuleRow = rules => nbrs => table => {
  const row = document.createElement('tr');
  pipe(
    addTd(nbrs),
    addTdWithStateSelector(STATE.LIVING, nbrs, rules[STATE.LIVING][nbrs]),
    addTd(nbrs),
    addTdWithStateSelector(STATE.DEAD, nbrs, rules[STATE.DEAD][nbrs]),
  )(row);

  table.appendChild(row);

  return table;
};

const createHeaderRow = table => {
  const header = document.createElement('tr');
  ['State', 'AL. Nbrs.', 'Next state', 'State', 'AL. Nbrs.', 'Next state']
    .map(t => {
      const e = document.createElement('th');
      e.innerText = t;
      header.appendChild(e);
    });
  table.appendChild(header);

  return table;
};

const createLastRow = table => {
  const lastRow = document.createElement('tr');

  pipe(
    addTdWithDiv('dead-ex'),
    addTd('is DEAD cell', 1, 2),
    addTdWithDiv('alive-ex'),
    addTd('is LIVING cell', 1, 2),
  )(lastRow);

  table.appendChild(lastRow);
};

const createRulesTable = rules => {
  RULE = rules;

  const table = document.getElementById('rules-table');
  table.innerHTML = null;

  pipe(
    createHeaderRow,
    createFirstRuleRow(rules),
    ...map(createCommonRuleRow(rules), range(1, 9)),
    createLastRow
  )(table);

};

const setConwaysRule = () => createRulesTable(CONWAY_RULE);

const setRandomRule = () => createRulesTable(randRule());

const getWidth = () => parseInt(document.getElementById('width').value, 10);

const getHeight = () => parseInt(document.getElementById('height').value, 10);

const getTimeStep = () => parseInt(document.getElementById('time-step').value, 10);

const getPixelSize = () => parseInt(document.getElementById('pixel-size').value, 10);

const createRandomCells = () => {
  const textarea = document.getElementById('start-points');

  const w = getWidth();
  const h = getHeight();

  const th = Math.random();
  const pts = [];
  for(let x = 0; x < w; x++) {
    for(let y = 0; y < h; y++) {
      if (Math.random() > th) {
        pts.push([x, y]);
      }
    }
  }

  textarea.value = pipe(
    map(([x, y]) => '[' + x + ', ' + y + ']'),
    join(',\n')
  )(pts);
};

const init = () => {
  RULE = EMPTY_RULE;

  createRulesTable(RULE);
};

init();


