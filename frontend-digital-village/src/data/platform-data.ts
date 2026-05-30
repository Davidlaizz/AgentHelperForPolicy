export const featuredQuestions = [
  "买农机能不能申请补贴？",
  "我们村苹果卖不出去，能做什么数字化项目？",
  "办合作社需要哪些材料？",
  "返乡创业有没有贷款优惠？",
];

export type PolicyAnswer = {
  id: string;
  question: string;
  conclusion: string;
  policies: string[];
  conditions: string[];
  materials: string[];
  department: string;
  risk: string;
  evidence: Array<{ source: string; quote: string }>;
};

export const policyAnswers: PolicyAnswer[] = [
  {
    id: "farm-machine-subsidy",
    question: "买农机能不能申请补贴？",
    conclusion:
      "通常需要看购买机具是否在当地补贴目录内、购机主体是否符合要求、是否完成购机发票和机具核验。建议先按“目录匹配、主体确认、材料准备、县级咨询”四步判断。",
    policies: ["农机购置与应用补贴政策", "农业机械化和农机装备发展支持政策"],
    conditions: ["主体为农户、合作社、家庭农场或农业经营组织", "拟购买机具属于补贴目录", "购机行为、发票、机具信息可核验"],
    materials: ["身份证明或主体登记材料", "购机发票", "银行卡或对公账户", "机具铭牌照片", "县级农业农村部门要求的其他材料"],
    department: "县级农业农村局、农机服务中心或乡镇农业综合服务站。",
    risk: "补贴目录、额度和申请窗口以当地当年通知为准，跨地区购买或先买后补事项需要人工确认。",
    evidence: [
      {
        source: "农业机械化相关政策摘要",
        quote: "补贴对象、补贴机具范围和办理流程由省级及地方主管部门按年度组织实施。",
      },
      {
        source: "县域农机补贴办理口径",
        quote: "申请前应核对补贴目录、经销资质、发票信息和机具核验要求。",
      },
    ],
  },
  {
    id: "return-home-loan",
    question: "返乡创业有没有贷款优惠？",
    conclusion:
      "返乡创业通常可以关注创业担保贷款、一次性创业补贴、就业创业服务和乡村产业项目扶持。是否可享受取决于身份、注册状态、经营项目、征信和当地政策。",
    policies: ["创业担保贷款政策", "返乡入乡创业支持政策", "乡村产业发展扶持政策"],
    conditions: ["属于返乡创业人员或就业重点群体", "项目具备真实经营场景", "符合当地担保贷款申请条件", "无明显信用风险"],
    materials: ["身份证明", "营业执照或项目说明", "经营场所证明", "贷款用途说明", "就业创业部门要求的申请表"],
    department: "人社部门、公共就业服务机构、经办银行、乡镇便民服务中心。",
    risk: "贷款额度、贴息比例、担保方式和申请材料存在地区差异，正式申请前应核对县区最新通知。",
    evidence: [
      {
        source: "就业创业政策摘要",
        quote: "返乡创业人员可按规定享受创业担保贷款、创业服务和相关补贴支持。",
      },
    ],
  },
  {
    id: "cooperative-project",
    question: "合作社能申请哪些农业项目？",
    conclusion:
      "合作社可重点关注农业社会化服务、农产品品牌建设、冷链仓储、农机农技、数字农业示范和村集体经济联动项目。",
    policies: ["新型农业经营主体扶持政策", "农业社会化服务项目", "数字农业和农产品产地冷链支持政策"],
    conditions: ["合作社依法登记并正常运营", "有成员、土地或服务对象基础", "项目具备带农助农效果", "财务和经营记录相对规范"],
    materials: ["合作社营业执照", "章程和成员名册", "经营记录", "项目建设方案", "带农助农证明材料"],
    department: "农业农村局、乡村振兴部门、供销社、乡镇农业综合服务站。",
    risk: "多数项目有申报窗口和绩效要求，建议先做项目台账、服务对象清单和资金测算。",
    evidence: [
      {
        source: "新型农业经营主体扶持政策摘要",
        quote: "支持合作社、家庭农场等主体提升生产经营、服务带动和品牌建设能力。",
      },
    ],
  },
  {
    id: "live-commerce",
    question: "我想做农产品直播，有没有政策支持？",
    conclusion:
      "可以关注农村电商、直播助农、农产品品牌、就业创业培训和数字乡村建设相关政策。政策通常更支持培训、品牌、公共服务站点和产销对接。",
    policies: ["农村电商高质量发展政策", "数字乡村建设政策", "农产品品牌培育政策"],
    conditions: ["有稳定农产品或乡村服务内容", "具备质量追溯和售后能力", "愿意参加电商培训或纳入服务站点", "不夸大宣传产品功效"],
    materials: ["主体身份证明", "产品信息", "产地或质量证明", "直播账号和经营计划", "培训或服务站申请材料"],
    department: "商务部门、农业农村部门、乡镇电商服务站、就业创业服务机构。",
    risk: "直播销售涉及食品安全、广告合规、平台规则和售后责任，政策支持不等于免除经营责任。",
    evidence: [
      {
        source: "农村电商政策摘要",
        quote: "鼓励完善农村电商公共服务体系，促进农产品上行和农民增收。",
      },
    ],
  },
];

