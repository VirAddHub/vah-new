import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Your details', 'Your company', 'Payment'] as const;

/** Header for every signup step: back link, three-step progress line, title and lede. */
export function SignupProgress({ current, title, lede, onBack, backDisabled }: {
    current: 1 | 2 | 3;
    title: string;
    lede?: React.ReactNode;
    onBack?: () => void;
    backDisabled?: boolean;
}) {
    return (
        <header className="mb-10">
            {onBack && (
                <button type="button" onClick={onBack} disabled={backDisabled}
                    className="-ml-2 mb-8 inline-flex h-10 items-center gap-2 rounded-full px-2 text-[14px] text-graphite hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-40">
                    <ArrowLeft className="h-4 w-4" aria-hidden /> Back
                </button>
            )}
            <ol className="flex items-center gap-2" aria-label="Signup progress">
                {STEPS.map((label, i) => {
                    const n = i + 1; const done = n < current; const here = n === current;
                    return (
                        <li key={label} className="flex flex-1 items-center gap-2" aria-current={here ? 'step' : undefined}>
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold',
                                done ? 'border-ink bg-ink text-paper' : here ? 'border-ink text-ink' : 'border-line text-slate')}>
                                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
                                <span className="sr-only">{done ? ' (done)' : here ? ' (current)' : ''}</span>
                            </span>
                            <span className={cn('hidden text-[13px] sm:inline', here ? 'font-medium text-ink' : 'text-slate')}>{label}</span>
                            {n < STEPS.length && <span className={cn('h-px flex-1', done ? 'bg-ink' : 'bg-line')} aria-hidden />}
                        </li>
                    );
                })}
            </ol>
            <p className="mt-8 text-[13px] text-slate sm:hidden">Step {current} of 3 · {STEPS[current - 1]}</p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:mt-8 sm:text-[40px] sm:tracking-[-0.045em]">{title}</h1>
            {lede && <p className="mt-3 max-w-xl text-[16px] text-graphite">{lede}</p>}
        </header>
    );
}
