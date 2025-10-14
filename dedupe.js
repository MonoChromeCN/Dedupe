function operator(proxies) {
    console.log("开始执行去重脚本...");
    const dedupeMap = new Map();

    proxies.forEach((proxy) => {
        // 1. 复制所有节点属性到新对象
        const keyObject = {};
        for (const prop in proxy) {
            if (proxy.hasOwnProperty(prop)) {
                keyObject[prop] = proxy[prop];
            }
        }

        // 2. 移除不参与比对的属性
        // 这些属性（名称、密码、认证信息、指纹）不同不影响去重判断。
        delete keyObject.name;
        delete keyObject.uuid;
        delete keyObject.password;
        delete keyObject.auth;
        delete keyObject.country;
        delete keyObject.username;
        delete keyObject["client-fingerprint"];
        delete keyObject.udp;
        
        // 建议移除：由平台添加的内部属性
        delete keyObject.tag;
        delete keyObject.group;
        delete keyObject.node_name;  // 某些工具可能用这个字段区分
        delete keyObject.subscription_name; // 订阅名称
        delete keyObject.source_url; // 原始订阅链接

        // 3. 将剩余属性对象转换为一个稳定的字符串 Key (配置指纹)
        const key = JSON.stringify(keyObject);

        // 4. 使用 Map 记录唯一节点：只保留第一个遇到的配置
        if (!dedupeMap.has(key)) {
            dedupeMap.set(key, proxy);
        }
    });

    // 5. 用去重后的节点列表替换原始列表
    const deduplicatedProxies = Array.from(dedupeMap.values());

    console.log(`去重完成。保留节点数: ${deduplicatedProxies.length} / 原始节点数: ${proxies.length}`);

    // 返回去重后的列表，供下一个脚本 (rename.js) 使用
    return deduplicatedProxies;
}
