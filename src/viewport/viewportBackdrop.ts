import type {Graphics} from 'pixi.js';

/** The visible board must be inside the GPU scene for Multiply/Screen to compose. */
export function drawViewportBackdrop(graphics:Pick<Graphics,'clear'|'rect'|'fill'>,width:number,height:number){
  graphics.clear();
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return;
  graphics.rect(0,0,width,height).fill(0x555759);
  const cell=24;
  for(let y=0,row=0;y<height;y+=cell,row++)for(let x=0,col=0;x<width;x+=cell,col++)
    if((row+col)%2===1)graphics.rect(x,y,Math.min(cell,width-x),Math.min(cell,height-y));
  graphics.fill(0x5c5e60);
}
