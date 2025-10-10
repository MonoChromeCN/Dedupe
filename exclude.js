const BLACKLIST_URL = "https://raw.githubusercontent.com/MonoChromeCN/Dedupe/refs/heads/main/blacklist.txt";
/**
 * 节点黑名单过滤脚本 - 最终修正版（支持深度嵌套搜索和兼容性优化）
 */
// ===============================================
// 递归深度搜索函数 (保持不变)
// ===============================================
function deepSearch(obj, blacklistRegexArray) {
    if (typeof obj !== 'object' || obj === null) {
        return null;
    }

    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        const value = obj[key];

        if (typeof value === 'string') {
            const matchedRegex = blacklistRegexArray.find(regex => regex.test(value));
            if (matchedRegex) {
                return matchedRegex.source.replace(/\\/g, '');
            }
        } else if (typeof value === 'object' && value !== null) {
            const deepMatch = deepSearch(value, blacklistRegexArray);
            if (deepMatch) {
                return deepMatch;
            }
        }
    }
    return null;
}

// ===============================================
// 异步加载和处理黑名单的函数 (新增/优化)
// ===============================================
async function loadAndProcessBlacklist() {
    let blacklistRegexArray = [];
    try {
        const response = await fetch(BLACKLIST_URL);
        if (!response.ok) {
            console.error(`加载黑名单失败，状态码: ${response.status}`);
            return null; // 返回 null 表示加载失败
        }

        const text = await response.text();
        
        // 严格解析并对关键词进行正则转义
        blacklistRegexArray = text.split(/[\r\n]+/)
            .map(item => item.trim().replace(/[\t\s\uFEFF\xA0]+/g, ''))
            .filter(item => item.length > 0)
            .map(keyword => {
                const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return new RegExp(safeKeyword, 'gi'); 
            });
        
        console.log(`成功加载 ${blacklistRegexArray.length} 个黑名单关键词。`);
        return blacklistRegexArray;

    } catch (error) {
        console.error("加载黑名单发生异常:", error);
        return null; // 返回 null 表示发生异常
    }
}


// ===============================================
// 主操作函数 (operator) - 修正了返回逻辑
// ===============================================
async function operator(proxies) {
    console.log("开始执行黑名单过滤脚本...");
    
    // 1. 等待加载并处理黑名单
    const blacklistRegexArray = await loadAndProcessBlacklist();
    
    // 2. 检查黑名单是否有效
    if (blacklistRegexArray === null || blacklistRegexArray.length === 0) {
        // 如果加载失败或黑名单为空，直接返回原始列表
        if (blacklistRegexArray === null) {
             console.log("黑名单加载失败，跳过过滤。");
        } else {
             console.log("黑名单为空，跳过过滤。");
        }
        return proxies;
    }

    // 3. 核心过滤逻辑
    const filteredProxies = proxies.filter(proxy => {
        // 使用递归函数对整个节点对象进行深度搜索
        const matchedKey = deepSearch(proxy, blacklistRegexArray);

        if (matchedKey) {
            console.log(`[已排除] 节点: ${proxy.name} (原因: 节点配置包含关键词 "${matchedKey}")`);
            return false; // 排除
        }
        
        return true; // 保留
    });

    console.log(`黑名单过滤完成。保留节点数: ${filteredProxies.length} / 原始节点数: ${proxies.length}`);
    return filteredProxies;
}
