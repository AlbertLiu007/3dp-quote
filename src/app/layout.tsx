import type { Metadata } from 'next';
import { cookies } from 'next/headers';
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
        <UnionAMLanguageProvider initialLanguage={language as UnionAMLanguage}>
          {children}
          <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500 print:hidden">
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#0b4f9c]"
            >
              隐私政策 / Privacy Policy
            </a>
          </footer>
        </UnionAMLanguageProvider>
      </body>
    </html>
  );
}
