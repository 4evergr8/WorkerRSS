import * as cheerio from "cheerio"
import {itemsToRss} from "../rss.js";

export async function cospuri(model) {
    const resp = await fetch(`https://cospuri.com/model/${model}`)
    const html = await resp.text()
    const $ = cheerio.load(html)
    const title = $('div.name-en').text().trim()


    const items = []
    const now = Date.now()

    $(".scene.cosplay").each((i, el) => {
        const title = $(el).find(".model a").first().text().trim() || "Cospuri Scene"
        const link = $(el).find("a").first().attr("href") || ""
        const author = $(el).find(".model a").first().text().trim() || ""

        // 主图（背景图）
        let image = ""
        const bgStyle = $(el).find(".scene-thumb").attr("style") || ""
        const match = bgStyle.match(/url\(([^)]+)\)/)
        if (match) {
            image = match[1].replace(/['"]/g, "")
            if (!image.startsWith("http")) image = "https://www.cospuri.com" + image
        }

        // 标签
        const tags = $(el).find(".tags a").map((j, tagEl) => $(tagEl).text().trim()).get().join(", ")

        const desc = `<![CDATA[
模特: ${author}<br/>
标签: ${tags}<br/>
<img src="${image}" />
]]>`

        items.push({
            title,
            link: link.startsWith("http") ? link : "https://www.cospuri.com" + link,
            description: desc,
            author,
            enclosure: image ? {url: image, type: "image/jpeg", length: "0"} : undefined,
            guid: link,
            pubDate: new Date(now - i * 1000).toUTCString()
        })
    })

    const channel = {
        title: `${title} - Cospuri`,
        description: `${title} - Cospuri`,
        link: `https://cospuri.com/model/${model}`,
        image: "https://cdn.cospuri.com/img/banner_1.jpg"
    }

    return itemsToRss(items, channel)
}
