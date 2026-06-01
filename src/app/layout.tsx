import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Script from 'next/script';
import { UnionAMLanguageProvider, type UnionAMLanguage } from '@unionam/shared-i18n';
import './globals.css';

export const metadata: Metadata = {
  title: '联泰科技3D打印工具站',
  description: '模型本地解析计算，避免数据泄露。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const language = cookies().get('unionam.language')?.value === 'en' ? 'en' : 'zh';

  return (
    <html lang={language === 'en' ? 'en' : 'zh-CN'}>
      <body>
        <Script defer src="https://cloud.umami.is/script.js" data-website-id="05e5f00c-82a3-4dcf-9d5a-b50f434eb92e" />
        <UnionAMLanguageProvider initialLanguage={language as UnionAMLanguage}>{children}</UnionAMLanguageProvider>
      </body>
    </html>
  );
}
