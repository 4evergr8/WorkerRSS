import * as cheerio from "cheerio"
import { Feed } from "feed";

// ===== RJ解析 =====
function extractRJ(url = "") {
    const m = url.match(/RJ\d+/i);
    return m ? m[0].toUpperCase() : "";
}

// ===== bucket计算（核心修复）=====
function getBucket(rj) {
    const numStr = rj.replace("RJ", "");

    const len = numStr.length;
    const n = Number(numStr);

    const bucket = Math.ceil(n / 1000) * 1000;

    // ❗关键：保持原 RJ 数字长度
    const bucketStr = String(bucket).padStart(len, "0");

    return "RJ" + bucketStr;
}

// ===== 主函数 =====
export async function dlsite(RG,baseUrl) {
    const currentRssUrl = `${baseUrl}?dlsite=${RG}`;
    const resp = await fetch(
        `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${RG}.html/per_page/30`
    );

    const html = await resp.text();
    const $ = cheerio.load(html);

    const title = $('#main_inner > div:nth-child(1) > h1 > span')
        .text()
        .trim();

    const now = new Date();

    const feed = new Feed({
        feedLinks: {rss: currentRssUrl},
        image: "https://www.dlsite.com/images/web/common/favicon.ico",
        link: `https://www.dlsite.com/maniax/circle/profile/=/maker_id/${RG}.html`,
        title: `DLSite - ${title}`,
        updated: now,
    });

    $("#search_result_img_box > li.search_result_img_box_inner").each((i, el) => {

        const itemTitle = $(el).find("dd.work_name a").attr("title");
        const link = $(el).find("dd.work_name a").attr("href")
        const author = $(el).find("dd.maker_name a").first().text().trim();

        const rj = extractRJ(link);

        let images = [];

        if (rj) {
            const bucket = getBucket(rj);
            const base = `https://img.dlsite.jp/modpub/images2/work/doujin/${bucket}/${rj}`;

            images = [
                `${base}_img_main.webp`,
                `${base}_img_smp1.webp`,
                `${base}_img_smp2.webp`,
                `${base}_img_smp3.webp`,
                `${base}_img_smp4.webp`
            ];
        }

        const price = $(el).find("span.work_price_base").first().text().trim() ;
        const genre = $(el).find("dd div a").first().text().trim() ;
        const sales = $(el).find("dd.work_dl span").text().trim() ;

        const summaryDescription =
            `作者: ${author} | 类型: ${genre} | 价格: ${price} | 销量: ${sales}`;

        const fullContent = `
<p>${summaryDescription}</p>
${images.map(v => `<img src="${v}" />`).join("\n")}
`;

        feed.addItem({
            author: [{ name: author }],
            content: fullContent,
            link: link,
            title: itemTitle,
        });
    });

    return feed.rss2();
}