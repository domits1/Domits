const GREEN = "#0d9813";

const STYLE = [
  "*,*::before,*::after{box-sizing:border-box}",
  "body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:#fff;color:#111;overflow-wrap:anywhere;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Fira Sans','Droid Sans','Helvetica Neue',sans-serif}",
  "a{color:inherit}",
  `a:focus-visible{outline:2px solid ${GREEN};outline-offset:2px}`,
  "img{max-width:100%}",
  "ol,ul{list-style:none;margin:0;padding:0}",
  ".site-header{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem 1rem;padding:.875rem clamp(1rem,4vw,2.5rem);background:#fff;box-shadow:0 2px 6px rgba(13,26,38,.15)}",
  `.brand{display:flex;align-items:center;gap:.5rem;color:${GREEN};font-size:1.75rem;font-weight:700;text-decoration:none}`,
  ".brand img{width:2.25rem;height:2.25rem}",
  ".site-nav{display:flex;flex-wrap:wrap;gap:.5rem}",
  ".site-nav a{padding:.75rem 1rem;border-radius:12px;background:#f5f5f5;font-size:1.125rem;text-decoration:none}",
  ".site-nav a:hover{background:#ececec}",
  "main{flex:1;width:100%;max-width:75rem;margin:0 auto;padding:clamp(1rem,4vw,2.5rem)}",
  "h1{margin:0 0 .5rem;font-size:clamp(1.75rem,1.25rem + 2vw,2.5rem);font-weight:600}",
  "h2{margin:2rem 0 1rem;font-size:1.5rem;font-weight:600}",
  ".intro,.count,.place{color:#6b7280}",
  ".breadcrumbs{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.5rem}",
  ".breadcrumbs li+li::before{content:'/';margin-right:.5rem;color:#9ca3af}",
  `.breadcrumbs a,h2 a{color:${GREEN};text-decoration:none}`,
  ".breadcrumbs a:hover,h2 a:hover{text-decoration:underline}",
  ".children ul,.listings ul{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))}",
  ".children li{position:relative;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:.25rem .75rem;padding:.875rem 1rem;border:1px solid #e5e7eb;border-radius:12px}",
  ".children li a{font-weight:500;text-decoration:none}",
  ".children li a::after{content:'';position:absolute;inset:-1px;border-radius:12px}",
  `.children li a:hover::after{box-shadow:inset 0 0 0 2px ${GREEN};background:rgba(13,152,19,.09)}`,
  ".listings ul{gap:1.5rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))}",
  ".listing a{display:grid;grid-template-columns:minmax(0,1fr);height:100%;padding-bottom:1rem;border-radius:16px;overflow:hidden;background:#fff;text-decoration:none;transition:.3s}",
  ".listing a:hover{transform:translateY(-6px);box-shadow:0 12px 30px rgba(0,0,0,.12)}",
  ".listing img,.listing .photo{grid-area:1/1;width:100%;aspect-ratio:4/3;object-fit:cover;background:rgba(13,152,19,.09)}",
  ".listing h3{grid-area:1/1;align-self:end;justify-self:center;width:calc(90% - 30px);margin:0 0 25px;padding:12px 14px;border-radius:16px;background:#374151;color:#fff;font-size:1rem;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".listing a:hover h3{background:rgba(13,152,20,.8)}",
  ".place,.price{margin:0;padding:0 1rem}",
  ".place{margin-top:.875rem;font-size:.875rem}",
  `.price{margin-top:.5rem;color:${GREEN};font-size:1.125rem;font-weight:600}`,
  ".notice{text-align:center;padding-top:clamp(3rem,10vw,6rem)}",
  `.notice a{display:inline-block;padding:.75rem 1.25rem;border-radius:12px;background:${GREEN};color:#fff;font-weight:500;text-decoration:none}`,
  ".site-footer{margin-top:2rem;background:#f8f8f8}",
  ".footer-links,.footer-terms{max-width:75rem;margin:0 auto;padding:2rem clamp(1rem,4vw,2.5rem) 1rem}",
  ".footer-links{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))}",
  `.site-footer h2{margin:0 0 .5rem;color:${GREEN};font-size:1.5rem;font-weight:400}`,
  ".site-footer a{color:#000;font-weight:300;line-height:1.5;text-decoration:none}",
  ".site-footer a:hover{text-decoration:underline 2px lightgreen}",
  ".footer-terms{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;padding-block:0 1.5rem}",
  `.footer-copyright{margin:0;padding:15px;background:${GREEN};color:#fff;font-weight:300;text-align:center}`,
  "@media (max-width:480px){.brand{font-size:1.375rem;gap:.375rem}.brand img{width:1.75rem;height:1.75rem}.site-nav{gap:.375rem}.site-nav a{padding:.5rem .625rem;font-size:.875rem}}",
].join("");

const FOOTER_GROUPS = [
  {
    title: "Navigation",
    links: [
      ["/why-domits", "Why Domits"],
      ["/how-it-works", "How it works"],
      ["/about", "About us"],
      ["/career", "Careers"],
      ["/contact", "Contact"],
    ],
  },
  {
    title: "Guest",
    links: [
      ["/", "Search and book"],
      ["/helpdesk-guest", "Helpdesk for guests"],
    ],
  },
  {
    title: "Hosts",
    links: [
      ["/landing", "Become a host"],
      ["/helpdesk-host", "Helpdesk for hosts"],
    ],
  },
];

const FOOTER_TERMS = [
  ["/policy", "Privacy policy"],
  ["/terms", "Terms and Conditions"],
  ["/disclaimers", "Disclaimer"],
  ["/sitemap.xml", "Sitemap"],
];

const renderLink = ([href, label]) => `<a href="${href}">${label}</a>`;

const renderFooterGroup = ({ title, links }) =>
  `<div><h2>${title}</h2><ul>${links.map((link) => `<li>${renderLink(link)}</li>`).join("")}</ul></div>`;

const HEADER =
  '<header class="site-header"><a class="brand" href="/"><img src="/logo.svg" alt="" width="36" height="36">Domits</a><nav class="site-nav" aria-label="Main"><a href="/destinations">Destinations</a><a href="/landing">Become a host</a></nav></header>';

const FOOTER = `<footer class="site-footer"><nav class="footer-links" aria-label="Footer">${FOOTER_GROUPS.map(renderFooterGroup).join("")}</nav><div class="footer-terms">${FOOTER_TERMS.map(renderLink).join("")}</div><p class="footer-copyright">Rights reserved, Domits.com</p></footer>`;

export const renderDestinationDocument = ({ head, main }) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}<style>${STYLE}</style></head><body>${HEADER}${main}${FOOTER}</body></html>\n`;
