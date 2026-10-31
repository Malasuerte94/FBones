<script setup lang="ts">
defineProps<{ name: 'key' | 'plus' | 'folder' | 'save' | 'close' | 'grid' | 'reset' | 'hand' | 'arrow' | 'chevron' | 'file' | 'logo' | 'bone' | 'undo' | 'redo' | 'trash' | 'mesh' | 'image' | 'weights' | 'tree' | 'eye' }>();
const paths: Record<string, string> = {
  key:'M14 10a5 5 0 1 0-4 4l3 3h3v3h4v-4l-6-6Z M6.5 6.5h.01',
  mesh:'M4 4h16v16H4zM4 4l16 16M20 4 4 20M4 12h16M12 4v16',
  image:'M3 4h18v16H3zM3 17l6-7 5 5 3-3 4 5M15 8h.01',
  weights:'M4 19 12 4l8 15H4zM8 12h8M12 4v15',
  tree:'M6 3v14h14M6 9h14M15 6v6m0 2v6',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  plus: 'M12 5v14M5 12h14', folder: 'M3 7h7l2 2h9v11H3zM3 7V4h7l2 3',
  save: 'M5 3h12l4 4v14H3V3h2m2 0v6h10V3M7 21v-8h10v8',
  close: 'm6 6 12 12M18 6 6 18', grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  reset: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M8 12h8m-4-4v8',
  hand: 'M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2',
  arrow: 'M5 3v17l5-5 4 6 3-2-4-6 7-1z', chevron: 'm9 5 7 7-7 7',
  file: 'M5 3h9l5 5v13H5zM14 3v6h5',
  logo: 'M6 20V5h13M6 12h10',
  bone: 'M5 18 8 11 21 3 13 16 6 19Z M8 11l5 5 M4 17a2 2 0 1 0 3 3 2 2 0 0 0-3-3',
  undo: 'M8 4 3 9l5 5M3 9h11a7 7 0 0 1 0 14',
  redo: 'm16 4 5 5-5 5M21 9H10a7 7 0 0 0 0 14',
  trash: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
};
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0" aria-hidden="true"><path :d="paths[name]" /></svg></template>
