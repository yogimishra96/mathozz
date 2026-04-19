async function autoSolve(totalProblems = 100, delayMs = 300) {
  let solved = 0, correct = 0, wrong = 0;
  const wrongList = [];

  console.log(`🤖 Starting: ${totalProblems} problems`);
  console.log('─'.repeat(60));

  while (solved < totalProblems) {
    await new Promise(r => setTimeout(r, delayMs));

    // ── Wait until not transitioning (submit btn enabled) ────────────────
    let tries = 0;
    while (document.querySelector('.nk-submit')?.disabled && tries++ < 20) {
      await new Promise(r => setTimeout(r, 100));
    }

    // ── Read problem from DOM ─────────────────────────────────────────────
    const eqEl = document.querySelector('.problem-eq');
    if (!eqEl) { console.log('⏳ Waiting...'); continue; }

    const diffEl = document.querySelector('.diff-badge');
    const difficulty = diffEl?.textContent?.trim() ?? '?';

    // Remove thin spaces, nbsp, etc
    const text = eqEl.innerText
      .replace(/[\u2009\u00a0\u200b]/g, '')
      .replace(/\s+/g, '')
      .trim();

    const match = text.match(/^(\d+)([+\-×÷])(\d+)$/);
    if (!match) {
      console.log('❓ Parse failed:', JSON.stringify(text));
      continue;
    }

    const n1 = parseInt(match[1]);
    const op = match[2];
    const n2 = parseInt(match[3]);

    let answer;
    if      (op === '+') answer = n1 + n2;
    else if (op === '-') answer = n1 - n2;
    else if (op === '×') answer = n1 * n2;
    else if (op === '÷') answer = Math.round(n1 / n2);

    if (answer === undefined) continue;

    const question = `${n1} ${op} ${n2}`;

    // ── Clear ─────────────────────────────────────────────────────────────
    const clrBtn = [...document.querySelectorAll('.nk-action')]
      .find(b => b.textContent.trim() === 'CLR');
    clrBtn?.click();
    await new Promise(r => setTimeout(r, 60));

    // ── Type digits ───────────────────────────────────────────────────────
    for (const digit of String(answer)) {
      const btn = [...document.querySelectorAll('.nk:not(.nk-action)')]
        .find(b => b.textContent.trim() === digit && !b.disabled);
      btn?.click();
      await new Promise(r => setTimeout(r, 50));
    }

    // ── Verify what's in the answer display before submitting ─────────────
    const displayEl = document.querySelector('.answer-display');
    const displayed = displayEl?.textContent?.trim();
    if (displayed !== String(answer)) {
      console.log(`⚠️ Display mismatch: expected=${answer} got=${displayed}, retrying...`);
      continue;
    }

    await new Promise(r => setTimeout(r, 80));

    // ── Submit ────────────────────────────────────────────────────────────
    const submitBtn = document.querySelector('.nk-submit');
    if (!submitBtn || submitBtn.disabled) continue;
    submitBtn.click();

    // ── Wait for feedback class to appear ─────────────────────────────────
    await new Promise(r => setTimeout(r, 400));

    const ansEl = document.querySelector('.answer-display');
    const wasCorrect = ansEl?.classList.contains('state-correct');
    const wasWrong   = ansEl?.classList.contains('state-wrong');

    solved++;
    if (wasCorrect) {
      correct++;
    } else {
      wrong++;
      wrongList.push({ question, answer, difficulty });
    }

    const diffIcon = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';
    const status   = wasCorrect ? '✅' : wasWrong ? '❌' : '❓';
    const acc      = Math.round((correct / solved) * 100);

    console.log(
      `${status} | ${diffIcon} ${difficulty.padEnd(6)} | ` +
      `${question.padEnd(12)} = ${String(answer).padStart(5)} | ` +
      `[${solved}/${totalProblems}] Acc:${acc}% ✅${correct} ❌${wrong}`
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`🏁 DONE | ✅${correct} ❌${wrong} | Acc: ${Math.round((correct/solved)*100)}%`);
  if (wrongList.length) {
    console.log(`\n❌ Wrong questions (${wrongList.length}):`);
    console.table(wrongList);
  } else {
    console.log('🎯 Perfect!');
  }
}

autoSolve(100, 300);