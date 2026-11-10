/* ============================================
   PAYMENT SUCCESS — payment-success.js
   Royal Crystal Academy
   ============================================
   window.showPaymentSuccess({
     amount, studentName, className, receiptNo, term,   // term: 'term1' or a label
     status,    // 'paid' (default) | 'partial'
     balance,   // left to pay, shown when status is 'partial'
     onPrint,   // "Print receipt"; without it, opens the Receipts page
     onClose
   })

   Call this ONLY after the server has confirmed the payment was saved.
   A green ring draws, then a tick, then the amount and details fade up
   (about 1.5 seconds; only transform, opacity and stroke are animated).
   Returns { close } or null if the amount is not a valid number.
*/
(function () {
  const TERM_LABELS = { term1: 'First Term', term2: 'Second Term', term3: 'Third Term' };
  const STYLE_ID = 'rcaPaySuccessStyles';
  let closeCurrent = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      .rca-ps-overlay{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(74,10,18,.72);overflow-y:auto;animation:rcaPsFade .15s ease-out both}
      .rca-ps-card{background:#fff;border-radius:18px;border-top:5px solid var(--color-secondary,#C9960C);width:100%;max-width:420px;margin:auto;padding:28px 24px 24px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:var(--font-body,inherit);box-sizing:border-box}
      .rca-ps-mark{display:block;width:96px;height:96px;margin:0 auto 16px}
      .rca-ps-ring,.rca-ps-tick{fill:none;stroke:#15803d;stroke-linecap:round;stroke-linejoin:round}
      .rca-ps-ring{stroke-width:5;stroke-dasharray:264;stroke-dashoffset:264;transform:rotate(-90deg);transform-origin:50% 50%;animation:rcaPsDraw .6s ease-out .1s forwards}
      .rca-ps-tick{stroke-width:7;stroke-dasharray:64;stroke-dashoffset:64;animation:rcaPsDraw .35s ease-out .6s forwards}
      .rca-ps-up{opacity:0;transform:translateY(10px);animation:rcaPsUp .3s ease-out forwards}
      .rca-ps-amount{margin:0;font-family:var(--font-heading,inherit);font-size:2.1rem;line-height:1.2;font-weight:700;color:var(--color-primary,#6B0F1A);overflow-wrap:anywhere;animation-delay:.9s}
      .rca-ps-for{margin:6px 0 0;font-size:.95rem;color:#374151;overflow-wrap:anywhere;animation-delay:.98s}
      .rca-ps-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:center;margin:14px 0 0;font-size:.84rem;color:#4b5563;animation-delay:1.1s}
      .rca-ps-meta span{overflow-wrap:anywhere}
      .rca-ps-chip{display:inline-block;padding:3px 12px;border-radius:999px;font-size:.76rem;font-weight:700}
      .rca-ps-chip.paid{background:#dcfce7;color:#166534}
      .rca-ps-chip.partial{background:#fef3c7;color:#92400e}
      .rca-ps-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;animation-delay:1.2s}
      .rca-ps-btn{flex:1 1 140px;min-height:44px;padding:10px 16px;border-radius:10px;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;border:1.5px solid var(--color-primary,#6B0F1A)}
      .rca-ps-btn.print{background:#fff;color:var(--color-primary,#6B0F1A)}
      .rca-ps-btn.close{background:var(--color-primary,#6B0F1A);color:#fff}
      .rca-ps-btn:focus-visible{outline:3px solid var(--color-secondary,#C9960C);outline-offset:2px}
      .rca-ps-spin{display:inline-block;width:.9em;height:.9em;margin-right:.5em;vertical-align:-.1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:rcaPsSpin .7s linear infinite}
      .rca-ps-retry{margin-left:6px;padding:3px 12px;border-radius:6px;border:1px solid currentColor;background:#fff;color:inherit;font:inherit;font-weight:700;cursor:pointer}
      @keyframes rcaPsSpin{to{transform:rotate(360deg)}}
      @keyframes rcaPsDraw{to{stroke-dashoffset:0}}
      @keyframes rcaPsUp{to{opacity:1;transform:none}}
      @keyframes rcaPsFade{from{opacity:0}to{opacity:1}}
      @media (max-width:480px){
        .rca-ps-card{padding:24px 18px 18px}
        .rca-ps-mark{width:80px;height:80px;margin-bottom:12px}
        .rca-ps-amount{font-size:1.8rem}
      }
      @media (prefers-reduced-motion:reduce){
        .rca-ps-overlay,.rca-ps-ring,.rca-ps-tick,.rca-ps-up,.rca-ps-spin{animation:none}
        .rca-ps-ring,.rca-ps-tick{stroke-dashoffset:0}
        .rca-ps-up{opacity:1;transform:none}
      }
      @media print{.rca-ps-overlay{display:none}}`;
    document.head.appendChild(st);
  }

  const naira = n => '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;   // text only: names are never read as HTML
    return node;
  }

  function showPaymentSuccess(opts) {
    const { amount, studentName, className, receiptNo, term, status = 'paid', balance, onPrint, onClose } = opts || {};
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      console.error('showPaymentSuccess: invalid amount', amount);
      return null;
    }
    if (closeCurrent) closeCurrent();
    injectStyles();

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const overlay = el('div', 'rca-ps-overlay');
    const card = el('div', 'rca-ps-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'rcaPsTitle');
    card.setAttribute('aria-describedby', 'rcaPsFor');

    const mark = document.createElement('div');
    mark.innerHTML = `<svg class="rca-ps-mark" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <circle class="rca-ps-ring" cx="48" cy="48" r="42"/>
      <path class="rca-ps-tick" d="M29 50 L43 64 L68 35"/>
    </svg>`;

    const amountEl = el('h2', 'rca-ps-up rca-ps-amount', naira(amount));
    amountEl.id = 'rcaPsTitle';
    const who = [studentName, className].filter(Boolean).join(', ');
    const forEl = el('p', 'rca-ps-up rca-ps-for', 'Payment recorded' + (who ? ' for ' + who : ''));
    forEl.id = 'rcaPsFor';

    const meta = el('div', 'rca-ps-up rca-ps-meta');
    if (receiptNo) meta.appendChild(el('span', '', 'Receipt: ' + receiptNo));
    if (term) meta.appendChild(el('span', '', TERM_LABELS[term] || term));
    const isPart = status === 'partial';
    const chipText = isPart
      ? 'Part payment' + (Number(balance) > 0 ? ' · ' + naira(balance) + ' left' : '')
      : 'Paid';
    meta.appendChild(el('span', 'rca-ps-chip ' + (isPart ? 'partial' : 'paid'), chipText));

    const actions = el('div', 'rca-ps-up rca-ps-actions');
    const printBtn = el('button', 'rca-ps-btn print', 'Print receipt');
    const closeBtn = el('button', 'rca-ps-btn close', 'Close');
    printBtn.type = closeBtn.type = 'button';
    actions.append(printBtn, closeBtn);

    card.append(mark, amountEl, forEl, meta, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the dialog.
      const first = printBtn, last = closeBtn;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!card.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      closeCurrent = null;
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      document.body.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus();
      if (onClose) onClose();
    }
    closeCurrent = close;

    document.addEventListener('keydown', onKey, true);
    closeBtn.addEventListener('click', close);
    printBtn.addEventListener('click', () => {
      if (onPrint) { onPrint(); return; }
      // The Receipts page opens the payment saved in rca_last_receipt;
      // print:true makes it bring up the print dialog straight away.
      try {
        const last = JSON.parse(sessionStorage.getItem('rca_last_receipt') || 'null');
        if (last) sessionStorage.setItem('rca_last_receipt', JSON.stringify({ ...last, print: true }));
      } catch (e) { /* the receipt still opens; the bursar can press Print there */ }
      window.location.href = 'receipts.html';
    });
    closeBtn.focus({ preventScroll: true });

    return { close };
  }

  window.showPaymentSuccess = showPaymentSuccess;

  /* ---- Saving a payment: loading state, error with Retry, no duplicates ---- */
  const newReceiptNo = () => 'RCA-RCP-' + Date.now().toString().slice(-6);

  // Keeps the same receipt number when the same payment is tried again, so
  // a retry can tell whether the failed attempt had in fact been saved.
  function createAttempt() {
    let key = null, receiptNo = null;
    return {
      begin(details, typedReceipt) {
        const k = JSON.stringify([details, typedReceipt || '']);
        const isRetry = k === key;
        if (!isRetry) { key = k; receiptNo = typedReceipt || newReceiptNo(); }
        return { isRetry, receiptNo };
      },
      done() { key = null; receiptNo = null; }
    };
  }

  // Resolves with the saved row only when the server confirmed the save.
  // On a retry it first looks for the earlier attempt: the save may have
  // worked with only the reply lost, and saving again would double-record it.
  async function savePayment(body, isRetry) {
    if (isRetry) {
      const qs = new URLSearchParams({ admission_no: body.admission_no, term: body.term });
      const data = await window.RCA_API.call('/payments?' + qs.toString());
      const found = (data.payments || []).find(p => !p.voided && p.reference === body.reference
        && p.fee_type === body.fee_type && Number(p.amount) === Number(body.amount));
      if (found) return found;
    }
    const row = await window.RCA_API.call('/payments', { method: 'POST', body });
    if (!row || !row.id) throw new Error('The server did not confirm the payment.');
    return row;
  }

  function setBusy(btn, busy, label) {
    injectStyles();
    if (busy) {
      btn.dataset.rcaLabel = btn.innerHTML;
      btn.textContent = label || 'Saving…';
      btn.insertAdjacentHTML('afterbegin', '<span class="rca-ps-spin" aria-hidden="true"></span>');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    } else {
      if (btn.dataset.rcaLabel !== undefined) btn.innerHTML = btn.dataset.rcaLabel;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  }

  function showSaveError(box, message, onRetry) {
    injectStyles();
    box.textContent = 'Not saved: ' + message + ' ';
    const retry = el('button', 'rca-ps-retry', 'Retry');
    retry.type = 'button';
    retry.addEventListener('click', onRetry);
    box.appendChild(retry);
    box.style.display = 'block';
    box.setAttribute('role', 'alert');
  }

  window.RCA_PAYMENT = { createAttempt, savePayment, setBusy, showSaveError };
})();
