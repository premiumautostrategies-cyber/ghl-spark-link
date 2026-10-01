import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/os-ui";
import ppf from "@/assets/cat-ppf.jpg";
import tint from "@/assets/cat-tint.jpg";
import wrap from "@/assets/cat-wrap.jpg";
import ceramic from "@/assets/cat-ceramic.jpg";
import correction from "@/assets/cat-correction.jpg";
import graphics from "@/assets/cat-graphics.jpg";

export const Route = createFileRoute("/_authenticated/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Systemize" },
      { name: "description", content: "Finished work photos from installers and the shop portfolio." },
      { property: "og:title", content: "Gallery — Systemize" },
      { property: "og:description", content: "Finished work photos from installers and the shop portfolio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gallery,
});

const PORTFOLIO = [
  { src: ppf, label: "Paint protection film" },
  { src: tint, label: "Window tint" },
  { src: wrap, label: "Color change wrap" },
  { src: ceramic, label: "Ceramic coating" },
  { src: correction, label: "Paint correction" },
  { src: graphics, label: "Commercial graphics" },
];

function Gallery() {
  const { data: photos = [] } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id,name,file_url,created_at")
        .eq("doc_type", "installer_photo")
        .not("file_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);
      const paths = (data ?? []).map((d) => d.file_url!).filter(Boolean);
      if (!paths.length) return [];
      const { data: signed } = await supabase.storage.from("job-documentation").createSignedUrls(paths, 3600);
      return (signed ?? []).filter((s) => s.signedUrl).map((s) => ({ url: s.signedUrl!, path: s.path ?? "" }));
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Gallery" subtitle="Installer photos from real jobs, plus your shop portfolio." />
      <section className="space-y-2">
        <p className="micro-label">From the shop floor</p>
        {photos.length === 0 ? (
          <Panel className="p-6 text-sm text-muted-foreground">Photos techs add to jobs will show up here.</Panel>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((p) => (
              <a key={p.path} href={p.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-elevated">
                <img src={p.url} alt="Installer photo" className="size-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-2">
        <p className="micro-label">Portfolio</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PORTFOLIO.map((p) => (
            <figure key={p.label} className="overflow-hidden rounded-lg border border-elevated">
              <img src={p.src} alt={p.label} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <figcaption className="px-3 py-2 text-sm">{p.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
