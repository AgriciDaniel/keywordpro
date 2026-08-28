import { Loader2Icon } from 'lucide-react';

export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <Loader2Icon className="my-32 mx-auto size-6 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
