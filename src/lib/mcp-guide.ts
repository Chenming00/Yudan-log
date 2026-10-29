// Shared by the server and the public guide so tool names stay in sync.
export const MCP_TOOLS = {
  list_transactions: { title: '查询账单', summary: '按月份、分类、收支类型或关键词筛选，支持翻页。', readOnly: true },
  get_monthly_summary: { title: '月度汇总', summary: '查看指定月份的收支、分类统计和每日支出。', readOnly: true },
  add_transaction: { title: '记一笔', summary: '新增收入或支出，可记录品牌、商品、分类和备注。', readOnly: false },
  edit_transaction: { title: '修改账单', summary: '先查询账单，再带上记录版本修改指定字段。', readOnly: false },
  delete_transaction: { title: '删除账单', summary: '先查询并确认目标，再带上记录版本删除。', readOnly: false },
  get_dashboard: { title: '读取健康档案', summary: '查看鱼蛋的出生日期、体重和实际接种记录。', readOnly: true },
  get_vaccine_schedule: { title: '查询疫苗计划', summary: '查看标准疫苗名称、剂次、计划 ID 和接种日期。', readOnly: true },
  get_care_schedule: { title: '查询儿保安排', summary: '查看已配置的儿保时间与项目。', readOnly: true },
  save_weight: { title: '记录体重', summary: '按测量日期保存公斤数，更新前核对记录版本。', readOnly: false },
  save_vaccination: { title: '登记接种', summary: '按疫苗计划 ID 保存实际接种日期。', readOnly: false },
} as const;

export const MCP_EXAMPLES = [
  '帮我汇总 2026 年 10 月的支出，看看主要花在哪些分类。',
  '查一下最近买奶粉的账单，按时间列出来。',
  '记一笔：今天买奶瓶花了 29.9 元，分类是喂养用品。',
  '查看鱼蛋的体重记录，再帮我记录今天的体重 5.2 公斤。',
  '先列出乙肝疫苗的计划和已接种情况，等我确认剂次后再登记。',
];
