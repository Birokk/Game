/* =========================================================
   CHARACTER GUIDE (the owner's ask: the character screen's "?" opens a full tutorial on how characters work).
   openCharGuide(page) = a wide window (modal kind chguide) with a rail of topics on the left (a strip on phones) and
   one page at a time with Back / Next; it opens on the topic of the tab you are on (CHG_FROM_TAB). Numbers come from the
   game's own constants where they exist, so the guide follows the balance.
   ========================================================= */
const chgN = (v, d) => { try { return typeof v === 'function' ? v() : v; } catch (e) { return d; } };
const CHG = [
  { id: 'overview', ic: 'chars', name: 'The basics', lead: 'Every character you own lives on this screen. Everything you build on a character raises its CS (Character Score) and, when it leads a deck, makes it stronger in Card Battles.',
    sec: () => [
      ['The screen', ['The <b>roster</b> on the left lists the characters you own: favourites first, then the highest CS, then rarity.', 'The <b>tabs</b> along the bottom are the parts of a character: Home, Skins, Wardrobe, Memory, Pet, Breakthrough, Potential, Bond and Character Info.', 'The <b>eye</b> button hides the menu so you can look at the art; tap anywhere to bring it back. The <b>star</b> button marks a favourite.', 'Characters you don\'t own yet are in the <b>Index</b> (home screen, the row under your profile).']],
      ['Where characters come from', ['Summons on the character banners (Limited, Weekly, Permanent, Beginner, Step-Up and the event banners).', 'Character fragments: 60 for a random character of that rarity, 120 for one you choose (Shop → Exchange → Fragments).', 'The permanent banner\'s milestones, the UR selector and some offers.', 'Your <b>main character</b> is never summoned: it gets its stars from Origin Orbs and becomes UR through the Ascension questline.']],
      ['What to build first', ['Stars and Breakthrough give the most CS and unlock the leader skill tiers.', 'Then Wardrobe (a full set), a Memory and a Pet.', 'Bond and Potential add up over time.']]] },
  { id: 'stars', ic: 'star', name: 'Stars & copies', lead: 'A character starts at 0★. Every extra copy you get adds one star, up to 6★.',
    sec: () => [
      ['Getting stars', [`Each duplicate copy = +1★, up to ${chgN(() => MAX_STARS, 6)}★.`, `Past the last star a summoned copy gives Corals instead: ${chgN(() => STARLIGHT_MAX[5], 40)} for a UR, ${chgN(() => STARLIGHT_MAX[4], 10)} for an SSR.`, 'Shop → Exchange → Premium sells one more copy of a UR you own for 720 Corals, once a month per character.', 'The main character uses Origin Orbs: +1★ each, from the campaign and the level rewards.']],
      ['What stars unlock', ['Each star can be <b>awakened</b> in the Breakthrough tab (more CS, and the leader skill tiers).', 'At 3★ and 6★ the character\'s star splash arts unlock (when they exist) as skins and wallpapers.', 'Every star opens one more Potential plan (1 plan at 0★, 7 at 6★).', 'At 6★ the character gets an animated border with spinning comets on its cards.']],
      ['CS', [`Each star: ${chgN(() => CS_PTS.star[4], 300)} CS for an SSR, ${chgN(() => CS_PTS.star[5], 500)} for a UR.`]]] },
  { id: 'bt', ic: 'sparkle', name: 'Breakthrough & SSS', lead: 'Breakthrough turns the stars you own into glowing, awakened stars. At grade SSS they can be awakened a second time.',
    sec: () => [
      ['Awakening stars', [`Each owned star costs ${chgN(() => BT_PEARLS, 10)} pearls to awaken, once. After that it can be switched on and off for free.`, `Each awakened star: ${chgN(() => CS_PTS.bt[4], 500)} CS (SSR) or ${chgN(() => CS_PTS.bt[5], 800)} CS (UR).`, 'Awakened stars glow in the rarity colour (orange for SSR, prism for UR) everywhere the stars are drawn.']],
      ['Leader skill tiers', ['2 awakened stars → the leader skill reaches tier II.', '4 → tier III, with an extra twist.', '6 → the skill\'s cooldown is one turn shorter.', 'Wearing the full signature clothing set adds one more tier.']],
      ['SSS awakening', [`Once the character reaches grade <b>SSS</b>, <b>Awaken</b> costs ${chgN(() => SSS_PEARLS, 100)} pearls + ${fmt(chgN(() => SSS_GOLD, 100000))} gold, once.`, `Every switched-on star becomes an <b>SSS star</b> (red glow) worth ${fmt(chgN(() => SSS_CS, 1000))} CS each. That CS never counts toward the grade.`, 'If the grade drops below SSS the SSS stars sleep (no glow, no CS) until it comes back.', 'It also gives the leader an <b>Ultimate</b>: once a match from round 5, the skill at tier III for 0 AP. This one stays even if the grade drops.']]] },
  { id: 'pot', ic: 'potential', name: 'Potential', lead: 'Potential plans are boards of 6 upgrades bought in order. Each plan has its own shape and colour.',
    sec: () => [
      ['Plans', [`One plan for the base character plus one per star: 1 plan at 0★, up to ${chgN(() => POT_PAGES, 7)} at 6★.`, 'A plan opens when its star is reached and the plan before it is complete.', 'Upgrades 1–5 cost 1 pearl each, the 6th (the Core) 5 pearls.', `Every upgrade gives +${chgN(() => POT_CS, 100)} CS.`]],
      ['Rewards', ['From plan #2, a gem lights up above the matching star when the plan is complete.', 'Badges: Hidden Potential (1 plan), Rising Potential (4) and Full Potential (all 7).', 'Each completed plan also gives the character a battle perk when it leads a deck: +2 hero HP, +1 opening card, a cheaper first skill, a heal point, a cheaper attribute bond, +1 max HP on the first unit, +1 AP on the first turn (in that order).']]] },
  { id: 'cs', ic: 'trophy', name: 'CS & grades', lead: 'CS (Character Score) adds up everything a character owns and wears. It sets the character\'s grade, from F to SSS.',
    sec: () => [
      ['What gives CS', ['Owning it, its stars and awakened stars.', 'Its skins (SSR 400, UR 800, MR 1,000, XR 1,500 each).', 'Worn clothing (R 100, SSR 250, UR 600–1,000 by stars), a full 6-piece set (2,000–5,000), the signature set (+1,000) and gear levels (+10 a level).', 'The equipped pet, its stars and grade; the equipped memory and its stars (+500 when it is a signature memory).', 'Bond levels (SSR 250, UR 400 each) and Potential upgrades (+100 each).']],
      ['Grades', [chgN(() => CS_GRADES.map(([g, n]) => `<b>${g}</b> ${fmt(n)}`).join(' · '), 'F 0 · E 1,500 · D 3,000 · C 5,000 · B 7,500 · A 10,000 · S 15,000 · SS 20,000 · SSS 30,000'), 'From grade S a small + follows the stars.', 'A UR with 40,000 CS shows as <b>UR+</b>, an SSR with 25,000 as <b>SSR+</b>.']],
      ['CS in battle', ['A deck leader\'s CS gives extra stats every 5,000 CS up to 30,000, then at 40,000 and 50,000 (more hero HP, a sturdier first unit, a heal point, an opening card, first-turn AP).', 'Tap the (i) on the CS card for the full points table.']]] },
  { id: 'skins', ic: 'hanger', name: 'Skins & art', lead: 'Skins are outfits with their own splash art. Equipping one changes the art on the character screen and the character\'s round icon.',
    sec: () => [
      ['Skins', ['The Skins tab is a carousel: the card in the middle shows full screen. Default is the base art; the 3★ and 6★ arts unlock at those stars.', `Outfits sold in the shop cost ${chgN(() => SKIN_PRICE, 60)} pearls, or skin tickets (60 for an SSR outfit, 120 for a UR one).`, 'Skin tickets come from Pearl Honor\'s season milestones.', 'Some outfits only come from summons, events or rewards: the Outfit Banner, the Mystery Fountain and offers.']],
      ['Special outfits', ['<b>MR</b> wedding outfits unlock by marrying the character.', '<b>XR</b> is the top outfit rarity. XR outfits can\'t be bought.', 'Outfits belonging to a skin set give battle bonuses when the leader wears one of them and you own enough of the set.']],
      ['Wallpapers', ['<b>Set as wallpaper</b> puts the exact art you are looking at on the home screen (up to 4 wallpapers).', 'Tapping the home wallpaper 3 times in a row gives that character bond EXP, 3 times a day.']]] },
  { id: 'wardrobe', ic: 'wardrobe', name: 'Wardrobe & gear', lead: 'Six clothing slots: Hat, Top, Pants, Shoes, Accessory and Hand. Every copy of a piece is separate and can be worn by one character at a time.',
    sec: () => [
      ['Wearing clothes', ['Tap a slot to pick a copy; tap it again or Take off to remove it.', '<b>Auto-equip best</b> picks the strongest set and fills every slot. <b>Unequip all</b> takes everything off.', 'Clothes come from gear raids, the Camp, the guild boss, Quick Match wins and set tokens.']],
      ['Stars and sets', [`UR pieces have up to ${chgN(() => CLOTH_MAXST, 3)}★: two spare copies of the same piece at the same star merge into the next star (Fusion → UR Stars).`, 'Three spare pieces of one rarity fuse into one random piece of the next rarity (R → SSR, SSR → UR).', 'Wearing all 6 pieces of one set gives a big CS bonus; a UR character\'s <b>signature set</b> adds +1,000 CS, a leader skill tier and the Signature Style badge.']],
      ['Gear levels', ['Every copy has a level: R up to 10, SSR 20, UR 30 / 35 / 40 at 1★ / 2★ / 3★.', 'Each try costs gold and can fail; Thread is needed for the breakthroughs past levels 10, 20 and 30. Open the <b>Tailor</b> from the Wardrobe tab.', 'Every 10 levels a worn piece gives its slot\'s battle bonus (Top hero HP, Pants heal, Shoes opening card, Hat a faster skill, Accessory / Hand bigger weakness effects).']]] },
  { id: 'memory', ic: 'memory', name: 'Memory', lead: 'Each character holds one memory: a 16:9 picture with its own rarity and stars.',
    sec: () => [
      ['Equipping', ['Tap the slot to pick a copy. Every copy is separate, so two characters need two copies of the same memory.', 'Hold any memory picture to see it big.']],
      ['Stars', [`Every copy has 0–${chgN(() => MEM_MAXST, 3)}★: fuse another copy of the same memory into it for +1★ (Fusion → Memory Stars). The frame changes colour with its stars.`, 'Three spare memories of one rarity can be exchanged for a random new one of that rarity.']],
      ['Rewards', ['CS: SSR 500 / UR 1,000, +200 per star, +500 when it is one of the character\'s <b>signature memories</b>.', 'In battle the leader\'s memory resets its skill once (from round 8 at 0★, round 4 at 3★; sooner for a signature memory), and a UR memory adds +1 AP that turn.']]] },
  { id: 'pet', ic: 'paw', name: 'Pet', lead: 'Each character can take one pet copy along. Pets hatch from eggs in the Pets window.',
    sec: () => [
      ['Pets', ['Tap the slot to pick a copy; copies with another character can\'t be picked.', 'Two copies of the same pet fuse for +1★ on the best one, up to 6★ (Fusion → Pets).', 'Every copy has a grade F → SSS, raised with gold in Pets → Upgrade (each try can fail).']],
      ['Rewards', ['CS: the pet (SSR 600 / UR 1,200), its stars and its grade (up to 600 at SSS).', 'Pets give no battle power. Instead each kind boosts what its own character does: Dragon more battle gold, Fox shorter expeditions, Cat more raid clothes, Phoenix stamina back on a win, Bunny more bond EXP, Owl more Battle Rank EXP.', 'The grade sets the size of the bonus; at 3★ the pet adds the next kind\'s bonus at half strength.']]] },
  { id: 'bond', ic: 'heart', name: 'Bond & marriage', lead: 'Bond grows with gifts and time together. It goes from level 0 to 10.',
    sec: () => [
      ['Raising bond', [`${fmt(chgN(() => BOND_XP[BOND_XP.length - 1], 50000))} bond EXP in all: the first levels are cheap, the last three take half of it.`, 'Gifts: Lantern Sweets +40, Pearl Bracelet +150, Star Plushie +400 (bought with gold, or Seaweeds in the shop). Give one at a time or in bulk.', `A character living in the House earns ${fmt(chgN(() => HOUSE_BOND, 1000))} bond EXP a day.`, `Tapping the home wallpaper 3 times gives its character +${chgN(() => WPB_BOND, 200)} bond, 3 times a day.`]],
      ['Marriage', [`At bond level 10 you can propose with a ring (${chgN(() => RING_PRICE, 99)} pearls).`, 'Marriage unlocks the character\'s MR wedding outfit when it has one, and the Eternal Vow badge.']],
      ['Rewards', ['CS for every bond level, the Close Bond (5) and Soulbound (10) badges.', 'In battle the leader\'s hero gets +1 HP for every 2 bond levels (up to +5).']]] },
  { id: 'badges', ic: 'medal', name: 'Badges & info', lead: 'Badges under the name show what you have achieved with a character. Hover or tap one to see its requirement.',
    sec: () => [
      ['Badges', ['Rising Star (3★) and Max Stars (6★).', 'Close Bond (bond 5), Soulbound (bond 10) and Eternal Vow (married).', 'Signature Style (the full signature set worn, UR only).', 'Hidden, Rising and Full Potential (1, 4 and 7 plans complete).', 'SSS Awakened (awakened and at grade SSS).']],
      ['Character Info', ['The profile, the card attribute (its Card Battle playstyle) and the leader skill.', 'When the character is in the top 10 of its own server CS ranking, the Home tab shows its place; tap it to open the Ranking.']]] },
  { id: 'battle', ic: 'swords', name: 'In battle', lead: 'In Card Battles every deck has a leader: one of your characters. Everything you built on it shows up there.',
    sec: () => [
      ['Leader skill', ['Each character has a leader skill, set by its card attribute (Aggression, Defense, Control, Mobility, Support).', 'It costs AP and has a cooldown; awakened stars raise its tier (see Breakthrough).', 'With 12 cards of the leader\'s attribute in the deck the <b>attribute bond</b> adds a small bonus every turn.']],
      ['Build bonuses', ['Bond, Potential plans, the memory, SSS, gear levels, sets, CS brackets and skin sets all add battle bonuses for your side (shared caps keep them fair).', 'Pick a leader on the Deck screen; <b>All bonuses</b> lists everything it brings.']]] }
];
const CHG_FROM_TAB = { home: 'overview', skins: 'skins', wardrobe: 'wardrobe', memory: 'memory', pet: 'pet', bt: 'bt', pot: 'pot', bond: 'bond', info: 'badges' };
let chgPage = 'overview';
function openCharGuide(page) {
  chgPage = CHG.some(p => p.id === page) ? page : 'overview';
  openModal({ title: 'Character guide', ic: 'book', wide: true, kind: 'chguide', body: '<div class="chg" id="chgRoot"></div>', onMount: renderCharGuide });
}
function renderCharGuide() {
  const root = document.getElementById('chgRoot'); if (!root) return;
  const i = Math.max(0, CHG.findIndex(p => p.id === chgPage)), P = CHG[i];
  root.innerHTML = `<nav class="chg-rail" aria-label="Topics">${CHG.map((p, k) => `<button class="chg-tab ${k === i ? 'on' : ''}" data-chg="${p.id}"><span class="chg-n">${k + 1}</span><span class="chg-ti">${icon(p.ic)}</span><b>${esc(p.name)}</b></button>`).join('')}</nav>
    <article class="chg-page" tabindex="-1">
      <header class="chg-hero"><span class="chg-hic">${icon(P.ic)}</span><div><small>Topic ${i + 1} of ${CHG.length}</small><h3 class="ts">${esc(P.name)}</h3><p>${P.lead}</p></div></header>
      <div class="chg-secs">${P.sec().map(([h, L]) => `<section class="chg-sec"><h4>${esc(h)}</h4><ul>${L.map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('')}</div>
      <footer class="chg-foot"><button class="btn ghost" data-chgstep="-1" ${i ? '' : 'disabled'}>${icon('back')}${i ? esc(CHG[i - 1].name) : 'Back'}</button>
        <span class="chg-dots">${CHG.map((p, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
        <button class="btn gold" data-chgstep="1" ${i < CHG.length - 1 ? '' : 'data-close'}>${i < CHG.length - 1 ? `${esc(CHG[i + 1].name)}<span style="display:inline-flex;transform:scaleX(-1)">${icon('back')}</span>` : 'Got it'}</button></footer>
    </article>`;
  root.querySelectorAll('[data-chg]').forEach(b => b.onclick = () => { chgPage = b.dataset.chg; renderCharGuide(); });
  root.querySelectorAll('[data-chgstep]').forEach(b => b.onclick = () => { const j = i + +b.dataset.chgstep; if (j >= CHG.length) return closeModal(); if (j < 0) return; chgPage = CHG[j].id; renderCharGuide(); });
  const pg = root.querySelector('.chg-page'); pg.scrollTop = 0;
  const on = root.querySelector('.chg-tab.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
