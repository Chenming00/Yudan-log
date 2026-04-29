import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '鱼蛋小账本',
  description: '记录每一笔收支，轻松管理个人财务',
  alternates: {
    canonical: '/ledger',
  },
  openGraph: {
    type: 'website',
    title: '鱼蛋小账本',
    description: '记录每一笔收支，轻松管理个人财务',
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
