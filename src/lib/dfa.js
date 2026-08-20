// DFA/NFA eğitim çekirdeği.
function dfa(key,name,description,states,start,accept,transitions,positions){return{kind:'dfa',key,name,description,alphabet:['0','1'],states,start,accept:new Set(accept),transitions,positions};}
export const DFA_REGISTRY={
 ends_with_one:dfa('ends_with_one',"'1' ile biten diller","Son karakter 1 ise kabul.",['Q0','Q1'],'Q0',['Q1'],{'Q0,0':'Q0','Q0,1':'Q1','Q1,0':'Q0','Q1,1':'Q1'},{Q0:[0,0],Q1:[3,0]}),
 even_ones:dfa('even_ones',"Çift sayıda '1'","1 sayısı çift ise kabul.",['QEven','QOdd'],'QEven',['QEven'],{'QEven,0':'QEven','QEven,1':'QOdd','QOdd,0':'QOdd','QOdd,1':'QEven'},{QEven:[0,0],QOdd:[3,0]}),
 contains_00:dfa('contains_00',"'00' içeren diller","Ardışık 00 içeriyorsa kabul.",['Q0','Q1','Q2'],'Q0',['Q2'],{'Q0,0':'Q1','Q0,1':'Q0','Q1,0':'Q2','Q1,1':'Q0','Q2,0':'Q2','Q2,1':'Q2'},{Q0:[0,0],Q1:[3,0],Q2:[1.5,2.6]}),
 divisible_by_three:dfa('divisible_by_three',"3'e bölünen ikili sayılar","İkili değer 3'e bölünüyorsa kabul.",['Q0','Q1','Q2'],'Q0',['Q0'],{'Q0,0':'Q0','Q0,1':'Q1','Q1,0':'Q2','Q1,1':'Q0','Q2,0':'Q1','Q2,1':'Q2'},{Q0:[1.5,2.6],Q1:[0,0],Q2:[3,0]})
};
export const NFA_REGISTRY={
 contains_01:{kind:'nfa',key:'contains_01',name:"NFA · '01' alt dizisini içerir",description:'NFA aynı anda birden fazla olası durumda ilerler.',alphabet:['0','1'],states:['S','A','F'],start:'S',accept:new Set(['F']),transitions:{'S,0':['S','A'],'S,1':['S'],'A,1':['F'],'F,0':['F'],'F,1':['F']},positions:{S:[0,0],A:[3,0],F:[1.5,2.6]}},
 ends_01:{kind:'nfa',key:'ends_01',name:"NFA · '01' ile biter",description:'Son iki sembolün 01 olmasını nondeterministik dallanmayla test eder.',alphabet:['0','1'],states:['S','A','F'],start:'S',accept:new Set(['F']),transitions:{'S,0':['S','A'],'S,1':['S'],'A,1':['F']},positions:{S:[0,0],A:[3,0],F:[1.5,2.6]}}
};
export function runDfa(definition,inputStr){let state=definition.start;const trace=[[state]];for(const ch of inputStr){if(!definition.alphabet.includes(ch))return{accepted:false,finalStates:[state],invalidChar:ch,trace};state=definition.transitions[`${state},${ch}`];trace.push([state]);}return{accepted:definition.accept.has(state),finalState:state,finalStates:[state],invalidChar:null,isEmptyInput:inputStr==='',trace};}
export function runNfa(definition,inputStr){let states=new Set([definition.start]);const trace=[[...states]];for(const ch of inputStr){if(!definition.alphabet.includes(ch))return{accepted:false,finalStates:[...states],invalidChar:ch,trace};const next=new Set();for(const s of states)for(const dst of definition.transitions[`${s},${ch}`]??[])next.add(dst);states=next;trace.push([...states]);}return{accepted:[...states].some(s=>definition.accept.has(s)),finalStates:[...states],invalidChar:null,isEmptyInput:inputStr==='',trace};}
export const runAutomaton=(definition,input)=>definition.kind==='nfa'?runNfa(definition,input):runDfa(definition,input);

export function buildAutomaton({ kind, statesText, alphabetText, start, acceptText, transitionsText }) {
 const states=[...new Set(statesText.split(/[\s,]+/).filter(Boolean))];
 const alphabet=[...new Set(alphabetText.split(/[\s,]+/).filter(Boolean))];
 if(states.length<1)throw new Error('En az bir durum gerekli.');
 if(alphabet.length<1)throw new Error('En az bir alfabe sembolü gerekli.');
 if(!states.includes(start))throw new Error('Başlangıç durumu, durumlar listesinde olmalı.');
 const accept=new Set(acceptText.split(/[\s,]+/).filter(Boolean));
 for(const state of accept)if(!states.includes(state))throw new Error(`Bilinmeyen kabul durumu: ${state}.`);
 const transitions={};
 for(const raw of transitionsText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)){
  const match=raw.match(/^([^,\s]+)\s*[,\s]\s*([^\s]+)\s*(?:->|→)\s*(.+)$/);
  if(!match)throw new Error(`Geçersiz geçiş: ${raw}. Q0,0 -> Q1 biçimini kullan.`);
  const[,src,symbol,destText]=match;
  if(!states.includes(src))throw new Error(`Bilinmeyen kaynak durum: ${src}.`);
  if(!alphabet.includes(symbol))throw new Error(`Alfabede olmayan sembol: ${symbol}.`);
  const destinations=destText.split(/[|,\s]+/).filter(Boolean);
  if(!destinations.length||destinations.some(dst=>!states.includes(dst)))throw new Error(`Geçersiz hedef: ${destText}.`);
  if(kind==='dfa'&&destinations.length!==1)throw new Error('DFA geçişi tek bir hedefe gitmeli.');
  transitions[`${src},${symbol}`]=kind==='nfa'?destinations:destinations[0];
 }
 if(kind==='dfa')for(const state of states)for(const symbol of alphabet)if(!transitions[`${state},${symbol}`])throw new Error(`Eksik DFA geçişi: ${state},${symbol}.`);
 const positions={};computePositions(states).forEach(([state,pos])=>{positions[state]=pos});
 return{kind,key:'custom',name:`Özel ${kind.toUpperCase()}`,description:'Kullanıcı tarafından oluşturulan otomata.',alphabet,states,start,accept,transitions,positions};
}

function computePositions(states){return states.map((state,index)=>{const angle=2*Math.PI*index/states.length-Math.PI/2;return[state,[1.5+1.5*Math.cos(angle),1.5+1.5*Math.sin(angle)]]});}
