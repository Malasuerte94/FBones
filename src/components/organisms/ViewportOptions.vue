<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import {useWorkspace} from '../../stores/workspace';
import AppIcon from '../atoms/AppIcon.vue';

const w = useWorkspace();
const {t} = useI18n();
const layers = [
  {id: 'bones', label: 'bones'},
  {id: 'images', label: 'images'},
  {id: 'others', label: 'viewportOthers'},
] as const;
const actions = [
  {id: 'select', label: 'viewportSelect', heading: 'viewportSelect', icon: 'arrow'},
  {id: 'show', label: 'viewportShow', heading: 'viewportShow', icon: 'eye'},
  {id: 'names', label: 'viewportNames', heading: 'viewportNamesShort', icon: 'tag'},
] as const;

function optionLabel(layer: typeof layers[number], action: typeof actions[number]) {
  if (action.id === 'names') return t('viewportNameTagsLayer', {layer: t(layer.label)});
  return t('viewportOptionLabel', {action: t(action.label), layer: t(layer.label)});
}

type Layer = typeof layers[number]['id'];
type Action = typeof actions[number]['id'];
const optionStates = {
  select: w.viewportSelection,
  show: w.viewportVisibility,
  names: w.viewportNameTags,
} satisfies Record<Action, Record<Layer, boolean>>;

function toggleOption(layer: Layer, action: Action) {
  optionStates[action][layer] = !optionStates[action][layer];
}
</script>

<template>
  <div class="viewport-layer-options pointer-events-auto w-max rounded-sm border border-line bg-shell px-1.5 pt-0.5 pb-1" data-testid="viewport-options-panel">
    <table class="text-center text-[10px] leading-3">
      <caption class="sr-only">{{t('viewportOptions')}}</caption>
      <thead class="text-muted">
        <tr>
          <th scope="col"><span class="sr-only">{{t('viewportLayer')}}</span></th>
          <th v-for="action in actions" :key="action.id" scope="col" :aria-label="t(action.label)" class="px-0.5 pb-0.5 font-normal">
            {{t(action.heading)}}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="layer in layers" :key="layer.id">
          <th scope="row" class="pr-1.5 text-left font-medium">{{t(layer.label)}}</th>
          <td v-for="action in actions" :key="action.id" class="px-0.5 py-px">
            <button type="button"
              class="relative mx-auto grid h-5 w-6 place-items-center rounded-sm border border-line hover:border-accent"
              :class="optionStates[action.id][layer.id]?'bg-accent-deep text-ink':'bg-panel text-muted'"
              :aria-pressed="optionStates[action.id][layer.id]" :aria-label="optionLabel(layer,action)" :title="optionLabel(layer,action)"
              :data-testid="`viewport-${action.id}-${layer.id}`" @keydown.space.stop @click="toggleOption(layer.id,action.id)">
              <AppIcon :name="action.icon" class="!size-3.5"/>
              <span v-if="!optionStates[action.id][layer.id]" aria-hidden="true" class="absolute h-px w-3.5 -rotate-45 bg-current"/>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
