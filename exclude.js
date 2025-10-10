const BLACKLIST_URL = "https://raw.githubusercontent.com/MonoChromeCN/Dedupe/refs/heads/main/blacklist.txt";

async function operator(proxies) {
    console.log("开始加载远程黑名单...");
    let blacklist = [];

    try {
        const response = await fetch(BLACKLIST_URL);
        if (!response.ok) {
            console.error(`加载黑名单失败: ${response.status}`);
            return proxies;
        }

        const text = await response.text();
        blacklist = text.split(/[\r\n]+/)
                        .map(item => item.trim().replace(/[\t\s\uFEFF\xA0]+/g, ''))
                        .filter(Boolean);

        console.log(`成功加载 ${blacklist.length} 个黑名单关键词。`);
    } catch (e) {
        console.error("加载黑名单出错:", e);
        return proxies;
    }

    if (blacklist.length === 0) {
        console.log("黑名单为空，无需过滤。");
        return proxies;
    }

    const filteredProxies = proxies.filter(proxy => {
        for (const key in proxy) {
            if (!proxy.hasOwnProperty(key)) continue;
            const value = String(proxy[key]).trim().toLowerCase();
            const matched = blacklist.find(word => value.includes(word.toLowerCase()));
            if (matched) {
                console.log(`[已排除] 节点: ${proxy.name} (原因: 属性 ${key} 含关键词 "${matched}")`);
                return false;
            }
        }
        return true;
    });

    console.log(`过滤完成：保留 ${filteredProxies.length} / 原始 ${proxies.length}`);
    return filteredProxies;
}
