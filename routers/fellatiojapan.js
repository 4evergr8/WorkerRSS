import * as cheerio from "cheerio"
import {itemsToRss} from "../rss.js";

export async function fellatiojapan(model) {
    const resp = await fetch(`https://fellatiojapan.com/en/girl/${model}`)
    const html = await resp.text()
    const $ = cheerio.load(html)

    const pagetitle = $("#content h1").first().text().trim()

    const items = []
    const now = Date.now()

    $(".scene-obj").each((i, el) => {
        const title = $(el).find(".sGirl a").first().text().trim() || "Fellatio Japan Scene"
        const link = $(el).find(".scene-top").attr("href") || ""
        const authors = $(el).find(".sGirl a").map((i, a) => $(a).text().trim()).get().join(", ")

        // 主图（背景图）
        let image = ""
        const bgStyle = $(el).find(".scene-img").attr("style") || ""
        const match = bgStyle.match(/url\(([^)]+)\)/)
        if (match) {
            image = match[1].replace(/['"]/g, "")
            if (!image.startsWith("http")) image = "https://cdn.fellatiojapan.com" + image
        }

        // 标签
        const tags = $(el).find(".data.dark a").map((j, tagEl) => $(tagEl).text().trim()).get().join(", ")

        // 日期
        const date = $(el).find(".sDate").text().trim()

        const desc = `<![CDATA[
模特: ${authors}<br/>
标签: ${tags}<br/>
日期: ${date}<br/>
<img src="${image}" />
]]>`

        items.push({
            title,
            link: link.startsWith("http") ? link : "https://fellatiojapan.com/en/girl/" + model,
            description: desc,
            author:authors,
            enclosure: image ? {url: image, type: "image/jpeg", length: "0"} : undefined,
            guid: image,
            pubDate: date ? new Date(date).toUTCString() : new Date(now - i * 1000).toUTCString()
        })
    })

    const channel = {
        title: `${pagetitle} - Fellatio Japan`,
        description: `${pagetitle} - Fellatio Japan`,
        link: `https://fellatiojapan.com/en/girls/${model}`,
        image: "https://cdn.fellatiojapan.com/img/svg2.png"
    }

    return itemsToRss(items, channel)
}
