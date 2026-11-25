import test from 'node:test';
import assert from 'node:assert/strict';
import {Table, evaluate, compare} from './poker.mjs';

const cards = (...entries) => entries.map(([rank,suit])=>({rank,suit}));

test('royal flush, wheel and kicker comparisons', () => {
  assert.deepEqual(evaluate(cards([14,'s'],[13,'s'],[12,'s'],[11,'s'],[10,'s'],[3,'d'],[5,'c'])),[9,14]);
  assert.deepEqual(evaluate(cards([14,'s'],[2,'d'],[3,'c'],[4,'h'],[5,'s'])),[4,5]);
  const board=cards([14,'s'],[14,'h'],[9,'s'],[5,'d'],[2,'c']);
  assert.ok(compare(evaluate([...board,...cards([13,'h'],[4,'s'])]),evaluate([...board,...cards([12,'h'],[4,'d'])]))>0);
});

test('awards main and side pots and returns unmatched chips', () => {
  const table=new Table();
  table.start();
  table.board=cards([2,'s'],[4,'h'],[6,'d'],[8,'c'],[13,'s']);
  const hands=[cards([13,'h'],[13,'d']),cards([8,'h'],[8,'d']),cards([6,'h'],[6,'c']),[]];
  const totals=[40,100,200,0];
  table.players.forEach((p,i)=>Object.assign(p,{cards:hands[i],total:totals[i],chips:1000-totals[i],folded:i===3}));
  table.finish(true);
  assert.deepEqual(table.players.map(p=>p.won),[120,120,0,0]);
  assert.deepEqual(table.players.map(p=>p.chips),[1080,1020,900,1000]);
});

test('splits tied pots and awards the odd chip left of the dealer', () => {
  const table=new Table();
  table.start();
  table.board=cards([14,'s'],[13,'s'],[12,'s'],[11,'s'],[10,'s']);
  table.players.forEach((p,i)=>Object.assign(p,{total:i<3?5:0,chips:i<3?995:1000,folded:i>1}));
  table.finish(true);
  assert.deepEqual(table.players.map(p=>p.won),[7,8,0,0]);
});

test('simulated tables conserve chips and always finish each hand', () => {
  for(let seed=1;seed<=100;seed++) {
    let state=seed;
    const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
    const table=new Table(random);
    for(let hand=0;hand<80 && table.start();hand++) {
      let actions=0;
      while(!table.done) {
        assert.ok(actions++<150);
        const player=table.players[table.actor];
        assert.ok(player.chips>0 && !player.folded);
        assert.equal(table.players.reduce((sum,p)=>sum+p.chips,table.pot),4000);
        assert.equal(table.bot(),true);
      }
      assert.equal(table.players.reduce((sum,p)=>sum+p.chips,0),4000);
      assert.ok(table.players.every(p=>p.chips>=0));
      assert.equal(table.players.reduce((sum,p)=>sum+p.won,0),table.pot);
      const dealt=[...table.board,...table.players.flatMap(p=>p.cards)].map(c=>c.rank+c.suit);
      assert.equal(new Set(dealt).size,dealt.length);
    }
  }
});
