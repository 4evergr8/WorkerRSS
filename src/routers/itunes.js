import { Feed } from "feed";

export async function itunes(artistIdOrName, baseUrl) {
    try {
        let artistId = artistIdOrName;

        // 1. 判断传入的是数字 ID 还是搜索内容（如果包含非数字字符，则视为搜索内容）
        const isName = /[^0-9]/.test(artistIdOrName.trim());

        if (isName) {
            const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistIdOrName)}&media=music&entity=musicArtist&limit=1`;
            const searchResp = await fetch(searchUrl);
            if (!searchResp.ok) {
                throw new Error(`iTunes Search API 请求失败，状态码: ${searchResp.status}`);
            }
            const searchData = await searchResp.json();
            if (!searchData.results || searchData.results.length === 0) {
                throw new Error(`未找到名为 "${artistIdOrName}" 的音乐人`);
            }
            // 自动纠正并锁定搜索到的第一个艺术家的 ID
            artistId = searchData.results[0].artistId;
        }

        // 允许同时返回 album 和 track
        const apiUrl = `https://itunes.apple.com/lookup?id=${artistId}&entity=album,song&sort=recent&limit=200`;
        const resp = await fetch(apiUrl);
        if (!resp.ok) {
            throw new Error(`iTunes Lookup API 请求失败，状态码: ${resp.status}`);
        }

        const data = await resp.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(`未找到 ID 为 ${artistId} 的歌手任何数据`);
        }

        // 2. 提取歌手基础信息
        const artistInfo = data.results[0];
        const artistName = artistInfo.artistName || "Unknown Artist";
        const artistLink = artistInfo.artistLinkUrl || `https://music.apple.com/us/artist/${artistId}`;

        const now = new Date();

        // 动态拼接规范化后的 XML 自身订阅链接 (链接/?itunes=实际数字ID)
        const currentRssUrl = `${baseUrl}?itunes=${artistId}`;

        // 3. 初始化 RSS Feed
        const feed = new Feed({
            title: `${artistName} - iTunes`,
            id: artistLink,
            link: artistLink,
            image: "https://music.apple.com/assets/favicon/favicon-180.png",
            // 新增 channel 级别的 xml 订阅链接字段
            feedLinks: {
                rss: currentRssUrl
            },
            updated: now,
        });

        const rawItems = data.results.slice(1);

        // 4. 建立专辑字典，用来聚合歌曲
        const albumsMap = {};
        const trackList = [];

        for (const item of rawItems) {
            if (item.wrapperType === "collection") {
                // 存入专辑基础数据，并初始化 tracks 数组
                albumsMap[item.collectionId] = {
                    ...item,
                    tracks: []
                };
            } else if (item.wrapperType === "track" && item.kind === "song") {
                trackList.push(item);
            }
        }

        // 5. 将歌曲塞进对应的专辑中
        for (const track of trackList) {
            if (albumsMap[track.collectionId]) {
                albumsMap[track.collectionId].tracks.push(track);
            }
        }

        // 6. 转换成数组并按照发行时间从新到旧排序
        const sortedAlbums = Object.values(albumsMap).sort((a, b) => {
            return new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0);
        });

        // 7. 遍历专辑生成 RSS Item
        for (const album of sortedAlbums) {
            const title = album.collectionName || album.collectionCensoredName;
            const itemUrl = album.collectionViewUrl;

            // 区分类型标签
            let typeLabel = "专辑";
            if (album.trackCount <= 2) {
                typeLabel = "单曲";
            } else if (album.trackCount >= 3 && album.trackCount <= 6) {
                typeLabel = "EP / 迷你专辑";
            }

            const rawArtwork = album.artworkUrl100 ;
            const hdArtwork = rawArtwork.replace("100x100bb.jpg", "600x600bb.jpg");
            const releaseDate = album.releaseDate ? new Date(album.releaseDate) : now;

            // 对歌曲按 trackNumber（曲序）正序排列
            const sortedTracks = album.tracks.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

            // 8. 拼接专辑内所有歌曲的试听播放器列表 HTML
            const tracksHtml = sortedTracks.map(t => {
                let audioPlayer = "";
                if (t.previewUrl) {
                    audioPlayer = `
<br/>
<audio controls src="${t.previewUrl}" preload="none" style="width: 100%; max-width: 350px; height: 30px; margin-top: 4px;">
</audio>`;
                }
                return `
<li style="margin-bottom: 12px;">
    <strong>${t.trackNumber }. ${t.trackName}</strong>
    ${audioPlayer}
</li>`;
            }).join("");

            // 9. 组装完整的 HTML 正文
            const fullContent = `
<div>
    <p><img src="${hdArtwork}" width="300" alt="${title}" /></p>
    <p><strong>发行类型:</strong> ${typeLabel}</p>
    <p><strong>发布日期:</strong> ${releaseDate.toLocaleDateString('zh-CN')}</p>
    <p><strong>版权信息:</strong> ${album.copyright || "暂无"}</p>
    
    <hr />
    <h3>曲目列表 & 试听：</h3>
    <ol style="padding-left: 20px;">
        ${tracksHtml || "<li>暂无曲目数据</li>"}
    </ol>
    <hr />
</div>
`;

            // 10. 作为一个 item 塞入 feed
            feed.addItem({
                title: title,
                link: itemUrl,
                content: fullContent,
                author: [
                    {
                        name: artistName
                    }
                ],
            });
        }

        return feed.rss2();
    } catch (error) {
        // 出错后直接返回报错文本，包含捕获到的 API 错误或自定义 Error 内容
        return `iTunes RSS 生成失败: ${error.message}`;
    }
}