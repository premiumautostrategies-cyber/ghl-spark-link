export const DOC_CATEGORIES = [
  { key: "warranty", label: "Warranties" },
  { key: "release", label: "Liability & releases" },
  { key: "care_guide", label: "Care instructions" },
  { key: "contract", label: "Agreements" },
  { key: "policy", label: "Shop policies" },
  { key: "checklist", label: "Checklists" },
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number]["key"];

export const docCategoryLabel = (key: string) =>
  DOC_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";

export const STARTER_LIBRARY: {
  name: string;
  doc_type: DocCategory;
  body: string;
}[] = [
  {
    name: "Paint protection film — limited warranty",
    doc_type: "warranty",
    body: `Coverage
This film is warranted against yellowing, cracking, bubbling, peeling and delamination for the term printed on the customer's certificate, together with the workmanship of the installation.

Not covered
Impact damage, rock strikes through the film, improper washing, pressure washing within 50mm of an edge, automated brush washes, paint defects present before installation, and any third-party modification or removal.

Making a claim
Bring the vehicle to the installing location with the certificate number. We inspect the affected panels, photograph them and submit the roll lot numbers to the manufacturer. Approved claims are re-installed at no charge to the customer.`,
  },
  {
    name: "Window film — limited warranty",
    doc_type: "warranty",
    body: `Coverage
Window film is warranted against bubbling, peeling, cracking, adhesive failure and colour change for the term printed on the certificate.

Not covered
Glass breakage, scratches from ice scrapers or abrasive cleaners, damage caused by rolling a window down during the cure period, and film removed or altered by anyone other than this shop.

Care during cure
Leave windows up for 3 to 5 days. Small water pockets and light haze are normal while the film cures and will clear on their own.`,
  },
  {
    name: "Pre-installation liability release",
    doc_type: "release",
    body: `The customer acknowledges the following before work begins.

1. Existing condition. Paint chips, scratches, swirls, prior repaints, failing clear coat and aftermarket bodywork are documented in the vehicle inspection. Film and coatings cannot repair these and may make some defects more visible.
2. Failing paint and repaints. Removing film or badges from repainted or poorly adhered paint can lift it. We do not accept liability for paint that fails during removal on non-factory finishes.
3. Trim and hardware. Some installations require removing badges, trim, mirrors, lights or door panels. Aged clips and adhesives can break; replacement parts are billed at cost.
4. Timing. Estimated completion times assume the vehicle arrives clean and the scope does not change after inspection.

By signing, the customer confirms the inspection was reviewed and authorises the work described on the accepted proposal.`,
  },
  {
    name: "Vehicle storage and key release terms",
    doc_type: "release",
    body: `Vehicles are stored on site for the duration of the booked work. Personal belongings should be removed before drop-off; the shop is not responsible for items left in the vehicle.

Keys are released only after quality control has passed and the balance is settled, unless a written arrangement is in place. Vehicles left more than 5 days after completion may incur daily storage.`,
  },
  {
    name: "Paint protection film — aftercare",
    doc_type: "care_guide",
    body: `First 7 days
Do not wash the vehicle. Edges and seams are still curing. Light haze, small bubbles or faint lifting at an edge is normal and will settle.

Ongoing washing
Hand wash with a pH-neutral soap and two buckets. Rinse from the top down. Keep pressure washers above 40cm from the surface and never aim directly at an edge or seam.

Avoid
Automated brush washes, abrasive polishes, bug and tar removers left to dwell, and parking under sap or heavy bird traffic without prompt cleaning.

Staining
Remove bug splatter, bird droppings and fuel spills as soon as possible with a quick detailer. Left to bake, they can stain the top coat.`,
  },
  {
    name: "Ceramic coating — aftercare",
    doc_type: "care_guide",
    body: `First 7 days
Keep the vehicle dry where possible and out of rain for the first 24 hours. No washing for 7 days while the coating hardens.

Maintenance
Wash every two weeks with a pH-neutral, wax-free soap. Dry with a clean plush towel. Use a dedicated coating maintenance spray, not a wax.

Do not
Use automated washes, polish or clay the coated surface, or apply a wax over the coating — it blocks the hydrophobic behaviour you paid for.`,
  },
  {
    name: "Window tint — aftercare",
    doc_type: "care_guide",
    body: `First 3 to 5 days
Leave windows up. Do not clean the inside of the glass.

Curing
Haze, small water pockets and a slightly cloudy look are part of the drying process and clear on their own, faster in warm weather.

Cleaning
After the cure period, clean with an ammonia-free glass cleaner and a soft microfibre cloth. Never use abrasive pads or ice scrapers on tinted glass.`,
  },
  {
    name: "Vinyl wrap — aftercare",
    doc_type: "care_guide",
    body: `First 7 days
No washing. Adhesive is still setting, particularly in recesses and around edges.

Washing
Hand wash only with a pH-neutral soap. Keep pressure washers above 40cm and away from seams. Dry with a soft towel rather than letting water spot.

Storage and heat
Park in shade or indoors where you can. Prolonged UV and heat shorten the life of the print and can cause edges to lift.`,
  },
  {
    name: "Installation service agreement",
    doc_type: "contract",
    body: `Scope. The work performed is limited to the services and coverage listed on the accepted proposal. Additional panels, correction work or repairs are quoted separately.

Deposit and balance. A deposit reserves the bay and the material for the booked date. The balance is due at completion, before key release.

Rescheduling. Please give at least 48 hours notice. Deposits are transferable to a new date once; late cancellations may forfeit the deposit where material has already been cut.

Warranty. Coverage is described in the warranty document supplied with the certificate for this installation.`,
  },
  {
    name: "Deposit, cancellation and refund policy",
    doc_type: "policy",
    body: `Deposits are between 20% and 50% of the accepted proposal and hold both the bay time and the film.

Reschedules with more than 48 hours notice move the deposit to the new date. Inside 48 hours, or once material is cut or plotted for the vehicle, the material portion of the deposit is non-refundable.

Completed work is not refundable. Warranty claims are handled under the applicable warranty document rather than as refunds.`,
  },
  {
    name: "Vehicle intake checklist",
    doc_type: "checklist",
    body: `1. Photograph all four corners, roof and any existing damage.
2. Record odometer and fuel level.
3. Confirm year, make, model, trim and paint condition against the proposal.
4. Note aftermarket panels, repaints and prior film.
5. Confirm keys, wheel lock key and any accessories received.
6. Have the customer review the inspection and sign the liability release.`,
  },
  {
    name: "Delivery walkthrough checklist",
    doc_type: "checklist",
    body: `1. Quality control passed and signed off by the foreman.
2. Balance settled and receipt issued.
3. Walk the customer around the vehicle in good light.
4. Hand over the warranty certificate with roll lot numbers.
5. Explain the cure period and give the matching care instructions.
6. Confirm the aftercare texts and ask for the review at day 15.`,
  },
];