export const fallbackPolicyAnswer: PolicyAnswer = {
  id: "general",
  question: "通用政策咨询",
  conclusion:
    "这个问题可以先按“地区、主体、事项、材料、办理部门”五个要素拆开判断。系统会先给出通用判断框架，再提示需要补充的关键信息。",
  policies: ["数字乡村政策库", "乡村振兴政策库"],
  conditions: ["明确所在地区", "明确身份或主体类型", "明确要办理或咨询的事项"],
  materials: ["身份证明", "主体登记材料", "事项说明", "当地主管部门要求的补充材料"],
  department: "建议先咨询乡镇便民服务中心，再由其转接农业农村、人社、商务、民政等部门。",
  risk: "政策执行存在地区差异，正式办理前必须核对当地最新政策和窗口要求。",
  evidence: [
    {
      source: "数字乡村政策知识库",
      quote: "系统按照地区、主体、事项、材料和办理部门组织政策咨询结果。",
    },
  ],
};

export type AgricultureScenario = {
  id: string;
  title: string;
  question: string;
  category: string;
  painPoints: string[];
  actors: string[];
  directions: string[];
  policyLinks: string[];
  steps: string[];
  metrics: string[];
  risks: string[];
};

export const agricultureScenarios: AgricultureScenario[] = [
  {
    id: "apple-sales",
    title: "苹果卖不出去",
    question: "我们村苹果卖不出去，能做什么数字化项目？",
    category: "农产品销售与品牌建设",
    painPoints: ["销售渠道单一", "缺少统一品牌", "客户数据无法沉淀", "物流和售后能力弱"],
    actors: ["果农", "村集体", "合作社", "电商服务站", "学生实践团队"],
    directions: ["建立村级产品台账", "设计直播助农培训", "建设品牌包装和溯源码", "对接社区团购和电商平台"],
    policyLinks: ["农村电商公共服务", "农产品品牌培育", "数字乡村建设", "返乡创业培训"],
    steps: ["盘点苹果品种、产量和价格", "筛选 3 个适合直播的标准化单品", "组织直播培训和短视频素材采集", "试点 2 周线上预售", "复盘销量、客单价、复购和退货原因"],
    metrics: ["上线商品数", "直播场次", "订单量", "复购率", "带动农户数", "平均增收"],
    risks: ["质量分级不清会造成售后风险", "物流成本可能吞噬利润", "直播宣传不能夸大功效"],
  },
  {
    id: "smart-agriculture-site",
    title: "智慧农业示范点",
    question: "村里想做智慧农业示范点，应该从哪里开始？",
    category: "农业生产数字化",
    painPoints: ["缺少数据基础", "设备投入目标不清", "农户参与度不稳定", "示范效果难量化"],
    actors: ["村委会", "合作社", "农业企业", "农技人员", "设备服务商"],
    directions: ["先选一个小场景试点", "建立生产数据采集表", "部署低成本传感或巡田记录", "形成示范指标看板"],
    policyLinks: ["数字农业试点", "农技推广", "农业社会化服务", "村集体经济项目"],
    steps: ["确定作物和地块", "梳理水肥、病虫害、用工痛点", "选择 1 到 2 类低成本设备", "建立巡检和数据记录制度", "用一个生产周期验证收益"],
    metrics: ["亩均产量", "水肥用量", "病虫害预警次数", "人工巡检次数", "投入产出比"],
    risks: ["设备不是目标，先证明问题和收益", "后续运维人员必须提前明确"],
  },
  {
    id: "live-training",
    title: "直播工具不会用",
    question: "农民不会用直播工具，怎么设计培训方案？",
    category: "数字能力培训",
    painPoints: ["工具门槛高", "话术和镜头感不足", "选品和售后不规范", "培训后缺少持续陪跑"],
    actors: ["农户", "返乡青年", "电商服务站", "高校志愿团队", "乡镇干部"],
    directions: ["分层培训", "模板化话术", "建立样品间", "用小规模真实直播验证"],
    policyLinks: ["职业技能培训", "农村电商培训", "青年红色筑梦之旅", "数字乡村人才培养"],
    steps: ["做 30 分钟工具入门", "拆解 3 个本地产品卖点", "演练 5 分钟直播话术", "组织一次低风险试播", "用数据复盘并沉淀脚本"],
    metrics: ["培训人数", "试播人数", "短视频发布数", "直播转化率", "售后问题数"],
    risks: ["培训不能只讲理论", "食品类商品要强调合规和售后"],
  },
  {
    id: "collective-economy",
    title: "村集体经济收入低",
    question: "村集体经济收入低，能不能用数字化办法提升？",
    category: "村集体经济数字化运营",
    painPoints: ["资产资源摸不清", "经营项目分散", "收入来源单一", "村民参与和监督不足"],
    actors: ["村集体", "村民代表", "合作社", "乡镇政府", "运营服务团队"],
    directions: ["建立资源资产台账", "筛选可运营资产", "设计数字化公示和预约", "联动电商、文旅或服务站"],
    policyLinks: ["发展新型农村集体经济", "乡村治理", "数字乡村建设", "农村公共服务"],
    steps: ["盘点土地、房屋、设备和特色资源", "确定 1 个低风险经营切入点", "建立收支和服务记录", "上线预约、报名或销售入口", "定期公示运营结果"],
    metrics: ["资源入库数", "项目收入", "服务人次", "村民参与数", "公示次数"],
    risks: ["涉及集体资产时需要民主决策和财务公开", "不能把数字化包装成脱离实际的大项目"],
  },
];

