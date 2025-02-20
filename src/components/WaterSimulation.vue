<template>
  <button class="btn" @click="paused = !paused">{{ paused ? 'Start' : 'Pause' }}</button>
  <button class="btn" @click="initMap">Reset</button>
  <button class="btn" @click="clearMap">Clear</button>
  <button class="btn" @click="drawMode = (drawMode + 1) % 3">Edit Mode: {{ drawMode === GROUND ? 'Ground' : (drawMode === WATER ? 'Water' : 'Erase') }}</button>
  <span>Total Mass: {{ totalMass.toFixed(2) }}</span>
  <label for="default-range" class="block">Smoothing factor</label>
  <input id="default-range" type="range" min="0" max="1" step="0.0001" v-model="smoothingFactor" class="range">
  <canvas :width="width" :height="height" ref="canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  mapWidth: number;
  mapHeight: number;
  initialMap?: number[][];
  wrap?: boolean;
  drawDepth?: boolean;
  width?: number;
  height?: number;
}>();

const width = props.width ?? 600;
const height = props.height ?? 600;
const drawDepth = true;
const wrap = props.wrap ?? false;

const { mapWidth, mapHeight } = props;

const canvas = ref<HTMLCanvasElement | null>(null);

const mod = (n: number, m: number) => {
  return ((n % m) + m) % m;
};

const get = (arr: number[][], x: number, y: number) => {
  if (wrap) {
    x = mod(x, mapWidth);
    y = mod(y, mapHeight);
  }
  return arr[x][y];
};

const set = (arr: number[][], x: number, y: number, value: number) => {
  if (wrap) {
    x = mod(x, mapWidth);
    y = mod(y, mapHeight);
  }
  arr[x][y] = value;
};

const update = (arr: number[][], x: number, y: number, value: number) => {
  if (wrap) {
    x = mod(x, mapWidth);
    y = mod(y, mapHeight);
  }
  arr[x][y] += value;
};

const simulateCompression = () => {
  let flow = 0;
  let remaining_mass = 0;
  const smooth = smoothingFactor.value;

  //Calculate and apply flow for each block
  for (let x = 1; x <= mapWidth; x++) {
    for (let y = 1; y <= mapHeight; y++) {
      //Skip inert ground blocks
      if (get(blocks, x, y) === GROUND) continue;

      //Custom push-only flow
      flow = 0;
      remaining_mass = get(mass, x, y);
      if (remaining_mass <= 0) continue;

      //The block below this one
      if (mapHeight > 1) {
        if (get(blocks, x, y - 1) !== GROUND) {
          flow = get_stable_state_b(remaining_mass + get(mass, x, y - 1)) - get(mass, x, y - 1);
          if (flow > minFlow) {
            flow *= 1 - smooth;
          }
          flow = constrain(flow, 0, Math.min(maxSpeed, remaining_mass));

          update(newMass, x, y,  -flow);
          update(newMass, x, y - 1, flow);
          remaining_mass -= flow;
        }
      }

      if (remaining_mass <= 0) continue;

      //Left
      if (get(blocks, x - 1, y) !== GROUND) {
        //Equalize the amount of water in this block and it's neighbour
        flow = (get(mass, x, y) - get(mass, x - 1, y)) / divideFactor;
        if (flow > minFlow) { flow *= 1 - smooth; }
        flow = constrain(flow, 0, remaining_mass);

        update(newMass, x, y, -flow);
        update(newMass, x - 1, y, flow);
        remaining_mass -= flow;
      }

      if (remaining_mass <= 0) continue;

      //Right
      if (get(blocks, x + 1, y) !== GROUND) {
        //Equalize the amount of water in this block and it's neighbour
        flow = (get(mass, x, y) - get(mass, x + 1, y)) / divideFactor;
        if (flow > minFlow) { flow *= 1 - smooth; }
        flow = constrain(flow, 0, remaining_mass);

        update(newMass, x, y, -flow);
        update(newMass, x + 1, y, flow);
        remaining_mass -= flow;
      }

      if (remaining_mass <= 0) continue;

      //Up. Only compressed water flows upwards.
      if (mapHeight > 1) {
        if (get(blocks, x, y + 1) !== GROUND) {
          flow = remaining_mass - get_stable_state_b(remaining_mass + get(mass, x, y + 1));
          if (flow > minFlow) { flow *= 1 - smooth; }
          flow = constrain(flow, 0, Math.min(maxSpeed, remaining_mass));

          update(newMass, x, y, -flow);
          update(newMass, x, y + 1, flow);
          remaining_mass -= flow;
        }
      }
    }
  }

  //Copy the new mass values to the mass array
  for (let x = 0; x < mapWidth + 2; x++) {
    for (let y = 0; y < mapHeight + 2; y++) {
      set(mass, x, y, get(newMass, x, y));
    }
  }

  for (let x = 1; x <= mapWidth; x++) {
    for (let y = 1; y <= mapHeight; y++) {
      //Skip ground blocks
      if (get(blocks, x, y) === GROUND) continue;
      //Flag/unflag water blocks
      if (get(mass, x, y) > minMass) {
        set(blocks, x, y, WATER);
      } else {
        set(blocks, x, y, AIR);
      }
    }
  }

  if (!wrap) {
    //Remove any water that has left the map
    for (let x = 0; x < mapWidth + 2; x++) {
      set(mass, x, 0, 0);
      set(mass, x, mapHeight + 1, 0);
    }
    for (let y = 1; y < mapHeight + 1; y++) {
      set(mass, 0, y, 0);
      set(mass, mapWidth + 1, y, 0);
    }
  }

}

