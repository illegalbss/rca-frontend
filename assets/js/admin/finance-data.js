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
      levy_label:       'Christmas Party',
      levy_amount:      5000,
      levy_basic6_label:  'Christmas Party',
      levy_basic6_amount: 5000
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

    // Check sibling discount
    const siblings = (window.SAMPLE_STUDENTS || []).filter(
      s => s.parent_phone && s.parent_phone === student.parent_phone
    ).length;
    const hasDiscount = siblings >= fee.sibling_threshold;
    const schoolFees  = hasDiscount ? fee.school_fees_sibling : fee.school_fees;

    // Basic 6 gets special levy in term 3
    const isBasic6 = student.class_name === 'Basic 6';
    const levy = (isBasic6 && term === 'term3')
      ? fee.levy_basic6_amount
      : fee.levy_amount;

    return schoolFees + fee.utility_bill + fee.lesson_fee + levy;
  };

  // Empty payment records — real data comes from API/localStorage
  if (!window.PAYMENT_RECORDS) {
    window.PAYMENT_RECORDS = {};
  }

  // Receipt counter
  window.RECEIPT_COUNTER = parseInt(localStorage.getItem('rca_receipt_counter') || '1000');
  window.nextReceiptNo = function() {
    window.RECEIPT_COUNTER++;
    localStorage.setItem('rca_receipt_counter', window.RECEIPT_COUNTER);
    return `RCA-RCP-${window.RECEIPT_COUNTER}`;
  };

})();
