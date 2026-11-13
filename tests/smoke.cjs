/* Smoke test: opens every screen, tab and admin page of the game and reports any error (page errors, console errors and
   the game's own error log, ERR_LOG). Run the dev server first (npm run dev -- --port 5199), then: npm run smoke
   (optional sizes: npm run smoke -- '[[1600,900],[390,844]]', optional URL: SMOKE_URL=http://localhost:5173/).
   Needs Playwright (npm i -D playwright, or a global install); the dev server exposes the game's names on window. */
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
const URL = process.env.SMOKE_URL || 'http://localhost:5199/';
const STEPS = `openCharacters()|openCollection()|openPets()|openInventory()|openProfile()|openSettings()|openSettings('account')|openMail()|openAch()|openQuests()|openQuests('weekly')|openLevel()|openRanking()|openRanking('char')|openRanking('vip')|openHonor()|openHonor('missions')|openHonor('unlock')|openEvents()|openEvents('scratch')|openEvents('msign')|openEvents('mystery')|openSpin()|openStamina()|openRedeem()|openVip()|openFriends()|openFriends('find')|openFuse()|openFarm()|openFarm('expedition')|openFarm('camp')|openFarm('house')|openFarm('guild')|openHangout()|openGuildBoss()|openBattle()|openCampaign()|openTower()|openWorld()|openQuickMatch()|openTraining()|openRaids()|openRaids('vault')|openDeck()|openArena()|openArena('rank')|openSummon()|openProb('limited')|openProb('standard')|openDrawRecord('limited')|openDrawRecord('stepup')|openDrawRecord('beginner')|openWallpaper()|openOffer()|openShop()|openShop('skins')|openShop('topup')|openShop('daily')|openShop('pearl')|openShop('exchange')|openShop('frags')|openShop('points')|openShop('board')|openShop('backs')|openShop('arena')|openCSInfo()|openRename()|openSupport()|openNews()|openMap()`.split('|');
const ADMIN = 'pool skins mr wardrobe memories banners pullfx events offers shopart honor battle raids farm:base farm:exp farm:camp farm:house farm:guild title icons art wallet server'.split(' ');
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const [W, H] of JSON.parse(process.argv[2] || '[[1600,900]]')) {
  const pg = await b.newPage({ viewport: { width: W, height: H } }); let cur = 'boot'; const errs = [];
  pg.on('pageerror', e => errs.push(cur + ': ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(cur + ' (console): ' + m.text().slice(0, 200)); });
  await pg.goto(URL); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { document.querySelectorAll('#title,.loadx,.modal-back,.loading').forEach(x => x.remove()); closeModal(); S.player.mc = 'f'; if (!inGuild()) joinGuild(practiceGuilds()[0].id); persist(); renderMenu(); });
  const clean = () => pg.evaluate(() => { for (const f of ['closeModal','closePull','closeProb','closeSummon','closeOffer','closeArena','closeBattle','closeCampaign','closeCharacters','closeDeck','closeEvents','closeFarm','closeGuildBoss','closeHangout','closeHonor','closeInventory','closeQuickMatch','closeTraining','closeRaids','closeSettings','closeShop','closeTower','closeWorld']) { try { window[f](false); } catch (e) {} }
    document.querySelectorAll('.rewpop,.rdrop,.pfpick,.toast,.wdpick,.memview,.upop').forEach(x => x.remove()); });
  for (const s of STEPS) { cur = s; try { await pg.evaluate(s); await pg.waitForTimeout(250); } catch (e) { errs.push(s + ' threw: ' + e.message.split('\n')[0].slice(0, 200)); } await pg.keyboard.press('Escape'); await pg.waitForTimeout(80); await clean(); }
  for (const t of ADMIN) { cur = 'admin ' + t; try { await pg.evaluate(t => openAdmin(t), t); await pg.waitForTimeout(250); } catch (e) { errs.push(cur + ' threw: ' + e.message.split('\n')[0].slice(0, 200)); } }
  await clean();
  const logged = await pg.evaluate(() => (typeof ERR_LOG !== 'undefined' ? ERR_LOG : []).map(e => `${e.where} ${e.msg}`));
  logged.forEach(m => errs.push('ERR_LOG: ' + m)); bad += errs.length;
  console.log(W, H, errs.length ? errs : 'no errors');
  await pg.close(); }
  await b.close(); process.exit(bad ? 1 : 0); })();
