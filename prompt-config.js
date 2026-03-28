window.ReportPromptConfig = (() => {
  const STORAGE_KEY = "report-agent-prompts";

  const defaults = {
    requirementCompleteSystem:
      "你是一名资深方案顾问，只能基于用户输入的原始需求做扩写细化，不得改变主题，不得新增用户未提及的业务方向、项目主体、目标对象、交付类型、行业赛道或实施结论。输出必须是可直接填写到方案需求输入框中的中文正文。",
    requirementCompleteUser:
      "请严格基于下面这段方案需求做扩写细化。\n\n原始需求：\n{{requirement}}\n\n任务要求：\n1. 只能基于原文已有信息扩写，不得引入原文没有提到的新主题、新行业、新角色、新任务。\n2. 可以把原文中已有的项目背景、目标、交付对象、内容要求、风格偏好、时间要求、重点章节等信息补充得更完整、更清晰。\n3. 若原文未提及某项信息，不要擅自补充具体事实，只能用中性表述保留空位，例如“如有时间要求可进一步明确”。\n4. 保留原始需求的核心意思与边界，不要改写成另一种方案。\n5. 输出为完整中文正文，不要使用 Markdown，不要加标题，不要加解释说明。\n6. 输出长度控制在原文的 1.5 到 2.5 倍。",
    outlineLevelOneSystem: "你是一名资深方案架构顾问。必须严格输出 JSON。",
    outlineLevelOneUser:
      "请基于以下方案需求和附件信息，先规划完整的一级标题结构。\n\n方案名称：{{planName}}\n方案需求：\n{{requirement}}\n\n附件信息：\n{{attachmentContext}}\n\n输出要求：\n1. 仅输出 JSON 数组。\n2. 每项结构必须为 {\"id\":\"1\",\"title\":\"一级标题\",\"thought\":\"本一级标题的写作思路\"}。\n3. 至少输出 3 个一级标题。\n4. thought 需要说明该一级标题边界、目标和细化方向。\n5. 不要输出任何解释性文字。",
    outlineDetailSystem: "你是一名资深方案架构顾问。只能输出纯文本目录。",
    outlineDetailUser:
      "请针对一级标题“{{topLevelId}} {{topLevelTitle}}”继续扩展详细大纲。\n\n方案名称：{{planName}}\n整体需求：\n{{requirement}}\n\n附件信息：\n{{attachmentContext}}\n\n一级标题思路：\n{{thought}}\n\n输出要求：\n1. 仅输出当前一级标题及其下属目录。\n2. 一级标题固定为 {{topLevelId}} {{topLevelTitle}}。\n3. 必须展开到 3 至 5 级标题。\n4. 每行一个目录项。\n5. 编号必须严格使用以下格式：\n{{topLevelId}} 一级标题\n{{topLevelId}}.1 二级标题\n{{topLevelId}}.1.1 三级标题\n{{topLevelId}}.1.1.1 四级标题\n{{topLevelId}}.1.1.1.1 五级标题\n6. 不要输出 Markdown 或解释性文字。",
    outlineRegenerateSystem: "你是一名资深方案架构顾问。只能输出纯文本目录。",
    outlineRegenerateUser:
      "请只重写一级目录“{{groupTitle}}”及其下属目录。\n\n方案名称：{{planName}}\n原始需求：\n{{requirement}}\n\n附件信息：\n{{attachmentContext}}\n\n补充思路：\n{{thought}}\n\n层级规则：\n1. 第一行必须输出：{{topLevelId}} {{groupTitle}}。\n2. 一级目录“{{topLevelId}} {{groupTitle}}”固定视为第 1 级标题。\n3. 本次输出必须严格截止到第 {{maxLevel}} 级标题。\n4. 不得输出任何超过第 {{maxLevel}} 级的目录项。\n5. 仅允许输出当前一级目录及其子目录，不得输出其他一级目录编号。\n6. 每行一个目录项，编号必须严格使用纯数字层级。\n7. 不得输出解释、说明、Markdown、代码块、思考过程、前后说明文字。\n\n示例：\n- 若 {{maxLevel}} = 3，则允许：{{topLevelId}} / {{topLevelId}}.1 / {{topLevelId}}.1.1；禁止：{{topLevelId}}.1.1.1\n- 若 {{maxLevel}} = 4，则允许：{{topLevelId}} / {{topLevelId}}.1 / {{topLevelId}}.1.1 / {{topLevelId}}.1.1.1；禁止：{{topLevelId}}.1.1.1.1\n\n输出要求：\n1. 仅输出目录正文。\n2. 每行一个目录项。\n3. 若无法满足其他要求，也必须优先遵守层级规则和编号规则。",
    documentNodeSystem:
      "你是一名顶级企业方案撰写顾问，擅长输出科技项目正式文档正文。必须严格输出 JSON。",
    documentNodeUser:
      "请为正式科技公司方案文档撰写章节“{{nodeId}} {{nodeTitle}}”。\n\n报告标题：{{planName}}\n整体需求：\n{{requirement}}\n\n附件信息：\n{{attachmentContext}}\n\n{{nodeRoleInstruction}}\n{{nodeBoundaryInstruction}}\n\n{{childSummaryLabel}}\n{{childSummaries}}\n\n输出格式要求：\n1. 仅输出 JSON。\n2. JSON 结构必须为 {\"title\":\"章节标题\",\"paragraphs\":[\"段落1\",\"段落2\"]}。\n3. paragraphs 中每一项都是完整自然段，不要编号。\n4. 不要输出 Markdown，不要输出额外解释。\n5. title 必须严格等于“{{nodeId}} {{nodeTitle}}”。"
  };

  function sanitizeConfig(input) {
    const next = {};
    Object.keys(defaults).forEach((key) => {
      const value = input && typeof input[key] === "string" ? input[key].trim() : "";
      next[key] = value || defaults[key];
    });
    return next;
  }

  function getConfig() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaults };
    }

    try {
      const parsed = JSON.parse(raw);
      return sanitizeConfig(parsed);
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      return { ...defaults };
    }
  }

  function saveConfig(config) {
    const sanitized = sanitizeConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  }

  function resetConfig() {
    localStorage.removeItem(STORAGE_KEY);
    return { ...defaults };
  }

  function render(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = vars && vars[key] != null ? String(vars[key]) : "";
      return value;
    });
  }

  return {
    STORAGE_KEY,
    defaults,
    getConfig,
    saveConfig,
    resetConfig,
    render
  };
})();
