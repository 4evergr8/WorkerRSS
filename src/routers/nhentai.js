import { Feed } from "feed";


const CHINESE_TAG = 29963;
const ENGLISH_TAG = 12227;
const JAPANESE_TAG = 6346;


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
){

    const cacheIds =
        cached
            ?
            new Set(
                cached.map(
                    x=>x.id
                )
            )
            :
            null;


    const result=[];


    let stop=false;


    let page=1;


    while(
        page<=5 &&
        !stop
        ){

        const url =
            `https://nhentai.net/api/v2/galleries/tagged`+
            `?tag_id=${tagId}&sort=date&page=${page}&per_page=100`;



        const resp = await fetch(url);


        if(!resp.ok){

            throw new Error(
                `page ${page} 请求失败`
            );
        }


        const data =
            await resp.json();



        if(
            !data.result ||
            data.result.length===0
        ){
            break;
        }



        for(
            const item of data.result
            ){

            if(
                cacheIds &&
                cacheIds.has(item.id)
            ){

                stop=true;
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



function simplifyItem(item){

    return {

        id:item.id,

        media_id:item.media_id,

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



function cleanText(text=""){

    return String(text)
        .replace(/[\x00-\x1F\x7F-\x9F]/g,"")
        .trim();
}



export async function nhentai(
    input,
    baseUrl,
    env
){

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



    if(cached){

        all=[
            ...fresh,
            ...cached
        ];

    }else{

        all=fresh;

    }



    /*
        根据gid去重
    */

    const map =
        new Map();


    for(
        const item of all
        ){

        map.set(
            item.id,
            item
        );

    }


    all=[
        ...map.values()
    ]
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

            feedLinks:{
                rss:currentRssUrl
            },

            image:
                "https://nhentai.net/favicon.png",

            link:
                `https://nhentai.net/${input}/`,

            title:
                `nhentai - ${input}`,

            updated:now
        });



    const getLangPriority =
        (tagIds=[])=>{

            if(tagIds.includes(CHINESE_TAG)){
                return 4;
            }

            if(tagIds.includes(ENGLISH_TAG)){
                return 3;
            }

            if(tagIds.includes(JAPANESE_TAG)){
                return 2;
            }

            return 1;
        };



    const works =
        new Map();



    for(
        const item of all
        ){


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
                .replace(/\[.*?]/g,"")
                .replace(/\(.*?\)/g,"")
                .replace(/\s/g,"")
                .replace(/\p{P}/gu,"")
                .toLowerCase();



        const priority =
            getLangPriority(
                item.tag_ids
            );



        let contentTitle="";

        if(englishTitle){

            if(
                englishTitle.includes("|")
            ){

                contentTitle =
                    englishTitle
                        .split("|")
                        .pop()
                        .trim();

            }else{

                contentTitle =
                    englishTitle;

            }

        }else{

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



        const images=[
            `<p>${contentTitle}</p>`
        ];



        for(
            let p=1;
            p<=item.num_pages;
            p++
        ){

            images.push(
                `<img src="https://i.nhentai.net/galleries/${item.media_id}/${p}.${coverExt}" loading="lazy" alt="P${p}/${item.num_pages}"/>`
            );

        }



        const feedItem={

            author:[
                {
                    name:input
                }
            ],

            content:
                images.join(""),

            date:
                new Date(
                    1600000000000 +
                    item.id * 1000
                ),

            id:
                `https://nhentai.net/g/${item.id}/`,

            link:
                `https://nhentai.net/g/${item.id}/`,

            title

        };



        const old =
            works.get(
                uniqueId
            );



        if(
            !old ||
            priority>old.priority
        ){

            works.set(
                uniqueId,
                {
                    priority,
                    item:feedItem
                }
            );

        }

    }



    for(
        const {
            item
        }
        of works.values()
        ){

        feed.addItem(item);

    }



    return feed.rss2();

}