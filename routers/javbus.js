import * as cheerio from "cheerio"
import {itemsToRss} from "../rss.js";

export async function javbus(actorId) {
    const url = `https://www.javbus.com/star/${actorId}`
    const resp = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Referer": url,
            "Origin": "https://www.javbus.com",
            "Cookie": "existmag=all"
        }
    })
    const html = await resp.text()
    const $ = cheerio.load(html)

    const actorName = $("div.avatar-box .photo-info span.pb10").first().text().trim() ||
        $("title").text().split("-")[0].trim()

    const items = []
    $("a.movie-box").each((i, el) => {
        const a = $(el)
        let link = a.attr("href") || ""
        if (link.startsWith("/")) link = "https://www.javbus.com" + link

        const img = a.find("img").first()
        let image = img.attr("src") || img.attr("data-src") || img.attr("data-original") || ""
        if (image.startsWith("//")) image = "https:" + image
        if (image.startsWith("/")) image = "https://www.javbus.com" + image

        const titleFull = img.attr("title") || a.find(".photo-info span").first().text().trim() || ""
        const dates = a.find(".photo-info date")
        const code = dates.first().text().trim() || ""
        const dateText = dates.last().text().trim() || ""
        const pubDate = !isNaN(Date.parse(dateText)) ? new Date(dateText).toUTCString() : new Date(Date.now() - i*1000).toUTCString()

        const desc = `<![CDATA[
番号: ${code}<br/>
片名: ${titleFull}<br/>
日期: ${dateText}<br/>
${ image ? `<img src="${image}" />` : "" }
]]>`

        items.push({
            title: code ? `[${code}] ${titleFull}` : titleFull,
            link,
            description: desc,
            author: actorName,
            enclosure: image ? { url: image, type: "image/jpeg", length: "0" } : undefined,
            guid: link || `${actorId}-${i}`,
            pubDate
        })
    })

    const channel = {
        title: `${actorName} - JavBus`,
        description: `${actorName} - JavBus`,
        link: url,
        image: "https://www.javbus.com/favicon.ico"
    }

    return itemsToRss(items, channel)
}
