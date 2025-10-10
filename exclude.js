/**
 * 节点黑名单过滤脚本
 * 用法：Sub-Store 脚本操作添加，并在 rename.js 之前执行
 */

// ** 替换成您实际的 GitHub RAW 文件链接 **
const BLACKLIST_URL = "https://raw.githubusercontent.com/MonoChromeCN/Dedupe/refs/heads/main/blacklist.txt";

/**
 * 异步获取黑名单内容并过滤节点
 * @param {Array<Object>} proxies 原始代理节点列表
 * @returns {Array<Object>} 过滤后的代理节点列表
 */
async function operator(proxies) {
    console.log("开始加载远程黑名单...");
    let blacklist = [];

    try {
        // 尝试从远程 URL 获取黑名单内容
        const response = await fetch(BLACKLIST_URL);
        if (!response.ok) {
            console.error(`加载黑名单失败，状态码: ${response.status}`);
            // 如果加载失败，不执行过滤，直接返回原始列表
            return proxies;
        }

        const text = await response.text();
        // 将文件内容按行分割，并过滤掉空行和空白字符
        blacklist = text.split(/[\r\n]+/)
                        .map(item => item.trim().replace(/[\t\s\uFEFF\xA0]+/g, '')) // 清理制表符、全角空格等
                        .filter(item => item.length > 0);
        
        console.log(`成功加载 ${blacklist.length} 个黑名单关键词。`);

    } catch (error) {
        console.error("加载黑名单发生异常:", error);
        return proxies; // 发生异常时，返回原始列表
    }

    if (blacklist.length === 0) {
        console.log("黑名单为空，无需过滤。");
        return proxies;
    }

    // 核心过滤逻辑
    const filteredProxies = proxies.filter(proxy => {
        let isBlocked = false;
        
        // 遍历节点对象的所有属性（如 server, port, type, name, host 等）
        for (const key in proxy) {
            if (proxy.hasOwnProperty(key)) {
                const value = proxy[key];

                // 确保值是字符串，才进行关键词匹配
                if (typeof value === 'string') {
                    // 检查该属性值是否包含黑名单中的任意关键词
                    const matchedKey = blacklist.find(keyword => 
                        value.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    if (matchedKey) {
                        isBlocked = true;
                        console.log(`[已排除] 节点: ${proxy.name} (原因: 属性 ${key} 包含关键词 "${matchedKey}")`);
                        break; // 找到一个匹配项即可排除，无需检查其他属性
                    }
                }
            }
        }
        
        // 返回 false 表示排除该节点，返回 true 表示保留该节点
        return !isBlocked;
    });

    console.log(`黑名单过滤完成。保留节点数: ${filteredProxies.length} / 原始节点数: ${proxies.length}`);
    return filteredProxies;
}
