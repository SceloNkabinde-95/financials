import { createHash } from 'node:crypto';

export const concepts = [
['cash','Cash and cash equivalents'],['receivables','Trade receivables'],['ppe_cost','Property, plant and equipment cost'],
['accumulated_depreciation','Accumulated depreciation'],['trade_payables','Trade payables'],['loan_payable','Loans payable'],
['share_capital','Share capital'],['opening_retained_earnings','Opening retained earnings'],['revenue','Revenue'],
['cost_of_sales','Cost of sales'],['admin_expenses','Administrative expenses'],['depreciation_expenses','Depreciation expense'],
['finance_costs','Finance costs']
];
const validConcepts = new Set(concepts.map(([id]) => id));
export const format = cents => (Number(cents < 0n ? -cents : cents) / 100).toFixed(2).replace(/^/, cents < 0n ? '-' : '');
function amount(input, row) {
  const value = String(input ?? '').trim().replaceAll(' ', '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Row ' + row + ': expected a non-negative amount with up to two decimals');
  const [whole, decimal = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt((decimal + '00').slice(0,2));
}
function csvRows(input) {
  if (typeof input !== 'string' || input.length > 2000000) throw new Error('CSV missing or exceeds 2 MB');
  const out=[];let row=[],cell='',quoted=false;
  input=input.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){if(c==='"'&&input[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;}else{cell+=c;}}
    else if(c==='"'){if(cell!=='')throw new Error('Invalid quoted CSV');quoted=true;}
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))out.push(row);row=[];}
    else cell+=c;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  row.push(cell);if(row.some(x=>x.trim()))out.push(row);return out;
}
export function importCSV(text) {
  const rows=csvRows(text);
  if(rows.length<2)throw new Error('CSV must have a header and at least one account');
  if(rows.length>10001)throw new Error('This prototype supports 10,000 account rows');
  const headers=rows[0].map(x=>x.trim().toLowerCase().replace(/\s+/g,'_'));
  const required=['account_code','account_name','debit','credit'];
  if(new Set(headers).size!==headers.length)throw new Error('Duplicate CSV header');
  const indexes=required.map(x=>headers.indexOf(x));
  if(indexes.some(i=>i<0))throw new Error('Required columns: '+required.join(', '));
  let debitTotal=0n,creditTotal=0n;
  const accounts=rows.slice(1).map((row,i)=>{
    const n=i+2;
    if(row.length!==headers.length)throw new Error('Row '+n+': column count mismatch');
    const code=row[indexes[0]].trim(),name=row[indexes[1]].trim();
    if(!code||!name)throw new Error('Row '+n+': account code and name are required');
    const debit=amount(row[indexes[2]],n),credit=amount(row[indexes[3]],n);
    if(debit&&credit)throw new Error('Row '+n+': debit and credit cannot both be positive');
    debitTotal+=debit;creditTotal+=credit;
    return {row:n,code,name,debit,credit,signed:debit-credit};
  });
  return {accounts,totals:{debit:format(debitTotal),credit:format(creditTotal),difference:format(debitTotal-creditTotal)},balanced:debitTotal===creditTotal};
}
export function compile({csv,mappings,entityName='Synthetic Example (Pty) Ltd',framework='IFRS for SMEs (conceptual)'}) {
  const tb=importCSV(csv);
  if(!tb.balanced)throw new Error('Trial balance does not balance: difference R'+tb.totals.difference);
  if(!mappings||typeof mappings!=='object'||Array.isArray(mappings))throw new Error('Mappings are required');
  const unknown=tb.accounts.filter(x=>!validConcepts.has(mappings[x.code]));
  if(unknown.length)throw new Error('Unmapped accounts: '+unknown.map(x=>x.code).join(', '));
  const get = category => tb.accounts.filter(x=>mappings[x.code]===category).reduce((v,x)=>v+x.signed,0n);
  const source = (...categories) => tb.accounts.filter(x=>categories.includes(mappings[x.code])).map(x=>({row:x.row,code:x.code,name:x.name}));
  const row = (label,value,...categories)=>({label,amount:format(value),sources:source(...categories)});
  const cash=get('cash'),rec=get('receivables'),ppe=get('ppe_cost')+get('accumulated_depreciation');
  const assets=cash+rec+ppe,payables=-get('trade_payables'),loans=-get('loan_payable'),liabilities=payables+loans;
  const capital=-get('share_capital'),opening=-get('opening_retained_earnings');
  const revenue=-get('revenue'),cogs=get('cost_of_sales'),admin=get('admin_expenses'),depreciation=get('depreciation_expenses'),finance=get('finance_costs');
  const gross=revenue-cogs,operating=gross-admin-depreciation,profit=operating-finance,retained=opening+profit,equity=capital+retained;
  if(assets!==liabilities+equity)throw new Error('Financial position does not reconcile; review mappings and adjustments');
  const financialPosition=[
    row('Cash and cash equivalents',cash,'cash'),
    row('Trade receivables',rec,'receivables'),
    row('Property, plant and equipment',ppe,'ppe_cost','accumulated_depreciation'),
    row('Total assets',assets,'cash','receivables','ppe_cost','accumulated_depreciation'),
    row('Trade payables',payables,'trade_payables'),
    row('Loan payable',loans,'loan_payable'),
    row('Total liabilities',liabilities,'trade_payables','loan_payable'),
    row('Share capital',capital,'share_capital'),
    row('Retained earnings (illustrative)',retained,'opening_retained_earnings','revenue','cost_of_sales','admin_expenses','depreciation_expenses','finance_costs'),
    row('Total equity',equity,'share_capital','opening_retained_earnings','revenue','cost_of_sales','admin_expenses','depreciation_expenses','finance_costs'),
    row('Total liabilities and equity',liabilities+equity,...concepts.map(([id])=>id))
  ];
  const profitOrLoss=[
    row('Revenue',revenue,'revenue'),row('Cost of sales',-cogs,'cost_of_sales'),row('Gross profit',gross,'revenue','cost_of_sales'),
    row('Administrative expenses',-admin,'admin_expenses'),row('Depreciation expense',-depreciation,'depreciation_expenses'),
    row('Operating profit',operating,'revenue','cost_of_sales','admin_expenses','depreciation_expenses'),
    row('Finance costs',-finance,'finance_costs'),row('Profit for the year',profit,'revenue','cost_of_sales','admin_expenses','depreciation_expenses','finance_costs')
  ];
  const equityBridge=[row('Opening retained earnings',opening,'opening_retained_earnings'),row('Current year profit',profit,'revenue','cost_of_sales','admin_expenses','depreciation_expenses','finance_costs'),row('Closing retained earnings',retained,'opening_retained_earnings','revenue','cost_of_sales','admin_expenses','depreciation_expenses','finance_costs')];
  const fingerprint=createHash('sha256').update(JSON.stringify({csv,mappings,entityName,framework})).digest('hex');
  return {status:'DRAFT_ONLY',entityName:String(entityName).slice(0,120),framework,sourceHash:fingerprint,totals:tb.totals,accountCount:tb.accounts.length,
    statements:[{id:'position',title:'Statement of financial position — illustrative',rows:financialPosition},{id:'profit',title:'Profit or loss — illustrative',rows:profitOrLoss},{id:'equity',title:'Retained earnings bridge — incomplete equity statement',rows:equityBridge}],
    checks:[{name:'Trial balance balances',passed:true},{name:'Assets = liabilities + equity',passed:true},{name:'All source accounts mapped',passed:true}],
    incomplete:['Full changes in equity','Statement of cash flows','Accounting policies and notes','Prior-year comparatives','Professional accounting framework validation'],
    warning:'SYNTHETIC RESEARCH DEMO ONLY — not IFRS compliant, not a statutory report, not approved for real client financial data.'};
}
