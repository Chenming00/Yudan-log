import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '鱼蛋小账本',
  description: '记录每一笔支出，轻松管理日常花费',
  alternates: {
    canonical: '/ledger',
  },
  openGraph: {
    type: 'website',
    title: '鱼蛋小账本',
    description: '记录每一笔支出，轻松管理日常花费',
    url: '/ledger',
  },
};

export default function LedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
