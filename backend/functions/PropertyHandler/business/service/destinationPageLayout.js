const STYLE =
  "body{margin:0;font-family:system-ui,sans-serif;color:#1f2933;background:#fff}main{max-width:72rem;margin:0 auto;padding:clamp(1rem,4vw,3rem)}.breadcrumbs{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;margin:0 0 1.5rem}.breadcrumbs li+li::before{content:'/';margin-right:.5rem;color:#9aa5b1}ul{list-style:none;padding:0}.children ul,.listings ul{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))}.listing img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:.75rem}.listing a{color:inherit;text-decoration:none}.count,.place{color:#52606d}";

export const renderDestinationDocument = ({ head, main }) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}<style>${STYLE}</style></head><body>${main}</body></html>\n`;
