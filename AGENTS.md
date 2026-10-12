<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public product showcases use separate marketing routes and a shared screenshot/viewer component; keep operational routes unchanged so marketing changes cannot alter shop workflows.
- Marketing screenshot media uses CDN asset pointers captured from sample shop screens, keeping the source repository small and avoiding live private customer data in public pages.
- Public sales previews reuse the mock Dynamic Activity interface with isolated local state; source and workspace selectors must never mutate the shop configuration or initiate CRM connections.
- VELTRIX marketing styles, fonts and favicon are scoped to MarketingLayout and public leaf metadata; retain the Systemize root theme and favicon so branding changes cannot alter the operational CRM.
