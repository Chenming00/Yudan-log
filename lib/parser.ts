/**
 * 解析 Telegram 消息，提取交易信息
 * 
 * 支持的消息格式：
 * - "支出 50 餐饮 午餐" -> { type: 'expense', amount: 50, category: '餐饮', note: '午餐' }
 * - "收入 1000 工资 本月工资" -> { type: 'income', amount: 1000, category: '工资', note: '本月工资' }
 * - "花 50 餐饮" -> { type: 'expense', amount: 50, category: '餐饮', note: '' }
 * - "收 100 其他" -> { type: 'income', amount: 100, category: '其他', note: '' }
 */
export interface ParsedTransaction {
  amount: number;
  category?: string;
  note?: string;
  type: 'income' | 'expense';
  transaction_time?: string;
}

export function parseMessage(text: string): ParsedTransaction | null {
  const trimmed = text.trim();
  
  // 匹配支出类消息
  // 格式：支出/花 [金额] [类别] [备注]
  const expensePatterns = [
    /^支出\s+(\d+(?:\.\d+)?)\s*(\S+)?\s*(.*)?$/,
    /^花\s+(\d+(?:\.\d+)?)\s*(\S+)?\s*(.*)?$/,
  ];
  
  for (const pattern of expensePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        type: 'expense',
        amount: Number(match[1]),
        category: match[2] || '其他',
        note: match[3] || '',
        transaction_time: new Date().toISOString(),
      };
    }
  }
  
  // 匹配收入类消息
  // 格式：收入/收 [金额] [类别] [备注]
  const incomePatterns = [
    /^收入\s+(\d+(?:\.\d+)?)\s*(\S+)?\s*(.*)?$/,
    /^收\s+(\d+(?:\.\d+)?)\s*(\S+)?\s*(.*)?$/,
  ];
  
  for (const pattern of incomePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        type: 'income',
        amount: Number(match[1]),
        category: match[2] || '其他',
        note: match[3] || '',
        transaction_time: new Date().toISOString(),
      };
    }
  }
  
  return null;
}