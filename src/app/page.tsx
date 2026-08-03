// Serve the self-contained HTML file via an iframe loading it by URL.
//
// Why iframe with src instead of srcDoc:
//   srcDoc creates a null-origin document, which can block CDN module
//   imports in some browsers. Loading by URL (/determinism.html) gives
//   the iframe the same origin as the page, so module imports work.
//
// Why iframe instead of dangerouslySetInnerHTML:
//   React's hydration strips <script type="module"> tags inserted via
//   dangerouslySetInnerHTML. An iframe creates a separate document
//   context where all scripts execute normally.
//
// The HTML file at public/determinism.html is served by Next.js as a
// static file at /determinism.html.

export default function Page() {
  return (
    <iframe
      src="/determinism.html"
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        display: 'block',
      }}
      title="Xianxia RPG — Determinism & Rendering Prototype"
    />
  );
}
