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

- Expose external AI access through the official MCP server at `/mcp`, authenticated with per-user OAuth so database RLS remains authoritative.

- Keep PDF processing in `PdfTools` shared by public and authenticated routes; persistence-only actions remain behind authentication so visitor files stay ephemeral.

- Keep self-signing local by default; only authenticated users may persist the signed PDF and minimal public verification record, because sensitive evidence must remain private.

- Store PDF placements in visible-page coordinates and transform them using the page rotation only at export, so preview and final output stay aligned.

- Keep system printing and camera/file scan intake installation-free; the Windows localhost connector is optional for direct hardware access, and visitor payloads never go to the backend.

- Share action-specific tool diagrams through ToolIllustration so public catalogs retain consistent visual explanations without duplicated assets.
- Use the shared bounded page-range parser and require complete previews before workbench export, because malformed ranges and partial loads must not silently lose pages.
- Share signed-PDF viewing and download controls through PdfFileAccess; authorize public copies by signed, non-revoked signer token and account copies by owner or verified signer identity, never by a global admin bypass.
