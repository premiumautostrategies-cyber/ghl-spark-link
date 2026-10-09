import { createFileRoute } from "@tanstack/react-router";
import { ProductShowcase, productShots, PRODUCT_PAGES, marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/marketing-admin")({ head: () => marketingHead("Marketing & administration — Systemize", "Explore campaign tracking, customer follow-ups, team management, shop setup and repeatable standards in the Systemize automotive prototype."), component: MarketingAdminShowcase });
function MarketingAdminShowcase() {
  return <ProductShowcase category="Marketing & Admin" title="Marketing & Admin. Make the business repeatable." intro="Understand where enquiries come from, keep customer relationships warm, and give your team a consistent way to run the shop." image={productShots.marketing} imageTitle="Ad performance" caption="Prototype campaign tracking: sample spend and lead-source results. Ad accounts are not connected live."
    outcomes={[
      { title: "Compare the sources that matter", body: "Track campaign spend alongside leads and booked revenue. Review channels in a clean comparison table rather than guessing from impressions." },
      { title: "Stay connected after delivery", body: "Organize review requests, warranty check-ins and seasonal follow-ups. The prototype previews these touchpoints without sending live campaigns." },
      { title: "Set the standards once", body: "Bring team roles, service definitions, forms, SOPs, automations and shop setup into the same operating environment." },
    ]}
    secondary={{ image: productShots.team, imageTitle: "Team management", title: "One team. A shared way of working.", body: "Keep employees, specialties and workload visible while shaping the service catalog and standards around how your shop actually operates.", points: ["Team roles, specialties and activity", "Shop setup and location management", "Forms, documents and workflow templates"] }} next={PRODUCT_PAGES[0]} />;
}
