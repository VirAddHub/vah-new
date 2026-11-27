// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { PlansPage } from '../components/PlansPage';
import { HowItWorks } from '../components/marketing/HowItWorks';
const state = vi.hoisted(() => ({
  monthlyPrice: 12.34 as number | null,
  annualPrice: 120 as number | null,
  loading: false,
  error: null as string | null,
}));
vi.mock('../hooks/usePlans', () => ({ usePricing: () => state }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
beforeEach(() =>
  Object.assign(state, { monthlyPrice: 12.34, annualPrice: 120, loading: false, error: null }),
);
const pricing = () => renderToStaticMarkup(<PlansPage onNavigate={vi.fn()} />);
it('renders both authoritative prices and derives precise savings and equivalent cost', () => {
  const html = pricing();
  expect(html).toContain('£12.34');
  expect(html).toContain('£120.00');
  expect(html).toContain('£10.00');
  expect(html).toContain('£28.08');
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html.match(/<button/g)).toHaveLength(2);
});
it('does not claim savings when annual costs more', () => {
  state.annualPrice = 200;
  const html = pricing();
  expect(html).not.toContain('BETTER VALUE');
  expect(html).not.toContain('Save £');
});
it('does not invent missing prices and disables only the unavailable option', () => {
  state.annualPrice = null;
  let html = pricing();
  expect(html.match(/disabled=""/g)).toHaveLength(1);
  expect(html).not.toContain('Save £');
  state.monthlyPrice = null;
  html = pricing();
  expect(html.match(/disabled=""/g)).toHaveLength(2);
  expect(html).not.toContain('£0.00');
});
it('retains the two existing signup billing values', () => {
  const nav = vi.fn();
  const tree = PlansPage({ onNavigate: nav });
  const buttons: React.ReactElement<{ onClick: () => void }>[] = [];
  function visit(node: React.ReactNode) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const item = child as React.ReactElement<{ children?: React.ReactNode; onClick: () => void }>;
      if (item.type === 'button') buttons.push(item);
      visit(item.props.children);
    });
  }
  visit(tree);
  buttons[0].props.onClick();
  expect(nav).toHaveBeenLastCalledWith('signup', { initialBilling: 'monthly' });
  buttons[1].props.onClick();
  expect(nav).toHaveBeenLastCalledWith('signup', { initialBilling: 'annual' });
});
it('shows four meaningful stages without exposing the service address', () => {
  const html = renderToStaticMarkup(<HowItWorks />);
  for (const id of ['choose', 'setup', 'address', 'post']) expect(html).toContain(`id="${id}"`);
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain('FICTIONAL DATA');
  expect(html).toContain('payment alone does not activate');
  expect(html).not.toMatch(/Tanner|SE1\s*3PH|54[–-]58/);
  expect(html).toContain('href="/pricing"');
});
