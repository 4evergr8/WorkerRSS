import * as cheerio from "cheerio"
import {itemsToRss} from "../rss.js";

export async function dlsite(RG) {
    const resp = await fetch(`https://www.dlsite.com/maniax/circle/profile/=/maker_id/${RG}.html/per_page/30`)
    console.log("dlsite:", RG)
    const html = await resp.text()

    const $ = cheerio.load(html)
    const title = $('#main_inner > div:nth-child(1) > h1 > span').text().trim()
    const items = []

    const now = Date.now()

    $("#search_result_img_box > li.search_result_img_box_inner").each((i, el) => {
        const title = $(el).find("dd.work_name a").attr("title") || ""
        const link = $(el).find("dd.work_name a").attr("href") || ""
        const author = $(el).find("dd.maker_name a").first().text().trim() || ""

        let image = ""
        $(el).find("img").each((j, imgEl) => {
            let src = $(imgEl).attr("data-src") || $(imgEl).attr("src") || ""
            if (src && !src.startsWith("data:")) {
                image = src
                return false
            }
        })
        if (image.startsWith("//")) {
            image = "https:" + image
        }

        const price = $(el).find("span.work_price_base").first().text().trim() || ""
        const genre = $(el).find("dd div a").first().text().trim() || ""
        const sales = $(el).find("dd.work_dl span").text().trim() || ""

        let fullImage = image.startsWith("//") ? "https:" + image : image
        fullImage = fullImage.replace("/resize/", "/modpub/").replace(/main_240x240\.jpg$/, "main.webp")
        let image1 = fullImage.replace("_main.webp", "_smp1.webp")
        let image2 = fullImage.replace("_main.webp", "_smp2.webp")

        const desc = `<![CDATA[
作者: ${author}<br/>
类型: ${genre}<br/>
价格: ${price}<br/>
销量: ${sales}<br/>
<img src="${fullImage}" /><br/>
<img src="${image1}" /><br/>
<img src="${image2}" />
]]>`

        items.push({
            title,
            link,
            description: desc,
            author,
            enclosure: fullImage ? {url: fullImage, type: "image/jpeg", length: "0"} : undefined,
            guid: link,
            // 使用抓取顺序生成时间戳，保证 RSS 排序正确
            pubDate: new Date(now - i * 1000).toUTCString(),
        })
    })

    const channel = {
        title: `${title} - DLSite`,
        description: `${title} - DLSite`,
        link: `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${RG}.html`,
        image: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png"
    }

    return itemsToRss(items, channel)
}
