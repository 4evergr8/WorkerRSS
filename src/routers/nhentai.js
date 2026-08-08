import {Feed} from "feed";
import {tagMap} from "../nhentai_tags.js";


const CHINESE_TAG = 29963;


async function loadCache(env, key) {

    const data = await env.RSS_KV.get(
        key,
        "json"
    );


    if (!data) {
        return null;
    }


    if (
        data.version !== 1 ||
        !Array.isArray(data.items)
    ) {
        return null;
    }


    return data.items;
}


async function saveCache(env, key, items) {

    await env.RSS_KV.put(
        key,
        JSON.stringify({
            version: 1,
            updated: Date.now(),
            items: items.slice(0, 500)
        })
    );
}


async function fetchTagId(input) {

    const url =
        `https://nhentai.net/api/v2/tags/${input}`;


    const resp = await fetch(url);


    if (!resp.ok) {

        throw new Error(
            `tag请求失败 ${resp.status}`
        );
    }


    const data =
        await resp.json();


    return data.id;
}


async function fetchNewItems(
    tagId,
    cached
) {

    const cacheIds =
        cached
            ?
            new Set(
                cached.map(
                    x => x.id
                )
            )
            :
            null;


    const result = [];


    let stop = false;


    let page = 1;


    while (
        page <= 5 &&
        !stop
        ) {

        const url =
            `https://nhentai.net/api/v2/galleries/tagged` +
            `?tag_id=${tagId}&sort=date&page=${page}&per_page=100`;


        const resp = await fetch(url);


        if (!resp.ok) {

            throw new Error(
                `page ${page} 请求失败`
            );
        }


        const data =
            await resp.json();


        if (
            !data.result ||
            data.result.length === 0
        ) {
            break;
        }


        for (
            const item of data.result
            ) {

            if (
                cacheIds &&
                cacheIds.has(item.id)
            ) {

                stop = true;
                break;

            }


            result.push(
                simplifyItem(item)
            );
        }


        page++;
    }


    return result;
}


function simplifyItem(item) {

    return {

        id: item.id,

        media_id: item.media_id,

        japanese_title:
            item.japanese_title || "",

        english_title:
            item.english_title || "",

        tag_ids:
            item.tag_ids || [],

        num_pages:
            item.num_pages || 0,

        thumbnail:
            item.thumbnail || ""
    };
}


function cleanText(text = "") {

    return String(text)
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .trim();
}
function parseTags(tagIds = []) {

    const result = {
        parody: [],
        character: [],
        tag: [],
        artist:[],
        group:[]
    };


    for (const id of tagIds) {

        const url = tagMap.get(id);


        // 不存在直接跳过
        if (!url) {
            continue;
        }


        const match =
            url.match(
                /^\/(character|parody|tag|artist|group)\/(.+?)\/$/
            );


        // 非目标分类跳过
        if (!match) {
            continue;
        }


        const type = match[1];

        const name = match[2];


        result[type].push({

            name,

            url:
                `https://nhentai.net${url}`

        });

    }


    return result;
}


