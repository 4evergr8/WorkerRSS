import * as cheerio from "cheerio";
import {Feed} from "feed";

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

export async function handjobjapan(model, baseUrl) {

    const currentRssUrl =
        `${baseUrl}?handjobjapan=${encodeURIComponent(model)}`;

    const profileUrl =
        `https://www.handjobjapan.com/en/models/${encodeURIComponent(model)}`;

    const resp = await fetch(profileUrl);

    const html = await resp.text();

    const $ = cheerio.load(html);

    const now = new Date();


    const feed = new Feed({
        feedLinks: {rss: currentRssUrl},
        image: "https://www.handjobjapan.com/favicon.ico",
        link: profileUrl,
        title: `HandjobJapan - ${model}`,
        updated: now,
    });

    $(".vthumb.item").each((i, el) => {

        const style =
            $(el).attr("style");

        const previewImage =
            style.match(/url\((.*?)\)/)?.[1];

        const previewId =
            $(el)
                .find(".scene-hover")
                .attr("data-path");

        const previewVideo = `https://cdn.handjobjapan.com/preview/${previewId}/hover.mp4`

        const itemTitle =
            `${model} ${previewId}`;

        const summaryDescription =
            `模特: ${model} | ID: ${previewId}`;

        const content = `
<p>${summaryDescription}</p>

<p>预览图片</p>

<img src="${previewImage}" />

<p>预览视频</p>

<video controls preload="none">
    <source src="${previewVideo}" type="video/mp4">
</video>

`;

        feed.addItem({
            author: [{name: model.replace(/-/g, " ")}],
            content: content,
            link: previewId,
            title: itemTitle,
        });
    });

    return feed.rss2();
}
