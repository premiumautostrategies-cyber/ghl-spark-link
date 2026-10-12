import { Link } from "@tanstack/react-router";
import { MarketingLayout, MarketingHero } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
export function MarketingDraft({ category, title, body }: { category: string; title: string; body: string }) { return <MarketingLayout><MarketingHero eyebrow={`VELTRIX / ${category}`} title={title} body={body}/><section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><p className="veltrix-label text-primary">PREVIEW / NOT YET AVAILABLE</p><p className="mt-4 max-w-xl text-muted-foreground">This page is a draft. No information is submitted, no account is created, and no booking or purchase is completed here.</p><Button asChild variant="outline" className="mt-8"><Link to="/features">Explore the product <ArrowRight className="size-4"/></Link></Button></section></MarketingLayout>; }
