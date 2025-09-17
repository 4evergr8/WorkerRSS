import * as cheerio from "cheerio"
import {itemsToRss} from "../rss.js";

export async function javdb(actorId) {
    const resp = await fetch(`https://javdb.com/actors/${actorId}`)
    const html = await resp.text()
    const $ = cheerio.load(html)

    // meta keywords 取第一个关键词
    const keywords = $("meta[name='keywords']").attr("content") || ""
    const actorName = keywords.split(",")[0].trim()

    const items = []
    const now = Date.now()

    $("div.movie-list div.item").each((i, el) => {
        const a = $(el).find("a.box")
        const link = "https://javdb.com" + (a.attr("href") || "")
        const title = $(el).find(".video-title strong").text().trim() // 番号
        const name = $(el).find(".video-title").contents().not("strong").text().trim() // 番号后面的标题

        const image = $(el).find("img").attr("src") || ""
        const date = $(el).find(".meta").text().trim()

        const desc = `<![CDATA[
番号: ${title}<br/>
片名: ${name}<br/>
日期: ${date}<br/>
<img src="${image}" />
]]>`

        items.push({
            title: name ? `[${title}] ${name}` : title,
            link,
            description: desc,
            author: actorName,
            enclosure: image ? {url: image, type: "image/jpeg", length: "0"} : undefined,
            guid: link,
            pubDate: new Date(now - i * 1000).toUTCString(),
        })
    })

    const channel = {
        title: `${actorName} - JavDB`,
        description: `${actorName} - JavDB`,
        link: `https://javdb.com/actors/${actorId}`,
        image: "https://javdb.com/favicon.ico"
    }

    return itemsToRss(items, channel)
}
