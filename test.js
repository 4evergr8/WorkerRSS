import fs from "fs/promises";

const types = [
    "character",
    "parody",
    "tag",
    "artist",
    "group"
];

const API = "https://nhentai.net/api/v2/tags";

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));


async function fetchWithRetry(url) {
    while (true) {
        try {
            const res = await fetch(url, {
                headers: {
                    accept: "application/json"
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            return await res.json();

        } catch (err) {
            console.log(
                `请求失败: ${url}`,
                err.message,
                "5秒后重试..."
            );

            await sleep(5000);
        }
    }
}


async function collectType(type, map) {

    let page = 1;

    while (true) {

        const url =
            `${API}/${type}?sort=name&page=${page}&per_page=100`;

        console.log(
            `获取 ${type} 第 ${page} 页`
        );


        const data = await fetchWithRetry(url);


        for (const item of data.result) {

            /*
              只保存你需要的数据

              id -> url
            */

            map.set(
                item.id,
                item.url
            );
        }


        if (page >= data.num_pages) {
            break;
        }

        page++;
    }
}


async function main() {

    const tagMap = new Map();


    for (const type of types) {

        await collectType(
            type,
            tagMap
        );

    }


    console.log(
        `共收集 ${tagMap.size} 条`
    );


    const text =
        `export const tagMap = new Map([
${[
            ...tagMap.entries()
        ]
            .map(
                ([id, url]) =>
                    `  [${id}, "${url}"]`
            )
            .join(",\n")}
]);`;


    await fs.writeFile(
        "tagMap.txt",
        text,
        "utf8"
    );


    console.log(
        "生成完成 tagMap.txt"
    );
}


main();