import { InputHTMLAttributes } from 'react';

export function Input({ label, className='', ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm mb-1 opacity-80">{label}</span>}
      <input {...props} className={['w-full p-2 rounded bg-white/10', className].join(' ')} />
    </label>
  );
}