export type GuideCase = {
  id: string;
  title: string;
  subject: string;
  region: string;
  stage: string;
  materials: Array<{ name: string; required: boolean }>;
  steps: string[];
  department: string;
  risk: string;
  tips: string[];
};

export const guideCases: GuideCase[] = [
  {
    id: "machine-subsidy",
    title: "农机购置补贴",
    subject: "农户、合作社、家庭农场、农业经营主体",
    region: "县级农业农村部门按年度通知执行",
    stage: "购机前咨询或购机后申请核验",
    materials: [
      { name: "身份证明或主体登记材料", required: true },
      { name: "购机发票", required: true },
      { name: "银行卡或对公账户", required: true },
      { name: "机具铭牌和现场照片", required: true },
      { name: "补贴目录匹配证明", required: false },
    ],
    steps: ["查询当地补贴目录", "确认经销商和机具信息", "购买并留存发票", "提交申请材料", "接受机具核验", "等待资金兑付"],
    department: "县级农业农村局、农机服务中心、乡镇农业综合服务站。",
    risk: "先买后补存在目录不匹配风险，建议购机前先咨询当地主管部门。",
    tips: ["目录、额度、窗口期每年可能变化", "发票抬头和申请主体要一致"],
  },
  {
    id: "startup-loan",
    title: "返乡创业贷款",
    subject: "返乡创业人员、就业重点群体、小微经营主体",
    region: "县区人社部门和经办银行联合办理",
    stage: "项目启动、已注册经营或扩大发展",
    materials: [
      { name: "身份证明", required: true },
      { name: "营业执照或项目说明", required: true },
      { name: "经营场所证明", required: false },
      { name: "贷款用途说明", required: true },
      { name: "征信或担保相关材料", required: false },
    ],
    steps: ["咨询创业担保贷款窗口", "确认身份和额度", "准备经营材料", "提交申请", "银行尽调", "审批放款和贴息管理"],
    department: "人社局、公共就业服务机构、经办银行、乡镇便民服务中心。",
    risk: "贷款政策受征信、担保、经营真实性影响，不能只凭身份直接判断。",
    tips: ["先准备项目现金流说明", "不要把贷款用途写得过于笼统"],
  },
  {
    id: "cooperative-register",
    title: "合作社办理",
    subject: "有共同农业经营或服务需求的成员",
    region: "市场监管窗口和乡镇指导服务",
    stage: "拟成立或准备规范化运营",
    materials: [
      { name: "成员身份证明", required: true },
      { name: "合作社章程", required: true },
      { name: "成员大会决议", required: true },
      { name: "住所或经营场所证明", required: true },
      { name: "经营范围说明", required: false },
    ],
    steps: ["确定成员和经营范围", "起草章程", "召开设立会议", "准备登记材料", "到市场监管窗口登记", "办理税务、账户和后续备案"],
    department: "市场监督管理部门、乡镇农业综合服务站、政务服务中心。",
    risk: "合作社不是简单注册主体，后续财务、成员权益和带农服务要规范。",
    tips: ["章程要明确出资、分配和退出规则", "建议同步建立成员和服务台账"],
  },
  {
    id: "medical-service",
    title: "医保养老代办",
    subject: "老年人、行动不便群众、村级代办员",
    region: "乡镇便民服务中心和村级服务站",
    stage: "缴费、认证、查询或材料代交",
    materials: [
      { name: "本人身份证或社保卡", required: true },
      { name: "代办人身份证明", required: true },
      { name: "授权或委托说明", required: false },
      { name: "手机号码", required: false },
    ],
    steps: ["确认具体事项", "核验本人和代办人身份", "通过官方渠道办理", "保存办理凭证", "向本人或家属反馈结果"],
    department: "乡镇便民服务中心、村级服务站、医保或社保经办机构。",
    risk: "涉及个人信息和资金缴纳，代办必须留痕并避免使用非官方链接。",
    tips: ["代办记录要写清时间、事项和结果", "涉及缴费时建议现场确认金额"],
  },
];

