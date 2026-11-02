export const KANA_DATA = {
  hiragana: {
    vowels: { name: 'Vowels', chars: { 'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o' } },
    k: { name: 'K-row', chars: { 'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko' } },
    s: { name: 'S-row', chars: { 'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so' } },
    t: { name: 'T-row', chars: { 'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to' } },
    n: { name: 'N-row', chars: { 'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no' } },
    h: { name: 'H-row', chars: { 'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho' } },
    m: { name: 'M-row', chars: { 'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo' } },
    y: { name: 'Y-row', chars: { 'や': 'ya', 'ゆ': 'yu', 'よ': 'yo' } },
    r: { name: 'R-row', chars: { 'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro' } },
    w: { name: 'W-row', chars: { 'わ': 'wa', 'を': 'wo', 'ん': 'n' } }
  },
  katakana: {
    vowels: { name: 'Vowels', chars: { 'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o' } },
    k: { name: 'K-row', chars: { 'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko' } },
    s: { name: 'S-row', chars: { 'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so' } },
    t: { name: 'T-row', chars: { 'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to' } },
    n: { name: 'N-row', chars: { 'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no' } },
    h: { name: 'H-row', chars: { 'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho' } },
    m: { name: 'M-row', chars: { 'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo' } },
    y: { name: 'Y-row', chars: { 'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo' } },
    r: { name: 'R-row', chars: { 'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro' } },
    w: { name: 'W-row', chars: { 'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n' } }
  }
};

export const statusOf = (char, charStats) => {
  const st = charStats[char];
  if (!st || st.attempts < 3) return 'gray';
  const acc = st.correct / st.attempts;
  if (acc >= 0.9) return 'green';
  if (acc >= 0.6) return 'yellow';
  return 'red';
};