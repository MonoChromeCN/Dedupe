const BLACKLIST_URL = "https://raw.githubusercontent.com/MonoChromeCN/Dedupe/refs/heads/main/blacklist.txt";
// ===============================================
// 新增：递归深度搜索函数
// ===============================================
/**
 * 递归搜索对象中的所有字符串属性，检查是否包含黑名单中的任一正则关键词。
 * @param {Object} obj 要搜索的对象或数组
 * @param {Array<RegExp>} blacklistRegexArray 由正则表达式对象组成的黑名单
 * @returns {string|null} 如果匹配成功，返回匹配到的关键词（用于日志）；否则返回 null。
 */
function deepSearch(obj, blacklistRegexArray) {
    if (typeof obj !== 'object' || obj === null) {
        return null; // 不是对象或数组，停止递归
    }

    // 遍历对象的键或数组的索引
    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        const value = obj[key];

        if (typeof value === 'string') {
            // 核心匹配逻辑：检查当前字符串是否匹配任何黑名单正则
            const matchedRegex = blacklistRegexArray.find(regex => 
                regex.test(value)
            );

            if (matchedRegex) {
                // 找到匹配项，返回匹配的字符串，以便在日志中记录
                return matchedRegex.source.replace(/\\/g, ''); // 移除转义符方便阅读
            }
        } else if (typeof value === 'object' && value !== null) {
            // 如果值是另一个对象或数组，则进行递归调用
            const deepMatch = deepSearch(value, blacklistRegexArray);
            if (deepMatch) {
                return deepMatch; // 如果深层匹配成功，则立即向上返回
            }
        }
    }
    return null; // 遍历完所有属性，未发现匹配项
}


// ===============================================
// 主操作函数 (operator)
// ===============================================
async function operator(proxies) {
    console.log("开始加载远程黑名单...");
    let blacklistRegexArray = [];

    try {
        const response = await fetch(BLACKLIST_URL);
        if (!response.ok) {
            console.error(`加载黑名单失败，状态码: ${response.status}`);
            return proxies;
        }

        const text = await response.text();
        
        // 严格解析并对关键词进行正则转义，创建 RegExp 对象数组
        blacklistRegexArray = text.split(/[\r\n]+/)
            .map(item => item.trim().replace(/[\t\s\uFEFF\xA0]+/g, ''))
            .filter(item => item.length > 0)
            .map(keyword => {
                const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // 创建不区分大小写的正则表达式
                return new RegExp(safeKeyword, 'gi'); 
            });
        
        console.log(`成功加载 ${blacklistRegexArray.length} 个黑名单关键词。`);

    } catch (error) {
        console.error("加载黑名单发生异常:", error);
        return proxies;
    }

    if (blacklistRegexArray.length === 0) {
        console.log("黑名单为空，无需过滤。");
        return proxies;
    }

    // 核心过滤逻辑
    const filteredProxies = proxies.filter(proxy => {
        // 使用递归函数对整个节点对象进行深度搜索
        const matchedKey = deepSearch(proxy, blacklistRegexArray);

        if (matchedKey) {
            // 如果 deepSearch 返回了匹配到的关键词，则排除该节点
            console.log(`[已排除] 节点: ${proxy.name} (原因: 节点深层配置包含关键词 "${matchedKey}")`);
            return false; // 排除
        }
        
        return true; // 保留
    });

    console.log(`黑名单过滤完成。保留节点数: ${filteredProxies.length} / 原始节点数: ${proxies.length}`);
    return filteredProxies;
}

    console.log(`过滤完成：保留 ${filteredProxies.length} / 原始 ${proxies.length}`);
    return filteredProxies;
}
