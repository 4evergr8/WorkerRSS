import { DateTime } from "luxon";
import { itemsToRss } from "../rss.js";

export async function kemono(ID) {
    const resp = await fetch(`https://kemono.cr/api/v1/${ID}/posts`, {
        headers: {
            "Accept": "text/css",

        }
    })
    console.log("kemono:", ID)
    const data = await resp.json()
    const items = []

    for (const post of data) {
        const title = post.title || "无标题"
        const link = `https://kemono.cr/${post.service}/user/${post.user}/post/${post.id}`
        const contentHtml = post.substring || ""
        const datetime = post.published || ""
        const rssTime = datetime
            ? DateTime.fromISO(datetime, { zone: 'utc' }).toRFC2822()
            : ""

        const enclosureUrl = post.file?.path
            ? `https://kemono.cr/data${post.file.path}`
            : "https://kemono.cr/static/noimage.png"

        // 拼接正文和图片
        const content = `<![CDATA[${contentHtml}<br><img src="${enclosureUrl}" />]]>`

        items.push({
            title: title,
            link: link,
            description: content,
            author: post.user,
            guid: link,
            pubDate: rssTime,
            enclosure: {
                url: enclosureUrl,
                length: "0",
                type: "image/png"
            }
        })
    }


    const channel = {
        title: `${ID} - Kemono`,
        description: `${ID} - Kemono`,
        link: `https://kemono.cr/${ID}`,
        image: "https://kemono.cr/static/apple-touch-icon.png"
    }

    return itemsToRss(items, channel)
}
