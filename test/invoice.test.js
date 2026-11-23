'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const tax = require('../lib/tax');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

function mixedHsnItems() {
  return [
    { id: 1, sku: 'GRN-001', name: 'Rice', hsn: '1006', price: 100, qty: 1 },
    { id: 2, sku: 'BEV-001', name: 'Tea', hsn: '0902', price: 100, qty: 1 }
  ];
}

test('CURRENT BEHAVIOUR pricing applies HSN rates and apportions coupon discount before GST', () => {
  const result = pricing.computeTotals(mixedHsnItems(), 'WELCOME');

  assert.deepEqual(result, {
    subtotal: 200,
    discount: 10,
    taxable: 190,
    tax: 21.85,
    cgst: 10.93,
    sgst: 10.92,
    total: 211.85,
    lines: [
      { id: 1, name: 'Rice', hsn: '1006', gstPercent: 5, gross: 100, discount: 5, taxable: 95, tax: 4.75, net: 99.75 },
      { id: 2, name: 'Tea', hsn: '0902', gstPercent: 18, gross: 100, discount: 5, taxable: 95, tax: 17.1, net: 112.1 }
    ]
  });
});

test('invoice figures match the billed order total and HSN GST breakdown', () => {
  const items = mixedHsnItems();
  const billed = pricing.computeTotals(items, 'WELCOME');
  const invoiceFigures = invoice.computeInvoiceFigures({ coupon: 'WELCOME', items });

  assert.equal(invoiceFigures.subtotal, billed.subtotal);
  assert.equal(invoiceFigures.discount, billed.discount);
  assert.equal(invoiceFigures.tax, billed.tax);
  assert.equal(invoiceFigures.total, billed.total);
  assert.deepEqual(invoiceFigures.rows.map(row => ({ gstPercent: row.gstPercent, lineTax: row.lineTax })), [
    { gstPercent: 5, lineTax: 4.75 },
    { gstPercent: 18, lineTax: 17.1 }
  ]);
});

test('CURRENT BEHAVIOUR tax resolves HSN rates and splits rounded GST into CGST and SGST', () => {
  assert.equal(tax.getRateForItem({ hsn: '1006' }), 0.05);
  assert.equal(tax.getRateForItem({ hsn: '0902' }), 0.18);
  assert.equal(tax.getRateForItem({ hsn: 'unknown' }), 0.18);
  assert.deepEqual(tax.splitCgstSgst(21.85), { cgst: 10.93, sgst: 10.92 });
});

test('invoice uses the HSN rates and discount calculation used by billing', () => {
  const order = { id: 1001, coupon: 'WELCOME', items: mixedHsnItems() };
  const result = invoice.computeInvoiceFigures(order);

  assert.deepEqual(result, {
    subtotal: 200,
    discount: 10,
    tax: 21.85,
    cgst: 10.93,
    sgst: 10.92,
    total: 211.85,
    rows: [
      { name: 'Rice', sku: 'GRN-001', hsn: '1006', qty: 1, price: 100, gstPercent: 5, line: 100, lineTax: 4.75 },
      { name: 'Tea', sku: 'BEV-001', hsn: '0902', qty: 1, price: 100, gstPercent: 18, line: 100, lineTax: 17.1 }
    ]
  });

  const billed = pricing.computeTotals(mixedHsnItems(), 'WELCOME');
  assert.equal(result.total, billed.total);
  assert.equal(result.tax, billed.tax);
});

test('invoice gives no discount for an expired coupon, consistent with order pricing', () => {
  const result = invoice.computeInvoiceFigures({
    coupon: 'DIWALI20',
    items: [{ id: 1, name: 'Item', price: 100, qty: 1, hsn: '1006' }]
  });

  assert.equal(result.tax, 5);
  assert.equal(result.discount, 0);
  assert.equal(result.total, 105);
});

test('GST reconciliation matches when invoice figures use the billed order calculation', () => {
  const items = mixedHsnItems();
  const billed = pricing.computeTotals(items, 'WELCOME');
  const db = {
    orders: [{
      id: 1001,
      date: '01/02/2022',
      customer: 'Walk-in',
      status: 'completed',
      coupon: 'WELCOME',
      subtotal: billed.subtotal,
      discount: billed.discount,
      tax: billed.tax,
      total: billed.total,
      items
    }]
  };

  assert.deepEqual(reports.getGstReconciliation(db), {
    totalChecked: 1,
    mismatchCount: 0,
    totalDelta: 0,
    rows: [{
      orderId: 1001,
      date: '01/02/2022',
      customer: 'Walk-in',
      coupon: 'WELCOME',
      ledgerSubtotal: 200,
      ledgerDiscount: 10,
      ledgerTax: 21.85,
      ledgerTotal: 211.85,
      invoiceDiscount: 10,
      invoiceTax: 21.85,
      invoiceTotal: 211.85,
      delta: 0,
      matched: true
    }]
  });
});

test('invoice HTML displays billed figures without a reconciliation warning when they match', () => {
  const items = mixedHsnItems();
  const billed = pricing.computeTotals(items, 'WELCOME');
  const html = invoice.render({
    id: 1001,
    date: '01/02/2022',
    status: 'completed',
    customer: 'Walk-in',
    paymentMode: 'cash',
    coupon: 'WELCOME',
    items,
    total: billed.total
  });

  assert.match(html, /₹21\.85/);
  assert.match(html, /₹211\.85/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
