const BLACKLIST_URL = "https://raw.githubusercontent.com/MonoChromeCN/Dedupe/refs/heads/main/blacklist.txt";

/**
 * 深度提取对象中的所有字符串值
 * @param {Object} obj 任意层级对象
 * @returns {string[]} 所有字符串值的数组
 */
function extractAllStrings(obj) {
    let results = [];

    // 如果是数组，递归每一项
    if (Array.isArray(obj)) {
        for (const item of obj) {
            results = results.concat(extractAllStrings(item));
        }
    }
    // 如果是对象，递归其每个键
    else if (typeof obj === "object" && obj !== null) {
        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            results = results.concat(extractAllStrings(obj[key]));
        }
    }
    // 如果是字符串或数字，统一转为字符串收集
    else if (["string", "number", "boolean"].includes(typeof obj)) {
        results.push(String(obj).trim());
    }

    return results;
}

/**
 * 异步过滤函数
 */
async function operator(proxies) {
    console.log("开始加载远程黑名单...");
    let blacklist = [];

    try {
        const res = await fetch(BLACKLIST_URL);
        if (!res.ok) {
            console.error(`加载黑名单失败，状态码: ${res.status}`);
            return proxies;
        }

        const text = await res.text();
        blacklist = text.split(/[\r\n]+/)
                        .map(x => x.trim().replace(/[\t\s\uFEFF\xA0]+/g, ''))
                        .filter(Boolean);

        console.log(`成功加载 ${blacklist.length} 个黑名单关键词。`);
    } catch (err) {
        console.error("加载黑名单异常:", err);
        return proxies;
    }

    if (blacklist.length === 0) {
        console.log("黑名单为空，无需过滤。");
        return proxies;
    }

    // 核心过滤逻辑：支持递归扫描
    const filtered = proxies.filter(proxy => {
        // 获取所有嵌套的字符串内容
        const values = extractAllStrings(proxy).map(v => v.toLowerCase());

        // 判断是否命中黑名单
        const hit = blacklist.find(keyword => {
            const k = keyword.toLowerCase();
            return values.some(v => v.includes(k));
        });

        if (hit) {
            console.log(`[已排除] 节点: ${proxy.name} (原因: 含黑名单关键词 "${hit}")`);
            return false;
        }

        return true;
    });

    console.log(`过滤完成。保留节点数: ${filtered.length} / 原始节点数: ${proxies.length}`);
    return filtered;
}
