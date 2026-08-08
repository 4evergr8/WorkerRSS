import {Feed} from "feed";

export async function pawchive(input, baseUrl) {
    const now = new Date();

    const currentRssUrl = `${baseUrl}?pawchive=${input}`;

    const apiBase = "https://pawchive.pw/api/v1/";

    const profileResp = await fetch(
        `${apiBase}${input}/profile`
    );

    if (!profileResp.ok) {
        throw new Error("profile请求失败");
    }

    const profile = await profileResp.json();

    const postResp = await fetch(
        `${apiBase}${input}/posts`
    );

    if (!postResp.ok) {
        throw new Error("post请求失败");
    }

    const posts = await postResp.json();


    const feed = new Feed({
        feedLinks: {rss: currentRssUrl},
        image: "https://pawchive.pw/static/favicon.png",
        link: `https://pawchive.pw/${input}`,
        title: `Pawchive - ${profile.name}`,
        updated: now,
    });


    const fileUrl = (path) => {
        if (!path) {
            return "";
        }

        return `https://file.pawchive.pw/data${path}`;
    };


    const cleanText = (text = "") =>
        text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
            .trim();


    for (const post of posts) {

        const content = post.content ;

        const images = [];

        if (post.file?.path) {
            images.push(
                `<img src="${fileUrl(post.file.path)}" alt="${post.file.name }"/>`
            );
        }


        for (const attachment of post.attachments || []) {

            if (!attachment.path) {
                continue;
            }

            images.push(
                `<img src="${fileUrl(attachment.path)}" alt="${attachment.name }"/>`
            );
        }


        const fullContent =
            content +
            images.join("");


        const cover =fileUrl(post.file.path)



        feed.addItem({
            author: [{name: profile.name}],
            content: fullContent,
            link: `https://pawchive.pw/${input}/post/${post.id}`,
            title: cleanText(post.title),
        });
    }


    return feed.rss2();
}