//Take an amount of water and calculate how it should be split among two
//vertically adjacent cells. Returns the amount of water that should be in
//the bottom cell.
const get_stable_state_b = (totalMass: number) => {
  if (totalMass <= 1) {
    return 1;
  } else if (totalMass < 2 * maxMass + maxCompress) {
    return (maxMass * maxMass + totalMass * maxCompress) / (maxMass + maxCompress);
  } else {
    return (totalMass + maxCompress) / 2;
  }
};

const AIR = 0;
const GROUND = 1;
const WATER = 2;
const maxMass = 1.0;
const maxCompress = 0.02;
const minMass = 0.0001;
const minDraw = 0.01;
const maxDraw = 1.1;
const maxSpeed = 1;   //max units of water moved out of one block to another, per timestep
const minFlow = 0.01;

//Define map dimensions and data structures
const blocks = new Array(mapWidth + 2).fill(0).map(() => new Array(mapHeight + 2).fill(0));
const mass = new Array(mapWidth + 2).fill(0).map(() => new Array(mapHeight + 2).fill(0));
const newMass = new Array(mapWidth + 2).fill(0).map(() => new Array(mapHeight + 2).fill(0));

//Block size will be automatically calculated based on the above settings.
let block_width = 0;
let block_height = 0;
let hblock_width = 0;
let hblock_height = 0;

//Define colors
const block_colors = [
  'white',        //air
  'rgb(200,200,100)', //ground
];

let button = -1;
let mouseX = 0;
let mouseY = 0;
let shift = false;
const paused = ref(true);
const drawMode = ref(WATER);
const totalMass = ref(0);
const smoothingFactor = ref(0.5);
const divideFactor = 4;

const setup = () => {
  if (!canvas.value) return;
  block_width = Math.floor(canvas.value.width / mapWidth);
  block_height = Math.floor(canvas.value.height / mapHeight);

  hblock_width = block_width / 2;
  hblock_height = block_height / 2;

  initMap();
}

const simulate = () => {
  simulateCompression();
};

const constrain = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const draw = () => {
  if (!canvas.value) return;

  if (button != -1) {
    const mx = constrain(Math.floor(mouseX / block_width) + 1, 1, mapWidth);
    const my = constrain(mapHeight - Math.floor(mouseY / block_height), 1, mapHeight);
    set(blocks, mx, my, drawMode.value);
    const value = drawMode.value === WATER ? maxMass : 0;
    set(mass, mx, my, value);
    set(newMass, mx, my, value);
  }

  if (!paused.value) {
    simulate();
  }

  let h = 0;
  let c: string;

  for (let x = 1; x <= mapWidth; x++) {
    for (let y = 1; y <= mapHeight; y++) {
      if (get(blocks, x, y) === WATER) {

        //Skip cells that contain very little water
        if (get(mass, x, y) < minDraw) continue;

        //Draw water
        if (drawDepth && (get(mass, x, y) < maxMass)) {
          //Draw a half-full block. Block size is dependent on the amount of water in it.
          draw_block(x, y, waterColor(0), 1);
          if (mass[x][y + 1] >= minDraw) {
            draw_block(x, y, waterColor(get(mass, x, y + 1)), 1);
          }
          draw_block(x, y, waterColor(get(mass, x, y)), get(mass, x, y));
        } else {
          //Draw a full block
          h = 1;
          c = waterColor(get(mass, x, y));
          draw_block(x, y, c, h);
        }

      } else {
        //Draw any other block
        draw_block(x, y, block_colors[get(blocks, x, y)], 1);
      }
    }
  }

  // Compute total mass
  totalMass.value = 0;
  for (let x = 1; x <= mapWidth; x++) {
    for (let y = 1; y <= mapHeight; y++) {
      totalMass.value += get(mass, x, y);
    }
  }
  // drawText(`Total mass: ${totalMass.toFixed(2)}`, 10, 20);

}

