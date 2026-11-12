/* ---------- global click routing ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open]'); if (!t) return;
  const k = t.dataset.open;
  if (k !== 'battle' && t.closest('.menu')) bthBack = false;   // opened from home: closing it goes home, not back to Battle
  if (k === 'summon') openSummon(t.dataset.banner);
  else if (k === 'mail') openMail();
  else if (k === 'settings') openSettings();
  else if (k === 'admin') { if (canAdmin()) openAdmin(t.dataset.adtab); }
  else if (k === 'wallpaper') openWallpaper();
  else if (k === 'characters') openCharacters(t.dataset.char);
  else if (k === 'collection') openCollection('character');
  else if (k === 'deck') openDeck();
  else if (k === 'battle') openBattle();   // the home Battle gate: Campaign, Raids, the Great Tree and Quick Match
  else if (k === 'clash') openCampaign();   // the Card Battle gate opens the campaign (Quick match is one tap from there)
  else if (k === 'pets') openPets();
  else if (k === 'farm') openFarm();
  else if (k === 'house') openFarm('house');
  else if (k === 'guild') openFarm('guild');
  else if (k === 'friends') openFriends();
  else if (k === 'offer') openOffer(t.dataset.offer);
  else if (k === 'raids') openRaids();
  else if (k === 'vault') { if (bthEl) { bthEl.remove(); bthEl = null; bthBack = true; } openRaids('vault'); }   // the gold "+": Raids on the Golden Vault
  else if (k === 'collectibles') openCollection('collectible');
  else if (k === 'profile') openProfile();
  else if (k === 'login') openLogin();
  else if (k === 'events') openEvents(t.dataset.ev);
  else if (k === 'bag') openInventory();
  else if (k === 'level') openLevel();
  else if (k === 'vip') openVip();
  else if (k === 'ranking') openRanking();
  else if (k === 'honor') openHonor();
  else if (k === 'spin') openSpin();
  else if (k === 'ach') openAch();
  else if (k === 'fuse') openFuse();
  else if (k === 'quests') openQuests();
  else if (k === 'redeem') openRedeem();
  else if (k === 'buytickets') openBuyTickets(t.dataset.tkbk);
  else if (k === 'skins') openCollection('skin');
  else if (k === 'shop') openShop(t.dataset.shoptab);
  else if (PLACEHOLDERS[k]) openPlaceholder(k);
});