export const caseItems = [
  {
    title: "农业补贴",
    target: "农户、合作社、家庭农场",
    question: "哪些补贴能申请，是否需要先备案？",
    materials: "身份证明、主体材料、项目说明、票据证明",
    route: "政策问答",
  },
  {
    title: "农机购置",
    target: "农机购买者和服务组织",
    question: "目录内机具如何申报补贴？",
    materials: "购机发票、银行卡、机具照片、核验材料",
    route: "办事引导",
  },
  {
    title: "农产品电商",
    target: "农户、合作社、返乡创业者",
    question: "直播助农和平台入驻有哪些支持？",
    materials: "产品信息、质量证明、账号资料、经营计划",
    route: "智慧农业",
  },
  {
    title: "返乡创业",
    target: "返乡青年、毕业生、农民工",
    question: "能否申请贷款、补贴和培训？",
    materials: "身份证明、营业执照、项目说明、贷款用途",
    route: "政策问答",
  },
  {
    title: "合作社办理",
    target: "成员联合经营或服务组织",
    question: "注册合作社要准备什么？",
    materials: "章程、成员材料、会议决议、住所证明",
    route: "办事引导",
  },
  {
    title: "村集体经济",
    target: "村委会、村集体经济组织",
    question: "如何把资产资源转成经营项目？",
    materials: "资产台账、决策记录、项目方案、财务记录",
    route: "智慧农业",
  },
  {
    title: "智慧农业建设",
    target: "示范村、合作社、农业企业",
    question: "从哪个场景开始试点最合适？",
    materials: "地块信息、作物数据、设备方案、绩效指标",
    route: "智慧农业",
  },
  {
    title: "社区治理",
    target: "城乡社区、村干部、服务人员",
    question: "如何沉淀诉求、服务和办理记录？",
    materials: "服务事项、居民诉求、办理台账、反馈记录",
    route: "管理后台",
  },
  {
    title: "农村公共服务",
    target: "老人、困难群众、村级代办员",
    question: "医保、养老、低保等事项如何代办？",
    materials: "身份证明、授权材料、申请表、证明材料",
    route: "办事引导",
  },
];

