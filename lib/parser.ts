export interface ParsedTransaction {
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
}

export function parseMessage(text: string): ParsedTransaction | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return null;

  let amount: number | null = null;
  let type: 'expense' | 'income' = 'expense';
  const remainingWords: string[] = [];

  for (const word of words) {
    const num = parseFloat(word);
    if (!isNaN(num) && amount === null) {
      amount = num;
    } else if (word.toLowerCase() === 'income' || word === '收入') {
      type = 'income';
    } else if (word.toLowerCase() === 'expense' || word === '支出') {
      type = 'expense';
    } else {
      remainingWords.push(word);
    }
  }

  if (amount === null) return null;

  const note = remainingWords.join(' ') || 'Uncategorized';
  
  return {
    amount,
    note,
    category: remainingWords[0] || 'other',
    type,
  };
}
