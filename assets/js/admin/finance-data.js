/* ============================================
   FINANCE DATA — finance-data.js
   Royal Crystal Academy
   ============================================
   Phase 4: Real payment records stored in PostgreSQL.
   This file provides fee structure constants and
   starts with empty payment records.
   localstorage.js restores any saved payments.
*/

(function () {

  /* ---- Fee structure (per term) ---- */
  window.FEE_STRUCTURE = {
    term1: {
      label:            'First Term',
      school_fees:      30000,
      school_fees_sibling: 15000,
      sibling_threshold: 3,
      utility_bill:     5000,
      lesson_fee:       5000,
      levy_label:       null,   // Christmas Party levy removed by government directive
      levy_amount:      0,
      levy_basic6_label:  null,
      levy_basic6_amount: 0
    },
    term2: {
      label:            'Second Term',
      school_fees:      30000,
      school_fees_sibling: 15000,
      sibling_threshold: 3,
      utility_bill:     5000,
      lesson_fee:       5000,
      levy_label:       'Inter-House Sports',
      levy_amount:      5000,
      levy_basic6_label:  'Inter-House Sports',
      levy_basic6_amount: 5000
    },
    term3: {
      label:            'Third Term',
      school_fees:      30000,
      school_fees_sibling: 15000,
      sibling_threshold: 3,
      utility_bill:     5000,
      lesson_fee:       5000,
      levy_label:       'Graduation Levy',
      levy_amount:      5000,
      levy_basic6_label:  'Graduation Levy (Basic 6)',
      levy_basic6_amount: 8000
    }
  };

  /* ---- Format Naira ---- */
  window.formatNaira = function(amount) {
    return '₦' + Number(amount).toLocaleString('en-NG');
  };

  /* ---- Calculate expected fee for a student ---- */
  window.calculateFee = function(student, term) {
    const fee = window.FEE_STRUCTURE[term];
    if (!fee) return 0;
    const schoolFees = fee.school_fees;
    const isBasic6   = student.class_name === 'Basic 6';
    const levy       = (isBasic6 && term === 'term3') ? fee.levy_basic6_amount : fee.levy_amount;
    return schoolFees + fee.utility_bill + fee.lesson_fee + levy;
  };

  /* ---- Compute full itemised fee breakdown ---- */
  window.computeFeeBreakdown = function(admNo, term) {
    const student = (window.SAMPLE_STUDENTS || []).find(s => s.admission_no === admNo);
    const fee     = window.FEE_STRUCTURE[term];
    if (!fee) return null;

    // Sibling discount: count active students sharing the same parent_phone
    let siblingCount = 1;
    if (student && student.parent_phone) {
      const active = (window.SAMPLE_STUDENTS || []).filter(
        s => s.status !== 'archived' && s.status !== 'removed'
      );
      siblingCount = active.filter(s => s.parent_phone === student.parent_phone).length;
    }
    const hasDiscount = siblingCount >= (fee.sibling_threshold || 3);
    const schoolFees  = hasDiscount ? fee.school_fees_sibling : fee.school_fees;
    const isBasic6    = student && student.class_name === 'Basic 6';
    const levy        = (isBasic6 && term === 'term3') ? fee.levy_basic6_amount : fee.levy_amount;
    const levyLabel   = (isBasic6 && term === 'term3') ? fee.levy_basic6_label  : fee.levy_label;

    const allLines = [
      { label: 'School Fees' + (hasDiscount ? ' (Sibling Discount)' : ''), amount: schoolFees },
      { label: 'Utility Bill', amount: fee.utility_bill },
      { label: 'Lesson Fee',   amount: fee.lesson_fee   },
      { label: levyLabel,      amount: levy              }
    ];
    const lines = allLines.filter(l => l.amount > 0 && l.label);
    const grandTotal = lines.reduce((sum, l) => sum + l.amount, 0);
    return { grand_total: grandTotal, lines, has_sibling_discount: hasDiscount, sibling_count: siblingCount, school_fees: schoolFees, levy };
  };

  // Empty payment records — real data comes from API/localStorage
  if (!window.PAYMENT_RECORDS) window.PAYMENT_RECORDS = {};

  // Receipt counter (always RCA-RCP-XXXX format)
  window.RECEIPT_COUNTER = parseInt(localStorage.getItem('rca_receipt_counter') || '1000', 10);
  window.nextReceiptNo = function() {
    window.RECEIPT_COUNTER++;
    localStorage.setItem('rca_receipt_counter', window.RECEIPT_COUNTER);
    return 'RCA-RCP-' + window.RECEIPT_COUNTER;
  };

  /* ---- Payment Settings (default: manual only) ----
     Loaded from localStorage by localstorage.js.
     Only initialised here if localstorage.js hasn't run yet. */
  if (!window.PAYMENT_SETTINGS) {
    window.PAYMENT_SETTINGS = {
      mode:                 'manual',    // 'manual' | 'manual_and_online'
      online_gateway:       'paystack',  // prepared: 'paystack' | 'flutterwave'
      online_public_key:    '',
      receipt_prefix:       'RCA-RCP',
      enable_result_unlock: true,
      last_updated:         null,
      last_updated_by:      null
    };
  }

})();
