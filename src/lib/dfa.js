// DFA (Sonlu Otomata) mantığı — Python simumath_core.py'deki run_dfa/DFA_REGISTRY'nin
// birebir JS portu. Qt/React'ten bağımsız, saf fonksiyonlar.

function buildEndsWithOne() {
  const transitions = {
    'Q0,0': 'Q0', 'Q0,1': 'Q1',
    'Q1,0': 'Q0', 'Q1,1': 'Q1',
  };
  return {
    key: 'ends_with_one',
    name: "'1' ile biten diller",
    description: "İkili string son karakteri '1' ise kabul edilir.",
    alphabet: ['0', '1'],
    states: ['Q0', 'Q1'],
    start: 'Q0',
    accept: new Set(['Q1']),
    transitions,
    positions: { Q0: [0, 0], Q1: [3, 0] },
  };
}

function buildEvenNumberOfOnes() {
  const transitions = {
    'QEven,0': 'QEven', 'QEven,1': 'QOdd',
    'QOdd,0': 'QOdd', 'QOdd,1': 'QEven',
  };
  return {
    key: 'even_ones',
    name: "Çift sayıda '1' içeren diller",
    description: "Stringdeki toplam '1' sayısı çift ise kabul edilir (boş string dahil).",
    alphabet: ['0', '1'],
    states: ['QEven', 'QOdd'],
    start: 'QEven',
    accept: new Set(['QEven']),
    transitions,
    positions: { QEven: [0, 0], QOdd: [3, 0] },
  };
}

function buildContains00() {
  const transitions = {
    'Q0,0': 'Q1', 'Q0,1': 'Q0',
    'Q1,0': 'Q2', 'Q1,1': 'Q0',
    'Q2,0': 'Q2', 'Q2,1': 'Q2',
  };
  return {
    key: 'contains_00',
    name: "'00' alt-dizisini içeren diller",
    description: "String herhangi bir yerinde ardışık iki '0' içeriyorsa kabul edilir.",
    alphabet: ['0', '1'],
    states: ['Q0', 'Q1', 'Q2'],
    start: 'Q0',
    accept: new Set(['Q2']),
    transitions,
    positions: { Q0: [0, 0], Q1: [3, 0], Q2: [1.5, 2.6] },
  };
}

function buildDivisibleByThree() {
  const transitions = {};
  for (let r = 0; r < 3; r++) {
    transitions[`Q${r},0`] = `Q${(2 * r) % 3}`;
    transitions[`Q${r},1`] = `Q${(2 * r + 1) % 3}`;
  }
  return {
    key: 'divisible_by_three',
    name: "3'e bölünen ikili sayılar",
    description: "İkili gösterimi 3'e tam bölünen sayılar kabul edilir (boş string = 0, kabul).",
    alphabet: ['0', '1'],
    states: ['Q0', 'Q1', 'Q2'],
    start: 'Q0',
    accept: new Set(['Q0']),
    transitions,
    positions: { Q0: [1.5, 2.6], Q1: [0, 0], Q2: [3, 0] },
  };
}

export const DFA_REGISTRY = {
  ends_with_one: buildEndsWithOne(),
  even_ones: buildEvenNumberOfOnes(),
  contains_00: buildContains00(),
  divisible_by_three: buildDivisibleByThree(),
};

/**
 * Bir DFA tanımını inputStr üzerinde çalıştırır.
 * @returns {{accepted: boolean, finalState: string, invalidChar: string|null, isEmptyInput: boolean, trace: string[]}}
 */
export function runDfa(definition, inputStr) {
  let state = definition.start;
  const trace = [state];

  for (const char of inputStr) {
    if (!definition.alphabet.includes(char)) {
      return { accepted: false, finalState: state, invalidChar: char, isEmptyInput: false, trace };
    }
    state = definition.transitions[`${state},${char}`];
    trace.push(state);
  }

  const accepted = definition.accept.has(state);
  return { accepted, finalState: state, invalidChar: null, isEmptyInput: inputStr === '', trace };
}
