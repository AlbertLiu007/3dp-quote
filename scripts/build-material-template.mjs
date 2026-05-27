import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outputDir = '/Users/albert/Documents/3dp-auto-quote-local-tool/outputs';
const outputPath = path.join(outputDir, '联泰科技3D打印材料导入模板.xlsx');

const headers = [
  '材料ID',
  '材料名称',
  '工艺',
  '材料特性',
  '密度(g/cm³)',
  '材料克重单价(元/g)',
  '表面积单价(元/mm²)',
  '材料起步价(元)',
  '损耗(%)',
  '利润率(%)',
  '交期(天)',
  '是否启用',
];

const sampleRows = [
  ['pla-fdm-standard', 'PLA', 'FDM', '经济、成型快，适合外观样件和结构验证。', 1.24, 0.08, 0.0008, 25, 6, 38, 2, '是'],
  ['abs-fdm-standard', 'ABS', 'FDM', '韧性和耐温性更好，适合功能验证件。', 1.04, 0.12, 0.001, 35, 9, 42, 3, '是'],
  ['resin-sla-standard', '光敏树脂', 'SLA', '表面细腻，适合高精度外观件和展示样件。', 1.1, 0.18, 0.0016, 55, 8, 45, 3, '是'],
  ['nylon-sls-standard', '尼龙 PA12', 'SLS', '强度和耐用性较好，适合小批量功能件。', 1.01, 0.42, 0.0022, 90, 7, 50, 5, '是'],
];

const fieldRows = [
  ['材料ID', '必填，稳定唯一标识；建议使用英文小写、数字和连字符。导入时用于匹配已有材料。', 'pla-fdm-standard'],
  ['材料名称', '必填，展示给用户看的材料名称。', 'PLA'],
  ['工艺', '必填，可选 FDM、SLA、SLS、MJF。', 'FDM'],
  ['材料特性', '选填，用于前端材料下拉第二行说明。', '经济、成型快，适合外观样件和结构验证。'],
  ['密度(g/cm³)', '必填，大于 0；用于按模型体积估算重量。', '1.24'],
  ['材料克重单价(元/g)', '必填，大于等于 0；材料费 = 重量(g) × 材料克重单价。', '0.08'],
  ['表面积单价(元/mm²)', '必填，大于等于 0；表面积费 = 表面积(mm²) × 表面积单价。', '0.0008'],
  ['材料起步价(元)', '必填，大于等于 0；报价不会低于该值。', '25'],
  ['损耗(%)', '必填，填写百分数数值，例如 6 表示 6%。', '6'],
  ['利润率(%)', '必填，填写百分数数值，例如 38 表示 38%。', '38'],
  ['交期(天)', '必填，正整数；用于生成客户话术。', '2'],
  ['是否启用', '必填，可填 是/否；否表示导入但默认不展示报价。', '是'],
];

const workbook = Workbook.create();
const template = workbook.worksheets.add('材料模板');
const guide = workbook.worksheets.add('字段说明');

template.range('A1:L1').values = [headers];
template.range(`A2:L${sampleRows.length + 1}`).values = sampleRows;
template.range('A7:L30').values = Array.from({ length: 24 }, () => Array(headers.length).fill(null));

guide.range('A1:C1').values = [['字段', '填写说明', '示例']];
guide.range(`A2:C${fieldRows.length + 1}`).values = fieldRows;
guide.range('A16:C20').values = [
  ['报价公式', '材料费 = 重量(g) × 材料克重单价；表面积费 = 表面积(mm²) × 表面积单价。', ''],
  ['成本小计', '成本小计 = 材料费 + 表面积费 + 损耗。', ''],
  ['最终报价', '报价 = max(材料起步价, 成本小计 × (1 + 利润率)) × 数量。', ''],
  ['隐私说明', '模板只维护材料参数；客户模型仍在浏览器本地解析，不需要上传。', ''],
  ['导入建议', '材料ID 不变时更新现有材料；新增 ID 时创建新材料。', ''],
];

template.range('A1:L1').format.fill = { color: '#0f4c98' };
template.range('A1:L1').format.font = { color: '#ffffff', bold: true };
template.range('A1:L30').format.alignment = { vertical: 'middle', wrapText: true };
template.range('A2:L5').format.fill = { color: '#f3f8ff' };
template.range('A7:L30').format.fill = { color: '#ffffff' };
template.range('E2:K30').format.numberFormat = '0.0000';
template.range('H2:K30').format.numberFormat = '0.00';
template.range('A1:L30').format.borders = { color: '#d7e0ea', style: 'thin' };
template.freezePanes = { rows: 1 };

guide.range('A1:C1').format.fill = { color: '#0f4c98' };
guide.range('A1:C1').format.font = { color: '#ffffff', bold: true };
guide.range('A1:C20').format.alignment = { vertical: 'middle', wrapText: true };
guide.range('A1:C20').format.borders = { color: '#d7e0ea', style: 'thin' };
guide.range('A16:C20').format.fill = { color: '#f3f8ff' };
guide.freezePanes = { rows: 1 };

template.columns('A:A').width = 22;
template.columns('B:B').width = 16;
template.columns('C:C').width = 10;
template.columns('D:D').width = 38;
template.columns('E:L').width = 16;
template.rows('1:30').height = 28;
template.rows('2:30').height = 42;

guide.columns('A:A').width = 22;
guide.columns('B:B').width = 62;
guide.columns('C:C').width = 28;
guide.rows('1:20').height = 34;

template.dataValidations.add('C2:C30', {
  type: 'list',
  allowBlank: false,
  formula1: '"FDM,SLA,SLS,MJF"',
});
template.dataValidations.add('L2:L30', {
  type: 'list',
  allowBlank: false,
  formula1: '"是,否"',
});

await fs.mkdir(outputDir, { recursive: true });
const file = await SpreadsheetFile.exportXlsx(workbook);
await file.save(outputPath);

console.log(outputPath);
