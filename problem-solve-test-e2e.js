// Auto-solver for Mathozz - runs in browser console
async function autoSolve(totalProblems = 100, delayMs = 800) {
    let solved = 0;
    
    // Get Angular component reference
    const getAngularComponent = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      // Angular Ivy - get component instance
      const key = Object.keys(el).find(k => k.startsWith('__ngContext__'));
      if (!key) return null;
      const ctx = el[key];
      // Walk the LView to find component instance
      for (let i = 0; i < ctx.length; i++) {
        if (ctx[i] && ctx[i].svc && typeof ctx[i].svc.submitAnswer === 'function') {
          return ctx[i];
        }
      }
      return null;
    };
  
    console.log(`🤖 Auto-solver starting: ${totalProblems} problems, ${delayMs}ms delay`);
  
    while (solved < totalProblems) {
      await new Promise(r => setTimeout(r, delayMs));
      
      // Get current problem from DOM
      const eqEl = document.querySelector('.problem-eq');
      if (!eqEl) { console.log('No problem found, retrying...'); continue; }
      
      const text = eqEl.innerText.replace(/\u2009/g, '').trim(); // remove thin spaces
      const match = text.match(/(\d+)\s*([+\-×÷\*\/])\s*(\d+)/);
      if (!match) { console.log('Could not parse:', text); continue; }
      
      const [, a, op, b] = match;
      const n1 = parseInt(a), n2 = parseInt(b);
      let answer;
      
      if      (op === '+')           answer = n1 + n2;
      else if (op === '-')           answer = n1 - n2;
      else if (op === '×' || op === '*') answer = n1 * n2;
      else if (op === '÷' || op === '/')  answer = Math.round(n1 / n2);
      
      if (answer === undefined) continue;
      
      // Type answer via numpad buttons
      const ansStr = String(answer);
      
      // Clear first
      const clrBtn = [...document.querySelectorAll('.nk-action')]
        .find(b => b.textContent.trim() === 'CLR');
      clrBtn?.click();
      
      await new Promise(r => setTimeout(r, 100));
      
      // Click each digit
      for (const digit of ansStr) {
        const numBtns = [...document.querySelectorAll('.nk:not(.nk-action)')]
          .filter(b => b.textContent.trim() === digit && !b.disabled);
        if (numBtns.length) numBtns[0].click();
        await new Promise(r => setTimeout(r, 80));
      }
      
      await new Promise(r => setTimeout(r, 150));
      
      // Click Submit
      const submitBtn = document.querySelector('.nk-submit');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
        solved++;
        console.log(`✅ Solved ${solved}/${totalProblems}: ${n1} ${op} ${n2} = ${answer}`);
      }
    }
    
    console.log(`🎉 Done! Solved ${solved} problems.`);
  }
  
  // Run it
  autoSolve(100, 700); // 100 problems, 700ms between each