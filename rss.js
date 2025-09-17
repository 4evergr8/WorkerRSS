export function itemsToRss(items, channel) {


    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${channel.title || "无"}</title>
  <link>${channel.link || "无"}</link>
  <description>${channel.description || "无"}</description>
  <image>
    <url>${channel.image}</url>
    <title>${channel.title || "无"}</title>
    <link>${channel.link || "无"}</link>
  </image>`

    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        rss += `
    <item>
      <title>${item.title || "无"}</title>
      <link>${item.link || "无"}</link>
      <description>${item.description || "无"}</description>
      <author>${item.author || "无"}</author>
      <enclosure url="${item.enclosure?.url || "无"}" length="${item.enclosure?.length || "无"}" type="${item.enclosure?.type || "无"}" />
      <guid>${item.link || "无"}</guid>
      <pubDate>${item.pubDate || "无"}</pubDate>
    </item>`
    }

    rss += `
</channel>
</rss>`

    return rss
}
