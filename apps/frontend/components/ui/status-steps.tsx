import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Status as a short black-and-grey step line (e.g. Requested → In progress → Dispatched),
 * used instead of coloured pills. `current` is the index of the latest step reached; -1 = none.
 */
export function StatusSteps({ steps, current, label, orientation = 'horizontal', className }: {
  steps: string[];
  current: number;
  label: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  const vertical = orientation === 'vertical';
  return (
    <ol aria-label={label} className={cn(vertical ? 'space-y-3' : 'flex flex-wrap items-center gap-x-2 gap-y-2', className)}>
      {steps.map((s, i) => {
        const done = i < current; const here = i === current;
        return (
          <li key={s} className="flex items-center gap-2" aria-current={here ? 'step' : undefined}>
            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
              done || here ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-slate')} aria-hidden>
              {done ? <Check className="h-3 w-3" /> : here ? <span className="h-1.5 w-1.5 rounded-full bg-paper" /> : null}
            </span>
            <span className={cn('text-[13px]', here ? 'font-medium text-ink' : done ? 'text-graphite' : 'text-slate')}>
              {s}<span className="sr-only">{done ? ' (done)' : here ? ' (current)' : ' (not yet)'}</span>
            </span>
            {!vertical && i < steps.length - 1 && <span className={cn('h-px w-6', done ? 'bg-ink' : 'bg-line')} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
