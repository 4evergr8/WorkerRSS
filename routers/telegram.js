import * as cheerio from "cheerio"
import { itemsToRss } from "../rss.js"
import { DateTime } from "luxon"

export async function telegram(ID) {
    const resp = await fetch(`https://t.me/s/${ID}`)
    const html = await resp.text()
    const $ = cheerio.load(html)
    const fullTitle = $("title").text().trim()
    const title = fullTitle.split(" ")[0]  // 取第一个空格前的部分
    const description = $('meta[name="description"]').attr("content") || "无"
    const items = []

    $(".tgme_widget_message_wrap").each((i, el) => {
        const link = $(el).find("a.tgme_widget_message_date").attr("href") || ""
        const author = $(el).find(".tgme_widget_message_owner_name").text().trim() || ""
        const datetime = $(el).find("time").attr("datetime") || ""
        const rssTime = datetime ? DateTime.fromISO(datetime, { zone: "utc" }).toRFC2822() : ""

        const text = $(el).find(".tgme_widget_message_text").html() || ""
        const photo = $(el).find("a.tgme_widget_message_photo_wrap").css("background-image") || ""
        const photoUrl = photo.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "")

        const content = `<![CDATA[${text}${photoUrl ? `<br><img src="${photoUrl}" />` : ""}]]>`

        items.push({
            title: text.replace(/<[^>]+>/g, "").slice(0, 30) || "无标题",
            link: link,
            description: content,
            author: author,
            guid: link,
            pubDate: rssTime,
            enclosure: {
                url: photoUrl || "https://telegram.org/img/t_logo.png",
                length: "0",
                type: "image/jpeg"
            }
        })
    })

    const channel = {
        title: `${title} - Telegram`,
        description: `${title} - Telegram`,
        link: `https://t.me/s/${ID}`,
        image: "https://telegram.org/img/t_logo.png"
    }

    return itemsToRss(items, channel)
}
