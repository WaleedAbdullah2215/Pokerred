import {Table, ranks, evaluate} from './poker.mjs';

const $=id=>document.getElementById(id);
const format=n=>n.toLocaleString('en');
const names=['Preflop','Flop','Turn','River'];
const faces={11:'J',12:'Q',13:'K',14:'A'};
const suitNames={'♠':'spades','♥':'hearts','♣':'clubs','♦':'diamonds'};
const avatars=['♠','M','J','K'];
let table, timer, wins;

function card(value, hidden=false) {
  if (hidden) return '<span class="card back" aria-label="Face down">♠</span>';
  if (!value) return '<span class="card empty" aria-hidden="true">·</span>';
  const {rank,suit}=value;
  const face=faces[rank]||rank;
  return `<span class="card face ${'♥♦'.includes(suit)?'warm':''}" aria-label="${face} of ${suitNames[suit]}"><small>${face}</small><b>${suit}</b></span>`;
}

function render() {
  const you=table.players[0];
  const human=!table.done && table.actor===0;
  const canContinue=you.chips>0 && table.players.filter(p=>p.chips).length>1;
  $('hand').textContent='HAND '+String(table.hand).padStart(2,'0');
  $('street').textContent=table.showdown ? 'Showdown' : names[table.street];
  $('community').innerHTML=Array.from({length:5},(_,i)=>card(table.board[i])).join('');
  $('pot').textContent=format(table.pot);
  $('stack').textContent=format(you.chips);
  $('wins').textContent=wins;
  $('players').textContent=table.players.filter(p=>!p.out).length+' seated';
  for (const p of table.players) {
    const seat=$('seat'+p.id);
    seat.classList.toggle('active',table.actor===p.id);
    seat.classList.toggle('faded',p.folded && p.id!==0);
    seat.classList.toggle('winner',p.won>0);
    const label=p.won ? '+'+format(p.won)+' chips' : p.out ? 'Out' : p.folded ? 'Folded' : !p.chips ? 'All-in' : p.label;
    seat.innerHTML=`<div class="cards private">${p.cards.map(c=>card(c,p.id!==0 && !(table.showdown && !p.folded))).join('')}</div>
      <div class="profile"><div class="avatar avatar-${p.id}">${avatars[p.id]}</div><div><strong>${p.name}</strong><span>${format(p.chips)}</span></div>${table.dealer===p.id?'<span class="dealer" title="Dealer">D</span>':''}</div>
      <div class="seat-label">${label}</div>`;
  }
  $('activity').replaceChildren(...(table.log.length ? table.log.slice(0,7) : ['Blinds posted. Cards dealt.']).map(entry=>{
    const li=document.createElement('li');
    li.textContent=entry;
    return li;
  }));
  for(const id of ['fold','call','raise']) $(id).hidden=table.done;
  $('next').hidden=!table.done;
  $('next').textContent=canContinue?'Next hand':'New table';
  $('fold').disabled=!human;
  $('call').disabled=!human;
  $('raise').disabled=true;
  $('sizing').hidden=true;
  $('call').textContent='Check / Call';
  $('raise').textContent='Raise';
  if (table.done) {
    const winners=table.players.filter(p=>p.won);
    const result=winners.map(p=>`${p.name} ${p.id===0?'win':'wins'} ${format(p.won)}${table.showdown?' with '+ranks[p.score[0]].toLowerCase():''}`).join(' · ');
    $('status').textContent=result+(canContinue?'':you.chips?' · You won the table!':' · You’re out of chips.');
    if ($('guide').open || $('restart').open) return;
    $('next').focus({preventScroll:true});
  } else if (human) {
    const o=table.options();
    const score=table.board.length ? ' · '+ranks[evaluate([...you.cards,...table.board])[0]] : '';
    $('status').textContent='Your turn'+score;
    $('call').textContent=o.owed?'Call '+format(o.call):'Check';
    $('raise').disabled=!o.raise;
    $('sizing').hidden=!o.raise;
    if (o.raise) {
      $('size').min=o.min;
      $('size').max=o.max;
      $('size').value=o.min;
      $('size-label').textContent=table.price?'Raise to':'Bet';
      showSize();
    }
  } else {
    $('status').textContent=table.players[table.actor].name+' is thinking…';
  }
}
function showSize() {
  const value=Number($('size').value);
  $('amount').textContent=format(value);
  $('raise').textContent=value===table.options().max?'All-in '+format(value):$('size-label').textContent+' '+format(value);
}
function update() {
  clearTimeout(timer);
  if (table.done && table.players[0].won) wins++;
  render();
  if (!table.done && table.actor!==0) timer=setTimeout(()=>{
    table.bot();
    update();
  },480);
}
function start() {
  table=new Table();
  wins=0;
  table.start();
  update();
}
function action(type, amount) {
  if (table.actor===0 && table.act(type,amount)) update();
}
$('fold').onclick=()=>action('fold');
$('call').onclick=()=>action('call');
$('raise').onclick=()=>action('raise',Number($('size').value));
$('size').oninput=showSize;
$('next').onclick=()=>{ if (table.start()) update(); else start(); };
$('rules').onclick=()=>$('guide').showModal();
$('reset').onclick=()=>{
  $('restart').returnValue='';
  $('restart').showModal();
};
$('restart').onclose=()=>{ if ($('restart').returnValue==='reset') start(); };
$('rankings').innerHTML=[...ranks].reverse().map(rank=>'<li>'+rank+'</li>').join('');
start();
