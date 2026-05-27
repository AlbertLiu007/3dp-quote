import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '联泰科技3D打印工具站',
  description: '模型本地解析计算，避免数据泄露。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