export const policyDocuments = [
  {
    title: "数字乡村建设指南",
    category: "数字乡村建设",
    level: "国家",
    subject: "村集体、基层政府、服务企业",
    summary: "围绕乡村数字基础设施、数字治理、智慧农业和公共服务建设形成行动框架。",
    snippet: "推进农业农村数据资源整合共享，提升乡村治理和公共服务数字化水平。",
  },
  {
    title: "乡村振兴重点帮扶政策摘编",
    category: "乡村振兴",
    level: "国家/省级",
    subject: "农户、村集体、合作社",
    summary: "覆盖产业发展、人才培育、公共服务和乡村治理等重点方向。",
    snippet: "强化产业联农带农机制，促进农民增收和农村集体经济发展。",
  },
  {
    title: "农机购置与应用补贴办理要点",
    category: "农业补贴",
    level: "省/县",
    subject: "购机农户、合作社、农业经营主体",
    summary: "说明补贴对象、补贴范围、申请材料、机具核验和资金兑付要点。",
    snippet: "申请主体应按照当地年度通知提交材料并配合机具核验。",
  },
  {
    title: "农村电商与农产品上行支持政策",
    category: "农产品电商",
    level: "市/县",
    subject: "农户、合作社、返乡创业者",
    summary: "支持农村电商公共服务、直播助农培训、品牌培育和产销对接。",
    snippet: "完善县乡村三级电商服务体系，推动农产品线上销售和品牌化经营。",
  },
  {
    title: "创业担保贷款和返乡创业服务清单",
    category: "返乡创业",
    level: "县区",
    subject: "返乡创业人员、就业重点群体",
    summary: "梳理贷款申请、贴息支持、创业培训和项目孵化服务流程。",
    snippet: "符合条件的创业人员可按规定申请创业担保贷款和贴息支持。",
  },
  {
    title: "城乡社区治理数字化服务要点",
    category: "社区治理",
    level: "市/县",
    subject: "村干部、社区工作者、基层服务人员",
    summary: "聚焦诉求收集、服务办理、台账留痕、风险提醒和群众反馈闭环。",
    snippet: "推动基层治理服务数据化、流程化和可追踪，提升群众服务体验。",
  },
];

export const dashboardMetrics = [
  { label: "今日咨询数", value: "128", note: "政策、农业和办事问题合计", tone: "green" as const },
  { label: "服务事项", value: "36", note: "覆盖补贴、创业、公共服务", tone: "blue" as const },
  { label: "材料缺口", value: "19", note: "高频缺口可反向优化流程", tone: "amber" as const },
  { label: "项目线索", value: "12", note: "可转化为红旅和乡村项目", tone: "red" as const },
];

export const hotQuestions = [
  { question: "买农机能不能申请补贴？", category: "农业补贴", count: 31, time: "今日 10:24" },
  { question: "返乡创业贷款怎么申请？", category: "返乡创业", count: 24, time: "今日 09:18" },
  { question: "合作社注册需要哪些材料？", category: "办事引导", count: 19, time: "昨日 17:42" },
  { question: "村里苹果卖不出去怎么办？", category: "智慧农业", count: 16, time: "昨日 15:36" },
  { question: "老人医保缴费能不能代办？", category: "公共服务", count: 11, time: "昨日 11:05" },
];

export const agentTrace = [
  "识别用户主体和地区",
  "判断政策问答、智慧农业或办事引导场景",
  "检索数字乡村政策片段",
  "生成条件、材料和风险提示",
  "沉淀高频问题和服务线索",
];
