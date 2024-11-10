<template>
  <div>
    <div v-for="(input, index) in inputs" :key="index">
      <input
        type="range"
        :id="input.name"
        :value="inputValues[index]"
        @input="updateInputValue($event as InputEvent, index)"
        :min="0"
        :max="input.max"
        :style="{ width: `${input.max * scale}px` }"
      />
      <span class="ml-2">{{ `${input.name} = ${inputValues[index]} ${deltaString(inputValues[index], lastInputValues[index])}` }}</span>
    </div>
    <div>
      <input
        type="range"
        :id="output.name"
        :value="operation(inputValues)"
        :min="0"
        :max="output.max"
        :style="{ width: `${output.max * scale}px` }"
        disabled
      />
      <span class="ml-2">{{ `${output.name} = ${operation(inputValues)} ${deltaString(operation(inputValues), lastOutputValue)}` }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

const props = defineProps<{
  inputs: {
    name: string;
    value: number;
    min: number;
    max: number;
  }[];
  output: {
    name: string;
    min: number;
    max: number;
  };
  func: 'add' | 'multiply';
  scale: number;
}>();

const operation = {
  add: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  multiply: (arr: number[]) => arr.reduce((a, b) => a * b, 1),
}[props.func];

const inputValues = reactive(props.inputs.map(input => input.value));
const lastInputValues = reactive(props.inputs.map(input => input.value));
const lastOutputValue = ref(operation(inputValues));

function updateInputValue(event: InputEvent, index: number) {
  const target = event.target as HTMLInputElement;
  for (let i = 0; i < inputValues.length; i++) {
    lastInputValues[i] = inputValues[i];
  }
  lastOutputValue.value = operation(inputValues);
  inputValues[index] = Number(target.value);
}

function deltaString(current: number, last: number) {
  const delta = current - last;
  if (delta === 0) return '';
  return delta > 0 ? `(+${delta})` : `(${delta})`;
}
</script>
