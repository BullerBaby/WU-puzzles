import { JSDOM } from 'jsdom'; import fs from 'fs';
const dom=new JSDOM('<svg id="board-svg"></svg>',{url:'http://localhost/'});
global.window=dom.window; global.document=dom.window.document;
const B=await import('./js/board.js');
const {BOARDS}=await import('./data/boards.js');
const game={board:'spitewood-1', boardRotation:90};
B.renderBoard(game);
const polys=[...dom.window.document.querySelectorAll('polygon.hex-poly')];
console.log('rendered hexes:', polys.length);
const hexes=polys.map(p=>{
  const pts=p.getAttribute('points').split(' ').map(s=>s.split(',').map(Number));
  const cx=pts.reduce((a,b)=>a+b[0],0)/pts.length, cy=pts.reduce((a,b)=>a+b[1],0)/pts.length;
  return {id:p.getAttribute('data-hex'), type:p.getAttribute('data-hextype')||'', x:+cx.toFixed(2), y:+cy.toFixed(2)};
});
fs.writeFileSync('/tmp/hexes.json', JSON.stringify(hexes));
// adjacency: nearest-neighbour distance
let min=Infinity;
for(let i=0;i<hexes.length;i++)for(let j=i+1;j<hexes.length;j++){
  const d=Math.hypot(hexes[i].x-hexes[j].x, hexes[i].y-hexes[j].y);
  if(d<min)min=d;
}
console.log('neighbour distance:', min.toFixed(2));
const adj={};
hexes.forEach(h=>adj[h.id]=[]);
for(let i=0;i<hexes.length;i++)for(let j=i+1;j<hexes.length;j++){
  const d=Math.hypot(hexes[i].x-hexes[j].x, hexes[i].y-hexes[j].y);
  if(d<min*1.15){adj[hexes[i].id].push(hexes[j].id);adj[hexes[j].id].push(hexes[i].id);}
}
fs.writeFileSync('/tmp/adj.json', JSON.stringify(adj));
const edge=hexes.filter(h=>adj[h.id].length<6).map(h=>h.id);
console.log('edge hexes (<6 neighbours):', edge.length);
console.log('interior hexes:', hexes.length-edge.length);
console.log('\nspecial:', hexes.filter(h=>h.type).map(h=>h.id+'='+h.type).join(', '));
