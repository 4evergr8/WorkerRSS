import {itemsToRss} from "../rss.js"

export async function nhentai(query = "chinese") {
    const resp = await fetch(`https://nhentai.net/api/galleries/search?query=${query}&page=1&sort=new-uploads`)
    const data = await resp.json()

    const items = []
    const now = Date.now()

    const extMap = { j: "jpg", p: "png", g: "gif", w: "webp" }

    for (let i = 0; i < data.result.length; i++) {
        const item = data.result[i]

        const gid = item.id
        const mediaId = item.media_id
        const title = item.title.english || item.title.japanese || item.title.pretty || `Gallery ${gid}`
        const tags = item.tags.map(t => t.name).join(", ")
        const pages = item.images.pages.length

        // 封面
        const coverType = item.images.cover.t || "j"
        const coverExt = extMap[coverType] || "jpg"
        const cover = `https://t.nhentai.net/galleries/${mediaId}/cover.${coverExt}`

        // 全部图片
        const images = item.images.pages.map((p, idx) => {
            const ext = extMap[p.t] || "jpg"
            return `https://i.nhentai.net/galleries/${mediaId}/${idx + 1}.${ext}`
        })

        // 内容
        const desc = `<![CDATA[
标签: ${tags}<br/>
页数: ${pages}<br/>
<img src="${cover}" /><br/>
${images.map(url => `<img src="${url}" />`).join("<br/>\n")}
]]>`

        items.push({
            title,
            link: `https://nhentai.net/g/${gid}/`,
            description: desc,
            author: "nhentai",
            enclosure: {url: cover, type: "image/jpeg", length: "0"},
            guid: String(gid),
            pubDate: new Date(now - i * 1000).toUTCString(),
        })
    }

    const channel = {
        title: `${query} - nhentai`,
        description: `${query} - nhentai`,
        link: `https://nhentai.net/search/?q=${query}`,
        image: "https://nhentai.net/favicon.ico"
    }

    return itemsToRss(items, channel)
}
