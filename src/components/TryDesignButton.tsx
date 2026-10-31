'use client';

import { TRY_DESIGN_EVENT } from './preview/events';

export default function TryDesignButton({ designId, name }: { designId: string; name: string }) {
  return (
    <a
      href="#try-on"
      className="label shrink-0 whitespace-nowrap pt-1 !text-bone underline-offset-[6px] hover:underline"
      onClick={() => window.dispatchEvent(new CustomEvent(TRY_DESIGN_EVENT, { detail: designId }))}
      aria-label={`Try ${name} on the 3D body`}
    >
      Try it on
    </a>
  );
}
