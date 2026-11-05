/* ---------- rarity words in colour ----------
   Every "UR" / "SSR" written in the game's text (also "UR+", "URs", "SSR → UR", milestone and shop text, toasts…) is shown
   in its rarity colour: UR in the prism gradient, SSR in orange (.rw.r5 / .rw.r4). Done once for the whole page by a
   MutationObserver that wraps the words in new text; rarity badges and places that already style them are skipped (RW_SKIP). */
const RW_RE = /\b(SSR|UR)(\+)?(?=s?(?:[^A-Za-z0-9]|$))/g;
const RW_SKIP = '.rtag,.cs-badge,.rw,.u,.stamp,.sx-word,.mall-word,.grade,.up-pre,.up-word,.rp-tag,.inv-rt,.vipb,.ctag,.sum-mw,[data-norw],input,textarea,select,option,script,style,svg,canvas,[contenteditable]';
function rwText(node) {
  const t = node.nodeValue; if (!t || t.indexOf('R') < 0) return;
  RW_RE.lastIndex = 0; if (!RW_RE.test(t)) return;
  const p = node.parentElement; if (!p || p.closest(RW_SKIP)) return;
  const frag = document.createDocumentFragment(); let last = 0; RW_RE.lastIndex = 0; let m;
  while ((m = RW_RE.exec(t))) {
    if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
    const sp = document.createElement('span'); sp.className = `rw ${m[1] === 'UR' ? 'r5' : 'r4'}`; sp.textContent = m[0]; frag.appendChild(sp);
    last = m.index + m[0].length;
  }
  if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
  node.replaceWith(frag);
}
function rwScan(root) {
  if (root.nodeType === 3) return rwText(root);
  if (root.nodeType !== 1 || root.closest(RW_SKIP)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
  while (w.nextNode()) list.push(w.currentNode);
  list.forEach(rwText);
}
rwScan(document.body);
new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') rwText(m.target); else m.addedNodes.forEach(rwScan); } })
  .observe(document.body, { childList: true, subtree: true, characterData: true });
