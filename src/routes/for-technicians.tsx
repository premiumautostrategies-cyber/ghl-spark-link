import { createFileRoute } from "@tanstack/react-router";
import { ProductShowcase, productShots, PRODUCT_PAGES, marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/for-technicians")({ head: () => marketingHead("Technician workspace — Systemize", "Explore the phone-first Systemize technician experience: assigned work, check-in, inspection, photos, optional progress and bundled completion for QC."), component: TechnicianShowcase });
function TechnicianShowcase() {
  return <ProductShowcase category="Technicians" title="Technicians. The work order, not the busywork." intro="Open the job. Read what matters. Do the work. Return when you're ready to document and hand it off." image={productShots.tech} imageTitle="Installer work order" caption="An actual installer work order: vehicle, service, bay, due time, instructions and phase status."
    outcomes={[
      { title: "Your work, ready to go", body: "Clock in and see your assigned schedule. Open a vehicle to find its services, instructions, product details and recorded condition." },
      { title: "Document on your terms", body: "Update a checklist as you work or finish it in one pass. Add camera or library photos, notes and issues without constant interruptions." },
      { title: "A clear QC handoff", body: "Submit completed work for review. Sales and managers receive the handoff; correction notes return to the same job if it needs attention." },
    ]}
    secondary={{ image: productShots.techList, imageTitle: "My Work · completed jobs", title: "A workday that starts with your schedule.", body: "Today, upcoming work and completed jobs stay easy to find. Designed for phones and iPads first, with the same work order available on desktop.", points: ["Clock-in and assigned job schedule", "Check-in, inspection, prep and installation", "One bundled completion review before QC"] }} next={PRODUCT_PAGES[2]} />;
}
