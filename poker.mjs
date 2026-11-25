export const ranks = ['High card','One pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush','Royal flush'];
export const compare = (a,b) => {
  for (let i=0;i<Math.max(a.length,b.length);i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
};

function five(cards) {
  const values = cards.map(card => card.rank).sort((a,b)=>b-a);
  const groups = [...new Set(values)].map(rank => [values.filter(value=>value===rank).length,rank]);
  groups.sort((a,b)=>compare(b,a));
  const flush = cards.every(card=>card.suit===cards[0].suit);
  const straight = groups.length===5 && (values[0]-values[4]===4 ? values[0] : values.join() === '14,5,4,3,2' ? 5 : 0);
  const [first,second] = groups;
  const kickers = groups.map(group=>group[1]);
  if (flush && straight) return [straight===14 ? 9 : 8,straight];
  if (first[0]===4) return [7,...kickers];
  if (first[0]===3 && second[0]===2) return [6,...kickers];
  if (flush) return [5,...values];
  if (straight) return [4,straight];
  if (first[0]===3) return [3,...kickers];
  if (first[0]===2) return [second[0]===2 ? 2 : 1,...kickers];
  return [0,...values];
}

export function evaluate(cards) {
  let best = [];
  function choose(start, selected) {
    if (selected.length===5) {
      const score = five(selected);
      if (compare(score,best)>0) best=score;
      return;
    }
    for (let i=start;i<=cards.length-5+selected.length;i++) choose(i+1,[...selected,cards[i]]);
  }
  choose(0,[]);
  return best;
}

export class Table {
  players = ['You','Maya','Jules','Kai'].map((name,id)=>({name,id,chips:1000}));
  dealer = -1;
  hand = 0;
  constructor(random=Math.random) { this.random=random; }
  next(from, predicate) {
    for (let offset=1;offset<=this.players.length;offset++) {
      const id=(from+offset)%this.players.length;
      if (predicate(this.players[id])) return id;
    }
    return -1;
  }
  get pot() { return this.players.reduce((sum,p)=>sum+p.total,0); }
  start() {
    if ((this.hand && !this.done) || !this.players[0].chips || this.players.filter(p=>p.chips).length<2) return false;
    this.hand++;
    this.dealer=this.next(this.dealer,p=>p.chips);
    this.deck=['♠','♥','♣','♦'].flatMap(suit=>Array.from({length:13},(_,i)=>({suit,rank:i+2})));
    for (let i=this.deck.length-1;i>0;i--) {
      const j=Math.floor(this.random()*(i+1));
      [this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]];
    }
    for (const p of this.players) Object.assign(p,{cards:p.chips ? [this.deck.pop(),this.deck.pop()] : [],folded:!p.chips,out:!p.chips,bet:0,total:0,actedAt:null,label:'',won:0});
    this.board=[];
    this.street=0;
    this.done=false;
    this.showdown=false;
    this.log=[];
    this.price=20;
    this.increment=20;
    const headsUp=this.players.filter(p=>!p.out).length===2;
    const small=headsUp ? this.dealer : this.next(this.dealer,p=>!p.out);
    const big=this.next(small,p=>!p.out);
    this.post(this.players[small],10,'Small blind');
    this.post(this.players[big],20,'Big blind');
    this.advance(big);
    return true;
  }
  post(p,amount,label) {
    const paid=Math.min(amount,p.chips);
    p.chips-=paid;
    p.bet+=paid;
    p.total+=paid;
    p.label=label;
    return paid;
  }
  options() {
    const p=this.players[this.actor];
    const owed=Math.max(0,this.price-p.bet);
    const max=p.bet+p.chips;
    const min=Math.min(max,this.price+this.increment);
    const raise=max>this.price && (p.actedAt===null || this.price-p.actedAt>=this.increment) &&
      this.players.some(other=>other!==p && !other.folded && other.chips);
    return {owed,call:Math.min(owed,p.chips),min,max,raise};
  }
  act(type,target) {
    if (this.done) return false;
    const p=this.players[this.actor];
    const o=this.options();
    if (type==='fold') {
      p.folded=true;
      p.label='Fold';
    } else if (type==='call') {
      this.post(p,o.call,o.owed ? 'Call '+o.call : 'Check');
    } else if (type==='raise' && o.raise && Number.isInteger(target) && target>=o.min && target<=o.max) {
      const increase=target-this.price;
      if (increase>=this.increment) this.increment=increase;
      this.post(p,target-p.bet,(this.price ? 'Raise to ' : 'Bet ')+target);
      this.price=target;
    } else return false;
    p.actedAt=this.price;
    this.log.unshift(p.name+' · '+p.label+(!p.chips && !p.folded ? ' (all-in)' : ''));
    this.advance(p.id);
    return true;
  }
  advance(from) {
    const live=this.players.filter(p=>!p.folded);
    if (live.length===1) return this.finish(false);
    const funded=live.filter(p=>p.chips);
    const required=funded.length===1 ? Math.max(...live.filter(p=>p!==funded[0]).map(p=>p.bet)) : this.price;
    if (funded.length===1 && funded[0].bet<required) {
      this.price=required;
      this.actor=funded[0].id;
      return;
    }
    this.actor=funded.length<2 ? -1 : this.next(from,p=>!p.folded && p.chips && (p.actedAt===null || p.bet<this.price));
    if (this.actor>=0) return;
    if (this.street===3) return this.finish(true);
    this.street++;
    this.deck.pop();
    for (let i=0;i<(this.street===1 ? 3 : 1);i++) this.board.push(this.deck.pop());
    this.price=0;
    this.increment=20;
    for (const p of this.players) {
      p.bet=0;
      p.actedAt=null;
      p.label='';
    }
    this.advance(this.dealer);
  }
  finish(showdown) {
    this.done=true;
    this.showdown=showdown;
    this.actor=-1;
    const live=this.players.filter(p=>!p.folded);
    if (!showdown) {
      const winner=live[0];
      const matched=Math.max(...this.players.filter(p=>p!==winner).map(p=>p.total));
      const refund=Math.max(0,winner.total-matched);
      winner.total-=refund;
      winner.chips+=refund;
      winner.won=this.pot;
      winner.chips+=winner.won;
    } else {
      for (const p of live) p.score=evaluate([...p.cards,...this.board]);
      const layers=[...new Set(this.players.map(p=>p.total))].sort((a,b)=>a-b);
      let previous=0;
      for (const level of layers) {
        const paid=this.players.filter(p=>p.total>=level);
        const amount=(level-previous)*paid.length;
        previous=level;
        if (!amount) continue;
        if (paid.length===1) { paid[0].chips+=amount; paid[0].total-=amount; continue; }
        const eligible=paid.filter(p=>!p.folded).sort((a,b)=>compare(b.score,a.score));
        const best=eligible[0].score;
        const tied=eligible.filter(p=>compare(p.score,best)===0);
        const position=p=>(p.id-this.dealer+this.players.length-1)%this.players.length;
        tied.sort((a,b)=>position(a)-position(b));
        tied.forEach((p,i)=>{
          const share=Math.floor(amount/tied.length)+Number(i<amount%tied.length);
          p.won+=share;
          p.chips+=share;
        });
      }
    }
    this.log.unshift(...this.players.filter(p=>p.won).map(p=>p.name+' won '+p.won));
  }
  bot() {
    const p=this.players[this.actor];
    const o=this.options();
    const [a,b]=p.cards;
    const strength=this.board.length ? evaluate([...p.cards,...this.board])[0]*0.17 :
      (a.rank+b.rank-4)/38+(a.rank===b.rank ? .33 : 0)+(a.suit===b.suit ? .07 : 0);
    const confidence=strength+this.random()*.26;
    const pressure=o.call/(this.pot+o.call);
    if (o.owed && confidence<pressure*1.4+.10) return this.act('fold');
    if (o.raise && confidence>.46 && this.random()<.34) {
      return this.act('raise',Math.min(o.max,Math.max(o.min,this.price+Math.floor(this.pot/40)*10)));
    }
    return this.act('call');
  }
}
