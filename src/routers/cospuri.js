import * as cheerio from "cheerio";
import {Feed} from "feed";

function hashCode(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash);
}

function buildStableDate(id) {

    const num =
        parseInt(
            ((id.match(/^\d+/)?.[0])
                .slice(0, 4))
                .slice(0, 3),
            10
        );

    const base = new Date(Date.UTC(2024, 0, 1));

    base.setUTCDate(base.getUTCDate() + num);

    return base;
}

export async function cospuri(model, baseUrl) {

    const currentRssUrl = `${baseUrl}?cospuri=${encodeURIComponent(model)}`;

    const profileUrl =
        `https://www.cospuri.com/model/${encodeURIComponent(model)}`;

    const resp = await fetch(profileUrl);

    const html = await resp.text();

    const $ = cheerio.load(html);

    const now = new Date();

    const feed = new Feed({
        feedLinks: {rss: currentRssUrl},
        image: "https://cospuriapp.com/favicon.png",
        link: profileUrl,
        title: `Cospuri - ${model}`,
        updated: now,
    });

    $(".scene").each((i, el) => {
        const thumbDiv =
            $(el).find(".scene-thumb");
        const style =
            thumbDiv.attr("style") ;

        const previewImage =
            style.match(/url\((.*?)\)/)?.[1] ;

        const sampleLink =
            thumbDiv.find("a").attr("href");

        const fullLink =
            "https://www.cospuri.com" + sampleLink;

        const sampleId =
            new URLSearchParams(
                sampleLink.split("?")[1]
            ).get("id") ;

        const hoverVideo =
            thumbDiv.find(".scene-hover")
                .attr("data-path") ;

        const modelName =
            $(el)
                .find(".model > a")
                .first()
                .text()
                .trim();

        const channel =
            $(el)
                .find(".channel")
                .text()
                .trim();

        const length =
            $(el)
                .find(".length strong")
                .text()
                .trim();

        const photos =
            $(el)
                .find(".photos strong")
                .text()
                .trim();

        const tags = [];

        $(el)
            .find(".tags .tag")
            .each((_, tag) => {
                tags.push($(tag).text().trim());
            });

        const title =
            `${modelName} ${sampleId}`;

        const summaryDescription =
            `模特: ${modelName} | 频道: ${channel} | 时长: ${length}min | 图片: ${photos}pics | 标签: ${tags.join(", ")}`;

        const content = `
<p>${summaryDescription}</p>



<p>
预览图片
</p>

<img src="${previewImage}" />

<p>
预览视频
</p>

<video controls preload="none">
    <source src="${hoverVideo}" type="video/mp4">
</video>
`;

        feed.addItem({
            author: [{name: modelName}],
            content:content,
            link: fullLink,
            title:title,
        });
    });

    return feed.rss2();
}