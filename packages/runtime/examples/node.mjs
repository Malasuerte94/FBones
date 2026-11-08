// After installing the runtime tarball: node node.mjs hero/skeleton.fbones.runtime.json
import {readFile} from 'node:fs/promises';
import {FBonesPlayer} from '@fbones/runtime';

if (!process.argv[2]) throw new Error('Pass the exported skeleton.fbones.runtime.json path.');
const player = new FBonesPlayer(await readFile(process.argv[2], 'utf8'));
console.log('Animations:', player.animationNames.join(', '));
if (player.animationNames.length) {
  player.play(player.animationNames[0], {loop: false});
  player.seek(Math.min(.5, player.duration));
}
console.log('Bone world transforms:', player.frame.bones.map(bone => ({name: bone.name, ...bone.evaluatedWorld})));