const fill = (color: string) => {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = color;
};

const rect = (x: number, y: number, width: number, height: number) => {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;
  ctx.fillRect(x, y, width, height);
};

const draw_block = (x: number, y: number, c: string, filled: number) => {
  const _screen_x = screen_x(x - 1);
  const _screen_y = screen_y(y - 1);
  const block_y = screen_y(y - 1 + filled);

  fill(c);
  rect(_screen_x, block_y, block_width, _screen_y - block_y);

  // if ( (show_state == SHOW_MASS) && ( mass[x][y] >= minMass )){
  //   fill( 0, 0, 0, 255);
  //   text( mass[x][y] , _screen_x + hblock_width, _screen_y - hblock_height);
  // }
}

const map = (value: number, start1: number, stop1: number, start2: number, stop2: number) => {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};

//Calculates an RGB water color based on the amount of water in the cell
const waterColor = (m: number) => {
  m = constrain(m, minDraw, maxDraw);

  let r = 50, g = 50;
  let b: number;

  if (m < 1) {
    b = Math.floor(map(m, 0.01, 1, 255, 200));
    r = Math.floor(map(m, 0.01, 1, 240, 50));
    r = constrain(r, 50, 240);
    g = r;
  } else {
    b = Math.floor(map(m, 1, 1.1, 190, 140));
  }

  b = constrain(b, 140, 255);

  return `rgb( ${r}, ${g}, ${b} )`;
}

const screen_x = (x: number) => {
  return x * block_width;
}

const screen_y = (y: number) => {
  return (props.mapHeight - y) * block_height;
}

//Fill the map with random blocks
const initMap = () => {
  for (let x = 0; x < mapWidth + 2; x++) {
    for (let y = 0; y < mapHeight + 2; y++) {
      if (props.initialMap) {
        if (wrap) {
          if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
            console.log({x, y, value: props.initialMap[y][x]});
            set(blocks, x, y, props.initialMap[y][x]);
          } else {
            set(blocks, x, y, AIR);
          }
        } else {
          if (x > 0 && x <= mapWidth && y > 0 && y <= mapHeight) {
            console.log({x, y, value: props.initialMap[y - 1][x - 1]});
            set(blocks, x, y, props.initialMap[y - 1][x - 1]);
          } else {
            set(blocks, x, y, AIR);
          }
        }
      } else {
        const block = Math.floor(Math.random() * 3);
        console.log({x, y, value: block});
        set(blocks, x, y, block);
      }
      set(mass, x, y, get(blocks, x, y) === WATER ? maxMass : 0.0);
      set(newMass, x, y, get(blocks, x, y) === WATER ? maxMass : 0.0);
    }
  }

  if (!wrap) {
    for (let x = 0; x < mapWidth + 2; x++) {
      set(blocks, x, 0, AIR);
      set(blocks, x, mapHeight + 1, AIR);
    }

    for (let y = 1; y < mapHeight + 1; y++) {
      set(blocks, 0, y, AIR);
      set(blocks, mapWidth + 1, y, AIR);
    }
  }
}

const clearMap = () => {
  for (let x = 0; x < mapWidth + 2; x++) {
    for (let y = 0; y < mapHeight + 2; y++) {
      set(blocks, x, y, 0);
      set(mass, x, y, 0);
      set(newMass, x, y, 0);
    }
  }
}

onMounted(() => {
  if (!canvas.value) return;
  canvas.value.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  canvas.value.addEventListener('mousedown', (event) => {
    button = event.button;
  });
  canvas.value.addEventListener('mouseup', () => {
    button = -1;
  });
  canvas.value.addEventListener('mousemove', (event) => {
    mouseX = event.offsetX;
    mouseY = event.offsetY;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
      shift = true;
    }
  });
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
      shift = false;
    }
  });
  setup();
  const animate = () => {
    draw();
    requestAnimationFrame(animate);
  };
  animate();
});

</script>
<style scoped>

.btn {
  @apply text-white;
  @apply bg-blue-700;
  @apply  hover:bg-blue-800;
  @apply  focus:ring-4;
  @apply  focus:ring-blue-300;
  @apply  font-medium;
  @apply  rounded-lg;
  @apply  text-sm;
  @apply px-5;
  @apply py-2.5;
  @apply me-2;
  @apply mb-2;
  @apply dark:bg-blue-600 dark:hover:bg-blue-700;
  @apply focus:outline-none;
  @apply dark:focus:ring-blue-800;
}

.range {
  @apply w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700;
}

canvas {
    border: 1px solid #000;
  }
</style>