export async function nhentai(
    input,
    baseUrl,
    env
) {

    const now =
        new Date();


    const cacheKey =
        `nhentai/${input}`;


    const tagId =
        await fetchTagId(input);


    const cached =
        await loadCache(
            env,
            cacheKey
        );


    const fresh =
        await fetchNewItems(
            tagId,
            cached
        );


    let all;


    if (cached) {

        all = [
            ...fresh,
            ...cached
        ];

    } else {

        all = fresh;

    }

    /*
        不使用gid去重
        只保留原来的标题逻辑去重
    */

    const uniqueWorks =
        new Map();


    for (
        const item of all
        ) {


        const japaneseTitle =
            cleanText(
                item.japanese_title
            );


        const englishTitle =
            cleanText(
                item.english_title
            );


        const title =
            japaneseTitle ||
            englishTitle;


        const uniqueId =
            title
                .replace(/\[.*?]/g, "")
                .replace(/\(.*?\)/g, "")
                .replace(/\s/g, "")
                .replace(/\p{P}/gu, "")
                .toLowerCase();


        const priority =
            item.tag_ids.includes(CHINESE_TAG)
                ? 2
                : 1;


        const old =
            uniqueWorks.get(
                uniqueId
            );


        if (
            !old ||
            priority > old.priority
        ) {

            uniqueWorks.set(
                uniqueId,
                {
                    priority,
                    item
                }
            );

        }

    }


    all =
        [
            ...uniqueWorks.values()
        ]
            .map(
                x => x.item
            )
            .slice(0,500);


    await saveCache(
        env,
        cacheKey,
        all
    );


    const currentRssUrl =
        `${baseUrl}?nhentai=${input}`;


    const feed =
        new Feed({

            feedLinks: {
                rss: currentRssUrl
            },

            image:
                "https://nhentai.net/favicon.png",

            link:
                `https://nhentai.net/${input}/`,

            title:
                `nhentai - ${input}`,

            updated: now
        });

    const hasChinese =
        (tagIds = []) => {

            return tagIds.includes(
                CHINESE_TAG
            );

        };


    const works =
        new Map();


    for (
        const item of all
        ) {


        const japaneseTitle =
            cleanText(
                item.japanese_title
            );


        const englishTitle =
            cleanText(
                item.english_title
            );


        const title =
            japaneseTitle ||
            englishTitle;


        const uniqueId =
            title
                .replace(/\[.*?]/g, "")
                .replace(/\(.*?\)/g, "")
                .replace(/\s/g, "")
                .replace(/\p{P}/gu, "")
                .toLowerCase();


        const priority =
            hasChinese(
                item.tag_ids
            )
                ? 2
                : 1;


        let contentTitle = "";

        if (englishTitle) {

            if (
                englishTitle.includes("|")
            ) {

                contentTitle =
                    englishTitle
                        .split("|")
                        .pop()
                        .trim();

            } else {

                contentTitle =
                    englishTitle;

            }

        } else {

            contentTitle =
                japaneseTitle;

        }


        const coverExt =
            item.thumbnail
                ?.match(/\.(webp|jpg|png)$/i)
                ?.[1]
                ?.toLowerCase()
            ||
            "jpg";


        const parsedTags =
            parseTags(
                item.tag_ids
            );


        const tagHtml = [];
        if (parsedTags.group.length) {

            tagHtml.push(
                `<p>社团: ${
                    parsedTags.group
                        .map(
                            x =>
                                `<a href="${x.url}">${x.name}</a>`
                        )
                        .join(" , ")
                }</p>`
            );

        }
        if (parsedTags.artist.length) {

            tagHtml.push(
                `<p>画师: ${
                    parsedTags.artist
                        .map(
                            x =>
                                `<a href="${x.url}">${x.name}</a>`
                        )
                        .join(" , ")
                }</p>`
            );

        }


        if (parsedTags.parody.length) {

            tagHtml.push(
                `<p>原作: ${
                    parsedTags.parody
                        .map(
                            x =>
                                `<a href="${x.url}">${x.name}</a>`
                        )
                        .join(" , ")
                }</p>`
            );

        }


        if (parsedTags.character.length) {

            tagHtml.push(
                `<p>人物: ${
                    parsedTags.character
                        .map(
                            x =>
                                `<a href="${x.url}">${x.name}</a>`
                        )
                        .join(" , ")
                }</p>`
            );

        }


        if (parsedTags.tag.length) {

            tagHtml.push(
                `<p>内容: ${
                    parsedTags.tag
                        .map(
                            x =>
                                `<a href="${x.url}">${x.name}</a>`
                        )
                        .join(" , ")
                }</p>`
            );

        }



        const images = [

            `<p>${contentTitle}</p>`,

            ...tagHtml

        ];


        for (
            let p = 1;
            p <= item.num_pages;
            p++
        ) {

            images.push(
                `<img src="https://i.nhentai.net/galleries/${item.media_id}/${p}.${coverExt}" loading="lazy" alt="P${p}/${item.num_pages}"/>`
            );

        }


        const feedItem = {
            author: [{name: input}],
            content: images.join(""),
            link: `https://nhentai.net/g/${item.id}/`,
            title:title
        };


        const old =
            works.get(
                uniqueId
            );


        if (
            !old ||
            priority > old.priority
        ) {

            works.set(
                uniqueId,
                {
                    priority,
                    item: feedItem
                }
            );

        }

    }


    for (
        const {
            item
        }
        of works.values()
        ) {

        feed.addItem(item);

    }


    return feed.rss2();

}