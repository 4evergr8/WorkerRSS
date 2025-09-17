import { dlsite } from "./routers/dlsite.js"
import { github } from "./routers/github.js"
import { kemono } from "./routers/kemono.js"
import { cospuri } from "./routers/cospuri.js"
import { fellatiojapan } from "./routers/fellatiojapan.js"
import { javbus } from "./routers/javbus.js"
const funcs = { dlsite,github ,kemono,cospuri,fellatiojapan,javbus}  // 所有支持的网站函数

export default {
    async fetch(request) {
        const url = new URL(request.url)
        const paramName = Array.from(url.searchParams.keys())[0]
        const paramValue = url.searchParams.get(paramName)

        if (!paramName || !paramValue) return new Response("缺少参数", { status: 400 })

        if (paramName === "raw") {
            const resp = await fetch(paramValue, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "zh-CN,zh;q=0.9",
                    "Referer": paramValue,
                    "Origin": paramValue,
                }
            })
            const html = await resp.text()
            return new Response(html, { headers: { "content-type": "text/plain; charset=utf-8" } })
        }



        const func = funcs[paramName]  // 动态调用
        if (typeof func !== "function") return new Response("未知参数：" + paramName, { status: 400 })

        const rss = await func(paramValue)
        return new Response(rss, { headers: { "content-type": "application/rss+xml; charset=utf-8" } })
    }
}




