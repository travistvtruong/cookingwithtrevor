import Image from "next/image";
import type { GalleryPhoto } from "@/lib/gallery";

// The extra photos under a post. Each opens the full-size image.
export function PhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  if (photos.length === 0) return null;

  return (
    <section aria-labelledby="photos-heading" className="mt-10">
      <h2 id="photos-heading" className="text-2xl font-extrabold tracking-tight text-ink">
        Photos
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <li key={p.url}>
            <figure>
              <a
                href={p.url}
                target="_blank"
                rel="noopener"
                className="relative block aspect-square overflow-hidden rounded-xl bg-stone-100"
              >
                <Image
                  src={p.url}
                  alt={p.caption || `${title}: photo ${i + 1}`}
                  fill
                  sizes="(min-width: 768px) 240px, calc(50vw - 22px)"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </a>
              {p.caption && <figcaption className="mt-1.5 text-sm text-stone-600">{p.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
