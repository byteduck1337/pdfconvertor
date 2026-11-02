export const SENTENCES = [
  { jp: ['私', 'は', '学生', 'です'], en: 'I am a student' },
  { jp: ['猫', 'が', '好き', 'です'], en: 'I like cats' },
  { jp: ['東京', 'に', '行きます'], en: 'I go to Tokyo' },
  { jp: ['本', 'を', '読みます'], en: 'I read a book' },
  { jp: ['今日', 'は', '暑い', 'です'], en: 'Today is hot' }
];

export const VERBS = [
  { dict: '食べる', hint: 'Polite form', ans: '食べます' },
  { dict: '飲む', hint: 'Past tense', ans: '飲んだ' },
  { dict: '行く', hint: 'Negative form', ans: '行かない' },
  { dict: '見る', hint: 'Polite form', ans: '見ます' },
  { dict: 'する', hint: 'Past tense', ans: 'した' }
];

export const READING_TEXT = {
  text: '私は毎日日本語を勉強します。東京は大きい都市です。',
  words: {
    '私': { romaji: 'watashi', mean: 'I, me' },
    '毎日': { romaji: 'mainichi', mean: 'every day' },
    '日本語': { romaji: 'nihongo', mean: 'Japanese language' },
    '勉強': { romaji: 'benkyou', mean: 'study' },
    '東京': { romaji: 'toukyou', mean: 'Tokyo' },
    '大きい': { romaji: 'ookii', mean: 'big, large' },
    '都市': { romaji: 'toshi', mean: 'city' }
  }
};