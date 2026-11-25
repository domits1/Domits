# #3099 Pin the website editor of hosts without multiple properties

Branch: `elite-site-properties-picker-pin`, from `acceptance`. Issue: #3099. Goes before `elite-site-properties-picker`, which adds the Properties section.

No behaviour change. The editor page reads the website plan once and passes the check to its hooks (`useWebsiteEditorSitePages` no longer reads it itself). The new test pins, for a host on Essentials, a plan read that fails or never answers, Elite pages without `website.multi_property`, and a template without the section: the same editor page as before, no new request, and a stored `siteProperties` list saved back as it is.

Result: no blocking findings. The snapshot of the editor page is large; it changes whenever the editor markup changes, which is the point of the pin.
