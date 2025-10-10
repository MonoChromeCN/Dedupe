const BLACKLIST_URL = "https://raw.githubusercontent.com/MonoChromeCN/Dedupe/refs/heads/main/blacklist.txt";

/**
 * 递归提取对象中所有字符串值
 */
function extractStrings(obj, collector = []) {
    if (obj == null) return collector;

    if (typeof obj === 'string') {
        collector.push(obj);
    } else if (typeof obj === 'object') {
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            extractStrings(obj[key], collector);
        }
    }
    return collector;
}

/**
 * 异步黑名单过滤器
 */
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

    // 深度扫描过滤
    const filteredProxies = proxies.filter(proxy => {
        // 提取所有字符串属性，包括深层嵌套
        const allStrings = extractStrings(proxy).map(v => v.trim().toLowerCase());
        const matched = blacklist.find(word =>
            allStrings.some(str => str.includes(word.toLowerCase()))
        );

        if (matched) {
            console.log(`[已排除] 节点: ${proxy.name} (原因: 属性值中含 "${matched}")`);
            return false;
        }

        return true;
    });

    console.log(`过滤完成：保留 ${filteredProxies.length} / 原始 ${proxies.length}`);
    return filteredProxies;
}
