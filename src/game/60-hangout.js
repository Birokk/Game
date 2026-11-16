/* ---------- Guild Hangout: the minigames were removed (the owner's ask) ----------
   The Hangout spot stays on the guild screen (GUILD_SPOTS 'hangout' in 41-guild.js) and says "To be added"; tapping it
   only says so. The three old minigames (Lantern Pairs, Pearl Shells, Star Catch, 1 pearl each, 2 a day) are in the git
   history of this file. Old saves keep S.hang; nothing reads it now. */
const hangLeft = () => 0;
const hangReady = () => false;
function openHangout() { toast('Guild Hangout: new activities are to be added.'); }
function closeHangout() {}
INFO.hangout = () => ({ title: 'Guild Hangout', body: '<p class="desc">The Hangout is a place for guild activities. They are to be added.</p>' });
