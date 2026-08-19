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
