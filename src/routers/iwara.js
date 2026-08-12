import { Feed } from "feed";
import {UA} from "../others/strings.js";

export async function iwara(input, baseUrl) {
    const now = new Date();

    const profileUrl = `https://www.iwara.tv/profile/${input}`;
    const currentRssUrl = `${baseUrl}?iwara=${input}`;

    const profileResp = await fetch(
        `https://api.iwara.tv/profile/${input}`,
        {
            headers: {
                "user-agent": UA
            }
        }
    );

    if (!profileResp.ok) {
        const text = await profileResp.text();

        throw new Error(
            `profile请求失败: ${profileResp.status} ${text}`
        );
    }

    const profileData = await profileResp.json();

    const userId = profileData.user.id;

    const videosResp = await fetch(
        `https://api.iwara.tv/videos?rating=all&user=${userId}&limit=50`,
        {
            headers: {
                "user-agent": UA
            }
        }
    );

    if (!videosResp.ok) {
        const text = await videosResp.text();

        throw new Error(
            `videos请求失败: ${videosResp.status} ${text}`
        );
    }

    const videosData = await videosResp.json();

    const feed = new Feed({
        feedLinks: {rss: currentRssUrl},
        image: "https://www.iwara.tv/logo.png",
        link: profileUrl,
        title: `Iwara - ${profileData.user.name}`,
        updated: now,
    });

    const cleanText = (text = "") =>
        text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
            .trim();

    for (const video of videosData.results || []) {

        const previewId = video.id;

        const itemTitle = cleanText(video.title);

        const previewImage = `https://i.iwara.tv/image/original/${video.file.id}/preview.webp`


        const tags = (video.tags || [])
            .map(tag => tag.id)
            .join(", ");

        const content = [
            `<img src="${previewImage}" alt="${itemTitle}"/>`,


            `<p>${itemTitle}</p>`,

            `<p>Tags: ${tags}</p>`


        ].join("");

        feed.addItem({
            author: [{name: profileData.user.name}],
            content:content,
            link: `https://www.iwara.tv/video/${previewId}`,
            title: itemTitle,
        });
    }

    return feed.rss2();
}