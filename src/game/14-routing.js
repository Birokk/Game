/* ---------- global click routing ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open]'); if (!t) return;
  const k = t.dataset.open;
  if (k === 'summon') openSummon(t.dataset.banner);
  else if (k === 'mail') openMail();
  else if (k === 'settings') openSettings();
  else if (k === 'admin') { if (canAdmin()) openAdmin(t.dataset.adtab); }
  else if (k === 'wallpaper') openWallpaper();
  else if (k === 'characters') openCharacters(t.dataset.char);
  else if (k === 'collection') openCollection('character');
  else if (k === 'pets') openPets();
  else if (k === 'farm') openFarm();
  else if (k === 'raids') openRaids();
  else if (k === 'collectibles') openCollection('collectible');
  else if (k === 'profile') openProfile();
  else if (k === 'login') openLogin();
  else if (k === 'events') openEvents(t.dataset.ev);
  else if (k === 'bag') openInventory();
  else if (k === 'level') openLevel();
  else if (k === 'spin') openSpin();
  else if (k === 'ach') openAch();
  else if (k === 'redeem') openRedeem();
  else if (k === 'buytickets') openBuyTickets(t.dataset.tkbk);
  else if (k === 'skins') openCollection('skin');
  else if (k === 'shop') openShop(t.dataset.shoptab);
  else if (PLACEHOLDERS[k]) openPlaceholder(k);
});
