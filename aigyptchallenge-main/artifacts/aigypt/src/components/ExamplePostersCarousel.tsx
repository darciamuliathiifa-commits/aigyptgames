import { useEffect, useState } from 'react';

interface ExamplePoster {
  id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
}

export function ExamplePostersCarousel() {
  const [posters, setPosters] = useState<ExamplePoster[]>([]);

  useEffect(() => {
    fetch('/api/example-posters')
      .then(r => r.ok ? r.json() : [])
      .then((data: ExamplePoster[]) => setPosters(data))
      .catch(() => {});
  }, []);

  if (posters.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="font-display font-bold text-xl text-center mb-5">
        Contoh Karyanya Kayak Gini 👇
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
        {posters.map(poster => (
          <div
            key={poster.id}
            className="shrink-0 w-52 snap-start"
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.15)] relative group">
              <img
                src={poster.image_url}
                alt={poster.caption || 'Contoh poster'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            {poster.caption && (
              <p className="text-xs text-muted-foreground text-center mt-2 px-1 leading-relaxed">
                {poster.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
