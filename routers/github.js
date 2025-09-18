import { DateTime } from 'luxon'
import { itemsToRss } from '../rss.js'

export async function github(REP) {
    const apiUrl = `https://api.github.com/repos/${REP}/releases`
    console.log("github:", REP)
    const resp = await fetch(apiUrl, {
        headers: {
            "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Referer": apiUrl,
            "Origin": apiUrl,
        }
    })
    if (!resp.ok) throw new Error(`GitHub API 请求失败: ${resp.status}`)
    const releases = await resp.json()

    const items = releases.map(r => {
        const assetsHtml = (r.assets || []).map(a => {
            return `<a href="${a.browser_download_url}">${a.name}</a> (${(a.size / 1024 / 1024).toFixed(2)} MB, 下载 ${a.download_count})`
        }).join('<br/>')

        const content = `<![CDATA[
${r.body || ''}
<br/><br/>
${assetsHtml}
]]>`

        const pubDate = r.published_at
            ? DateTime.fromISO(r.published_at, { zone: 'utc' }).toRFC2822()
            : ''

        return {
            title: r.name || r.tag_name,
            link: r.html_url,
            description: content,
            author: r.author?.login || 'unknown',
            guid: r.html_url,
            pubDate,
            enclosure: {
                url: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
                length: "0",
                type: "image/png"
            }
        }
    })

    const channel = {
        title: `${REP} - Github`,
        description: `${REP} - Github`,
        link: `https://github.com/${REP}/releases`,
        image: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png"
    }

    return itemsToRss(items, channel)
}
