import { FileLock2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { box: 'h-7 w-7', icon: 'h-4 w-4' },
  md: { box: 'h-8 w-8', icon: 'h-4 w-4' },
  lg: { box: 'h-10 w-10', icon: 'h-5 w-5' },
};

export default function LocalPdfLogoMark({ size = 'sm', className, iconClassName }) {
  const s = SIZES[size] ?? SIZES.sm;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        s.box,
        className,
      )}
      aria-hidden
    >
      <FileLock2 className={cn(s.icon, iconClassName)} />
    </span>
  );
}
