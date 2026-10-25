import { createFileRoute } from "@tanstack/react-router";
import { ProductShowcase, productShots, PRODUCT_PAGES, marketingHead } from "@/components/product-showcase";
export const Route = createFileRoute("/for-operations")({ head: () => marketingHead("Shop operations — Velotri", "See Velotri operations: bay and mobile scheduling, team workload, payment records, revenue by service and a connected quality-control handoff."), component: OperationsShowcase });
function OperationsShowcase() {
  return <ProductShowcase category="Operations" title="Operations. A clear picture of the whole shop." intro="See what is booked, who is working, what is ready and where the business stands—without chasing separate records." image={productShots.operations} imageTitle="Shop reports" caption="Sample shop performance: collected revenue, outstanding balances, service mix and installer output."
    outcomes={[
      { title: "Plan against real capacity", body: "View booked duration, technicians and resources on the calendar. Shop bays and mobile vans stay distinct, with conflicts visible." },
      { title: "Follow the money clearly", body: "Compare recorded payments, invoices and outstanding balances. See performance by service and installer without turning your shop into an accounting screen." },
      { title: "Close the loop on every job", body: "QC review, readiness, remaining balance and delivery stay connected to the original sale. The handoff has a history, not just a status." },
    ]}
    secondary={{ image: productShots.schedule, imageTitle: "Shop calendar", title: "A schedule that reflects the work.", body: "A quick tint appointment and a multi-day wrap are not the same booking. See the customer, vehicle, service and assigned resource together.", points: ["Day, week and month views", "Shop and on-site appointments", "Connected customer and vehicle records"] }} next={PRODUCT_PAGES[3]} />;
}
