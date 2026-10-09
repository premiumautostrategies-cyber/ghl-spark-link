import { createFileRoute } from "@tanstack/react-router";
import { ProductShowcase, productShots, PRODUCT_PAGES, marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/for-sales")({ head: () => marketingHead("Sales — Systemize automotive shop software", "See Systemize sales in action: dynamic lead prioritization, customer conversations, quoting and interactive proposals for restyling shops."), component: SalesShowcase });
function SalesShowcase() {
  return <ProductShowcase category="Sales" title="Sales. From first enquiry to booked work." intro="Know who needs a response, build the right quote, and carry every detail forward to the shop floor." image={productShots.sales} imageTitle="Dynamic Pipeline" caption="Real pipeline, sample shop: new enquiries, active conversations, quotes and decisions in one workspace."
    outcomes={[
      { title: "Work the right lead next", body: "See new enquiries, customer replies and follow-ups through Dynamic Pipeline or the prioritized Dynamic Activity workspace." },
      { title: "Quote while you talk", body: "Bring the service catalog, options, custom line items, discounts and deposits into the same customer conversation." },
      { title: "Keep the handoff connected", body: "Interactive proposals, approval, payment logging and scheduling stay linked to the customer and vehicle." },
    ]}
    secondary={{ image: productShots.messages, imageTitle: "Messages & quote builder", title: "The conversation and the quote. Side by side.", body: "Customer history on the left. Text and email in the middle. Your quote on the right. No rebuilding the context every time someone replies.", points: ["Customer, vehicle and opportunity context", "Service options and instant quote totals", "AI-assisted conversation summaries"] }} next={PRODUCT_PAGES[1]} />;
}
