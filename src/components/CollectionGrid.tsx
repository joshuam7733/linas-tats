'use client';

import { useState } from 'react';
import { CATEGORIES, designDataUrl, designs, INK, type CategoryId } from '@/lib/designs';
import TryDesignButton from './TryDesignButton';

/** The flash collection, filterable by style. */
export default function CollectionGrid() {
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const shown = category === 'all' ? designs : designs.filter((d) => d.category === category);

  return (
    <>
      <div className="no-scrollbar -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by style">
        {[{ id: 'all' as const, label: 'All' }, ...CATEGORIES].map((c) => (
          <button key={c.id} type="button" className="chip-tab !min-h-11 !px-5" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
            <span className="ml-1.5 opacity-50">{c.id === 'all' ? designs.length : designs.filter((d) => d.category === c.id).length}</span>
          </button>
        ))}
      </div>
      <ul key={category} className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {shown.map((d, i) => (
          <li key={d.id} className="flash-card" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
            <div className="group flex h-full flex-col">
              <div className="flash-card-art relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[20px] bg-bone">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={designDataUrl(d, INK)}
                  alt={`${d.name}, ${d.style.toLowerCase()} sample design`}
                  className={`${d.image ? 'h-[78%] w-[86%]' : 'h-[62%] w-[70%]'} object-contain transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:rotate-[-2deg] group-hover:scale-[1.06]`}
                  loading="lazy"
                />
                <span className="label absolute left-4 top-4 !text-[0.625rem] !text-ink-950/50">
                  {CATEGORIES.find((c) => c.id === d.category)?.label}
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-bone">{d.name}</h3>
                  <p className="label mt-1 !text-[0.625rem]">{d.style}</p>
                </div>
                <TryDesignButton designId={d.id} name={d.name} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
