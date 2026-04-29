export interface Transaction {
  id: string;
  amount: number;
  category: string;
  note: string;
  type: string;
  created_at: string;
  transaction_time: string;
}

export interface TransactionListResponse {
  success: boolean;
  data: Transaction[];
}

export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const res = await fetch('https://cost.ykn.cm/api/list', {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json: TransactionListResponse = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export function formatTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) return '暂无消费记录。';

  const lines = transactions.map((t) => {
    const date = t.transaction_time
      ? new Date(t.transaction_time).toLocaleDateString('zh-CN')
      : '未知日期';
    return `${date} | ${t.category} | ${t.note} | ¥${t.amount}`;
  });

  return lines.join('\n');
}

export function summarizeTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) return '暂无消费数据。';

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const t of transactions) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }

  const sorted = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: ¥${amt.toFixed(2)}`)
    .join('、');

  return `共 ${transactions.length} 笔消费，总支出 ¥${total.toFixed(2)}。分类明细：${sorted}。`;
}
