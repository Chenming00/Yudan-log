"use client";

import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  amount: number;
  note: string;
  category: string;
  type: 'expense' | 'income';
  transaction_time?: string;
  created_at: string;
}

const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export function CategoryPieChart({ transactions, title }: { transactions: Transaction[]; title: string }) {
  const categoryData = transactions.reduce<Record<string, number>>((groups, t) => {
    const category = t.category || '未分类';
    groups[category] = (groups[category] || 0) + Number(t.amount);
    return groups;
  }, {});

  const data = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card className="border-stone-200/70 bg-white/80 shadow-none">
        <CardContent className="p-6">
          <p className="text-center text-stone-400 text-sm py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200/70 bg-white/80 shadow-none">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 text-center">{title}</h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `¥${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-stone-600 truncate">{item.name}</span>
              <span className="text-stone-400 shrink-0">¥{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryBarChart({ transactions, title }: { transactions: Transaction[]; title: string }) {
  const categoryData = transactions.reduce<Record<string, number>>((groups, t) => {
    const category = t.category || '未分类';
    groups[category] = (groups[category] || 0) + Number(t.amount);
    return groups;
  }, {});

  const data = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <Card className="border-stone-200/70 bg-white/80 shadow-none">
        <CardContent className="p-6">
          <p className="text-center text-stone-400 text-sm py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200/70 bg-white/80 shadow-none">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 text-center">{title}</h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={60}
                tick={{ fontSize: 11, fill: '#78716c' }}
              />
              <Tooltip
                formatter={(value) => `¥${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function DailyTrendChart({ transactions, title }: { transactions: Transaction[]; title: string }) {
  const dailyData = transactions.reduce<Record<string, { expense: number; income: number }>>((groups, t) => {
    const date = new Date(t.transaction_time || t.created_at);
    const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
    if (!groups[dateKey]) {
      groups[dateKey] = { expense: 0, income: 0 };
    }
    if (t.type === 'expense') {
      groups[dateKey].expense += Number(t.amount);
    } else {
      groups[dateKey].income += Number(t.amount);
    }
    return groups;
  }, {});

  const data = Object.entries(dailyData)
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => {
      const [aMonth, aDay] = a.date.split('/').map(Number);
      const [bMonth, bDay] = b.date.split('/').map(Number);
      return new Date(2024, aMonth - 1, aDay).getTime() - new Date(2024, bMonth - 1, bDay).getTime();
    });

  if (data.length === 0) {
    return (
      <Card className="border-stone-200/70 bg-white/80 shadow-none">
        <CardContent className="p-6">
          <p className="text-center text-stone-400 text-sm py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200/70 bg-white/80 shadow-none">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 text-center">{title}</h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#78716c' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} />
              <Tooltip
                formatter={(value) => `¥${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="expense" name="支出" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlyComparisonChart({ monthlyData, title }: { monthlyData: { month: string; income: number; expense: number }[]; title: string }) {
  if (monthlyData.length === 0) {
    return (
      <Card className="border-stone-200/70 bg-white/80 shadow-none">
        <CardContent className="p-6">
          <p className="text-center text-stone-400 text-sm py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200/70 bg-white/80 shadow-none">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 text-center">{title}</h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: '#78716c' }}
              />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} />
              <Tooltip
                formatter={(value) => `¥${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="支出" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}