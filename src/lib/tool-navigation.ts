import type { ToolHeaderNavItem } from '@unionam/shared-ui';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export type ToolNavigationKey = 'quote' | 'converter' | 'gift' | 'crm';

type ToolNavigationLabels = Pick<Dictionary, 'navQuote' | 'navConverter' | 'navGift' | 'navCrm'>;

export function createToolNavigation(labels: ToolNavigationLabels, active?: ToolNavigationKey): ToolHeaderNavItem[] {
  return [
    { label: labels.navQuote, href: '/quote', active: active === 'quote' },
    { label: labels.navConverter, href: '/converter', active: active === 'converter' },
    { label: labels.navGift, href: '/gift', active: active === 'gift' },
    { label: labels.navCrm, href: '/crm/', active: active === 'crm' },
  ];
}
