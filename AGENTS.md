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
- Roles: business roles map to legacy permission levels via public.effective_role / effectiveRole(); DB policies and PERM check the effective level, UI shows the real role — so permissions live in one place.
- Fleet identifiers and hour readings retain legacy database column names; shared fleet field definitions keep creation and editing consistent without breaking deployed consumers.
- Audit authorization uses the registered role rather than the effective permission level in both UI and restrictive RLS, so equivalent full-access roles cannot inherit audit access.
- Admin edits of user phone numbers use an authenticated server function with an organization-scoped member lookup before privileged profile writes, preventing cross-organization changes.
- Invites: links are /convite/<token> on the published URL (src/lib/invite-token.ts), only the SHA-256 hash is stored, and the account is created on password submit — never use one-time auth links (generateLink/inviteUserByEmail), because mail/WhatsApp link previews consume them.
