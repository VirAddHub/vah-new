import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid'|'ghost' };

export function Button({ className='', variant='solid', ...props }: Props) {
  const base = 'px-4 py-2 rounded transition';
  const solid = 'bg-blue-600 hover:bg-blue-500 text-white';
  const ghost = 'bg-white/10 hover:bg-white/20 text-white';
  const cls = [base, variant==='solid'?solid:ghost, className].join(' ');
  return <button {...props} className={cls} />;
}
