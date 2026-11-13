/* =========================================================
   GUILD BOSS (after the owner asked for one): a very high-HP dragon fought in Card Battle by the whole guild together.
   - One boss fight lasts 48 hours (GB_MS, the same windows for everyone from GB_EPOCH; gbKey). Every player gets 2 battles
     a fight (GB_TRIES, S.guild.boss.tries; switching guilds does not give more).
   - The dragon's HP is shared by the guild (every member's damage comes off the same bar) and grows with the guild
     (the owner's rule): 500 HP with 1 member up to 2,000 with 50, in even steps (gbBaseHp, ~30.6 HP a member, rounded to
     10). When it falls a stronger one takes its place in the same fight (+25% a level, gbLvHp), so you can always fight
     it, and every member gets 20 pearls + 60 stamina by mail for each dragon the guild defeats (GB_KILL, gbMailKills).
     There is no guild server yet: the other members are practice players whose battles are seeded (gbMateHits: 80% fight
     twice, damage 8-58 by their CS, spread over the 48 hours), so the bar goes down over the two days; a full guild of
     30 usually brings the first dragon down, 20 now and then, 10 never.
   - A battle: your own deck against the boss's deck (the war council deck of the Great Tree's top floor,
     CC_TOWER_DECKS.spire) with the boss's HP = what is left of the bar, you first, no battle event, and it ends after
     round 12 (GB_ROUNDS, "the dragon flies off"), when your hero falls or when the dragon falls. The boss plays with
     the auto play planner at its best (GB_AI: no slips, no noise), so it is a strong player; the dragon takes triple
     damage from every hit (GB_HITX, the engine's hitX option). In Node an average player deals ~23 damage a battle, a
     good one ~31 (up to ~54).
   - Rewards after every battle by the damage dealt (GB_TIERS): SSR or UR gear only (no R; UR 20-60%, 5% of UR pieces 2★,
     better than raids), gold, Standard tickets and 5-50 stamina (gbStam).
   - Art (admin → Battle screen → Guild boss): name (content S.gboss.name), the boss art gboss:art (16:9, framable; the
     boss screen, the VS intro and the card) and its round icon gboss:icon (square; else cut from the art), plus the
     Battle screen card wallpaper battle:gboss. Without uploads it is the drawn dragon (GB_SVG).
   Where: the Battle screen's Guild Boss card and the Guild Boss spot on the guild screen (openGuildBoss).
   ========================================================= */
const GB_HP = 500, GB_HP_MAX = 2000, GB_HP_N = 50, GB_LV_UP = .25, GB_HITX = 3, GB_MS = 48 * 36e5, GB_TRIES = 2, GB_ROUNDS = 12, GB_EPOCH = Date.UTC(2026, 0, 5), GB_STAR2 = .05;
const GB_AI = { ...CC_AUTO, slip: 0, noise: 0 };   // the boss plays like auto play at its best
// [from damage, gear pieces, UR chance per piece, gold, Standard tickets] — stamina is gbStam(damage)
const GB_TIERS = [[0, 0, 0, 2000, 0], [1, 1, .2, 5000, 1], [15, 1, .3, 9000, 1], [30, 2, .35, 14000, 2], [45, 2, .45, 20000, 2], [60, 3, .5, 26000, 3], [75, 3, .6, 32000, 3]];
const GB_KILL = { pearls: 20, stamina: 60 };   // mailed to every member for each dragon the guild defeats
const GB_STAM_MAXV = 50, gbStam = d => Math.min(GB_STAM_MAXV, 5 + Math.round(d * .6));
const gbTier = d => GB_TIERS.filter(t => d >= t[0]).pop();
const r10 = x => Math.round(x / 10) * 10;
const gbBaseHp = n => r10(GB_HP + (GB_HP_MAX - GB_HP) * (Math.min(GB_HP_N, Math.max(1, n)) - 1) / (GB_HP_N - 1));   // 500 HP for 1 member … 2,000 for 50
const gbLvHp = (lv, n) => r10(gbBaseHp(n) * (1 + GB_LV_UP * (lv - 1)));
const gbKey = (t = Date.now()) => Math.floor((t - GB_EPOCH) / GB_MS);
const gbEnds = (k = gbKey()) => GB_EPOCH + (k + 1) * GB_MS;
const gbName = () => ((S.gboss && S.gboss.name) || '').trim() || 'Elder Dragon';
ICONS.dragon = '<path d="M4 15c2-6 6-9 11-9l4-3-1 4c2 1 3 3 3 5l-3-1-2 3c-2 0-3 1-4 3l-2-2-3 3-1-3-2 1z"/><circle cx="15.5" cy="9" r=".8" fill="currentColor"/>';
/* the drawn dragon (an original scene made once by a Python script): 1600×900; the card and the icon crop it */
const GB_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1600 900\" preserveAspectRatio=\"xMidYMid slice\"><defs> <radialGradient id=\"gbXsky\" cx=\"52%\" cy=\"40%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#ffb04a\"/><stop offset=\".16\" stop-color=\"#f0602a\"/><stop offset=\".38\" stop-color=\"#9a1c26\"/><stop offset=\".66\" stop-color=\"#3a0818\"/><stop offset=\"1\" stop-color=\"#0e030a\"/></radialGradient> <radialGradient id=\"gbXsun\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" stop-color=\"#fff0c0\" stop-opacity=\".95\"/><stop offset=\".35\" stop-color=\"#ffb04a\" stop-opacity=\".55\"/><stop offset=\"1\" stop-color=\"#ff5a2a\" stop-opacity=\"0\"/></radialGradient> <linearGradient id=\"gbXbody\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#4a1220\"/><stop offset=\".5\" stop-color=\"#2a0912\"/><stop offset=\"1\" stop-color=\"#12040a\"/></linearGradient> <linearGradient id=\"gbXwing\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#3e0c18\" stop-opacity=\".97\"/><stop offset=\".55\" stop-color=\"#22070f\" stop-opacity=\".98\"/><stop offset=\"1\" stop-color=\"#100308\"/></linearGradient> <linearGradient id=\"gbXhorn\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#2a0c10\"/><stop offset=\".7\" stop-color=\"#8a5a40\"/><stop offset=\"1\" stop-color=\"#f0d0a0\"/></linearGradient> <radialGradient id=\"gbXeye\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" stop-color=\"#fffbe0\"/><stop offset=\".4\" stop-color=\"#ffd23a\"/><stop offset=\"1\" stop-color=\"#ff6a00\"/></radialGradient> <radialGradient id=\"gbXglow\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0\" stop-color=\"#ffcf5a\" stop-opacity=\".9\"/><stop offset=\"1\" stop-color=\"#ff6a00\" stop-opacity=\"0\"/></radialGradient> <linearGradient id=\"gbXlava\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ff7a2a\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#ff5a1a\" stop-opacity=\".55\"/></linearGradient> <filter id=\"gbXblur\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\"><feGaussianBlur stdDeviation=\"5\"/></filter> <filter id=\"gbXsoft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"18\"/></filter> <radialGradient id=\"gbXvig\" cx=\"50%\" cy=\"45%\" r=\"70%\"><stop offset=\".55\" stop-color=\"#000\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#05010a\" stop-opacity=\".85\"/></radialGradient> </defs> <rect width=\"1600\" height=\"900\" fill=\"url(#gbXsky)\"/> <circle cx=\"800\" cy=\"330\" r=\"300\" fill=\"url(#gbXsun)\"/> <g fill=\"#ffd9a0\" opacity=\".55\"><circle cx=\"136\" cy=\"135\" r=\"0.8\"/><circle cx=\"929\" cy=\"5\" r=\"1.1\"/><circle cx=\"1132\" cy=\"213\" r=\"1.1\"/><circle cx=\"1273\" cy=\"66\" r=\"0.8\"/><circle cx=\"1079\" cy=\"363\" r=\"0.8\"/><circle cx=\"224\" cy=\"82\" r=\"1.1\"/><circle cx=\"103\" cy=\"92\" r=\"0.8\"/><circle cx=\"638\" cy=\"321\" r=\"1.1\"/><circle cx=\"1087\" cy=\"105\" r=\"1.1\"/><circle cx=\"912\" cy=\"256\" r=\"1.5\"/><circle cx=\"364\" cy=\"138\" r=\"1.1\"/><circle cx=\"37\" cy=\"128\" r=\"0.8\"/><circle cx=\"31\" cy=\"9\" r=\"1.5\"/><circle cx=\"1035\" cy=\"282\" r=\"0.8\"/><circle cx=\"1053\" cy=\"243\" r=\"0.8\"/><circle cx=\"915\" cy=\"54\" r=\"1.5\"/><circle cx=\"1331\" cy=\"221\" r=\"1.5\"/><circle cx=\"1013\" cy=\"279\" r=\"1.1\"/><circle cx=\"1037\" cy=\"157\" r=\"1.5\"/><circle cx=\"440\" cy=\"117\" r=\"1.1\"/><circle cx=\"406\" cy=\"361\" r=\"1.5\"/><circle cx=\"1302\" cy=\"71\" r=\"1.1\"/><circle cx=\"711\" cy=\"27\" r=\"0.8\"/><circle cx=\"29\" cy=\"36\" r=\"1.5\"/><circle cx=\"1517\" cy=\"130\" r=\"1.1\"/><circle cx=\"334\" cy=\"28\" r=\"0.8\"/><circle cx=\"1362\" cy=\"195\" r=\"1.5\"/><circle cx=\"1373\" cy=\"144\" r=\"1.5\"/><circle cx=\"496\" cy=\"354\" r=\"1.1\"/><circle cx=\"92\" cy=\"235\" r=\"0.8\"/><circle cx=\"322\" cy=\"137\" r=\"1.1\"/><circle cx=\"7\" cy=\"134\" r=\"1.1\"/><circle cx=\"673\" cy=\"280\" r=\"1.1\"/><circle cx=\"500\" cy=\"17\" r=\"1.1\"/><circle cx=\"446\" cy=\"182\" r=\"0.8\"/><circle cx=\"2\" cy=\"171\" r=\"1.1\"/><circle cx=\"171\" cy=\"243\" r=\"1.1\"/><circle cx=\"1029\" cy=\"335\" r=\"0.8\"/><circle cx=\"508\" cy=\"258\" r=\"0.8\"/><circle cx=\"186\" cy=\"135\" r=\"0.8\"/></g> <path d=\"M0 760 L120 690 L210 720 L330 640 L430 700 L520 660 L600 720 L660 700 L700 760 L960 760 L1000 690 L1090 650 L1180 700 L1270 630 L1380 690 L1470 650 L1600 700 L1600 900 L0 900 Z\" fill=\"#24060f\"/><path d=\"M0 760 L120 690 L210 720 L330 640 L430 700 L520 660 L600 720 L660 700 L700 760 L960 760 L1000 690 L1090 650 L1180 700 L1270 630 L1380 690 L1470 650 L1600 700 L1600 900 L0 900 Z\" fill=\"url(#gbXlava)\" opacity=\".7\"/> <g class=\"gbw\"> <path d=\"M720 430 Q620 195 520 235 L150 70 Q273 210 205 330 Q338 348 330 455 Q434 424 470 540 Q549 462 650 560 Z\" fill=\"url(#gbXwing)\"/><path d=\"M920 430 Q1020 195 1120 235 L1490 70 Q1367 210 1435 330 Q1302 348 1310 455 Q1206 424 1170 540 Q1091 462 990 560 Z\" fill=\"url(#gbXwing)\"/> <g fill=\"none\" stroke=\"#ff8a4a\" stroke-width=\"5\" opacity=\".55\" filter=\"url(#gbXblur)\"><path d=\"M720 430 Q620 195 520 235 L150 70 Q273 210 205 330 Q338 348 330 455 Q434 424 470 540 Q549 462 650 560 Z\"/><path d=\"M920 430 Q1020 195 1120 235 L1490 70 Q1367 210 1435 330 Q1302 348 1310 455 Q1206 424 1170 540 Q1091 462 990 560 Z\"/></g> <g fill=\"none\" stroke=\"#120308\" stroke-width=\"11\" stroke-linecap=\"round\"><path d=\"M520 235 L150 70\"/><path d=\"M520 235 L205 330\"/><path d=\"M520 235 L330 455\"/><path d=\"M520 235 L470 540\"/><path d=\"M1120 235 L1490 70\"/><path d=\"M1120 235 L1435 330\"/><path d=\"M1120 235 L1310 455\"/><path d=\"M1120 235 L1170 540\"/><path d=\"M720 430 Q620 195 520 235\"/><path d=\"M920 430 Q1020 195 1120 235\"/></g> <g fill=\"none\" stroke=\"#ff9a5a\" stroke-width=\"2.5\" stroke-linecap=\"round\" opacity=\".5\"><path d=\"M520 235 L150 70\"/><path d=\"M520 235 L205 330\"/><path d=\"M520 235 L330 455\"/><path d=\"M520 235 L470 540\"/><path d=\"M1120 235 L1490 70\"/><path d=\"M1120 235 L1435 330\"/><path d=\"M1120 235 L1310 455\"/><path d=\"M1120 235 L1170 540\"/></g> <g fill=\"#e8c8a0\"><path d=\"M520 235 l-14 -30 l-4 26z\" class=\"gbw-claw\"/><path d=\"M1120 235 l14 -30 l4 26z\" class=\"gbw-claw\"/></g> </g> <path d=\"M640 760 C596 800 584 852 592 900 L690 900 C682 856 690 812 712 782 Z M990 760 C1034 800 1046 852 1038 900 L940 900 C948 856 940 812 918 782 Z\" fill=\"url(#gbXbody)\"/><path d=\"M500 900 C520 790 600 700 700 664 C770 642 860 640 930 664 C1030 700 1100 790 1120 900 Z\" fill=\"url(#gbXbody)\"/><g fill=\"#e8c8a0\"><path d=\"M592 896 l-16 4 l18 -22z\"/><path d=\"M622 900 l-6 -26 l16 22z\"/><path d=\"M652 900 l2 -24 l12 24z\"/><path d=\"M1038 896 l16 4 l-18 -22z\"/><path d=\"M1008 900 l6 -26 l-16 22z\"/><path d=\"M978 900 l-2 -24 l-12 24z\"/></g> <path d=\"M500 900 C520 790 600 700 700 664 C770 642 860 640 930 664 C1030 700 1100 790 1120 900 Z\" fill=\"none\" stroke=\"#ffb070\" stroke-width=\"2.5\" opacity=\".6\"/><g fill=\"none\" stroke=\"#c0602a\" stroke-width=\"4\" opacity=\".55\"><path d=\"M700 660 Q815 684 930 660\"/><path d=\"M686 704 Q815 730 944 704\"/><path d=\"M672 748 Q815 776 958 748\"/><path d=\"M658 792 Q815 822 972 792\"/><path d=\"M644 836 Q815 868 986 836\"/></g> <path d=\"M790 404 C752 440 724 500 716 560 C710 610 700 640 690 668 L930 668 C910 630 896 590 892 540 C888 470 880 420 862 384 Z\" fill=\"url(#gbXbody)\"/> <g fill=\"#1a0509\"><path d=\"M856 400 l34 -10 l-24 34z\"/><path d=\"M861 444 l32 -10 l-24 34z\"/><path d=\"M866 488 l30 -10 l-24 34z\"/><path d=\"M871 532 l28 -10 l-24 34z\"/><path d=\"M876 576 l26 -10 l-24 34z\"/></g> <path d=\"M748 272 C770 236 790 214 818 196 C808 230 792 254 774 276 Z\" fill=\"url(#gbXhorn)\"/><path d=\"M804 278 C826 222 872 170 948 120 C1000 90 1030 96 1040 104 C1000 108 960 140 930 180 C900 220 872 262 848 298 Z\" fill=\"url(#gbXhorn)\"/><path d=\"M846 304 C900 270 964 256 1022 262 C1050 266 1068 280 1074 292 C1044 280 1008 282 970 294 C930 306 894 320 862 334 Z\" fill=\"url(#gbXhorn)\"/> <path d=\"M790 412 C760 404 720 396 694 390 L640 378 C618 372 596 360 584 346 L560 334 C552 326 556 316 566 312 L600 300 C628 290 660 284 690 282 L740 270 C770 262 804 262 830 274 C858 288 876 310 880 336 C884 364 870 392 846 406 C828 414 808 416 790 412 Z\" fill=\"url(#gbXbody)\"/> <path d=\"M694 390 C680 404 652 410 626 404 L604 394 C620 392 640 388 660 384 Z\" fill=\"#1a0508\"/><path d=\"M684 298 C704 284 736 280 764 290 L760 300 C736 294 712 296 690 306 Z\" fill=\"#14040a\"/><g fill=\"#22070f\" stroke=\"#ff9a5a\" stroke-width=\"1.5\" stroke-opacity=\".6\"><path d=\"M836 404 l40 26 l-34 -6z\"/><path d=\"M820 412 l30 40 l-34 -22z\"/><path d=\"M800 414 l14 44 l-26 -34z\"/></g> <g fill=\"#f6e6c8\"><path d=\"M600 378 l6 14 l6 -13z\"/><path d=\"M618 380 l6 14 l6 -13z\"/><path d=\"M636 383 l6 14 l6 -13z\"/><path d=\"M654 385 l6 14 l6 -13z\"/><path d=\"M672 388 l6 14 l6 -13z\"/><path d=\"M690 390 l6 14 l6 -13z\"/></g> <g fill=\"none\" stroke=\"#ffb070\" stroke-width=\"3\" opacity=\".85\"><path d=\"M790 412 C760 404 720 396 694 390 L640 378 C618 372 596 360 584 346 L560 334 C552 326 556 316 566 312 L600 300 C628 290 660 284 690 282 L740 270 C770 262 804 262 830 274 C858 288 876 310 880 336 C884 364 870 392 846 406 C828 414 808 416 790 412 Z\"/><path d=\"M790 404 C752 440 724 500 716 560 C710 610 700 640 690 668 L930 668 C910 630 896 590 892 540 C888 470 880 420 862 384 Z\"/></g> <g fill=\"none\" stroke=\"#ff8a3a\" stroke-width=\"8\" opacity=\".45\" filter=\"url(#gbXblur)\"><path d=\"M790 412 C760 404 720 396 694 390 L640 378 C618 372 596 360 584 346 L560 334 C552 326 556 316 566 312 L600 300 C628 290 660 284 690 282 L740 270 C770 262 804 262 830 274 C858 288 876 310 880 336 C884 364 870 392 846 406 C828 414 808 416 790 412 Z\"/><path d=\"M804 278 C826 222 872 170 948 120 C1000 90 1030 96 1040 104 C1000 108 960 140 930 180 C900 220 872 262 848 298 Z\"/></g> <circle cx=\"716\" cy=\"316\" r=\"44\" fill=\"url(#gbXglow)\" class=\"gbeye-g\"/> <ellipse cx=\"716\" cy=\"316\" rx=\"20\" ry=\"8\" fill=\"url(#gbXeye)\" transform=\"rotate(-10 716 316)\"/> <ellipse cx=\"716\" cy=\"316\" rx=\"3\" ry=\"7.5\" fill=\"#2a0500\" transform=\"rotate(-10 716 316)\"/> <path d=\"M690 300 Q716 288 748 300\" fill=\"none\" stroke=\"#120306\" stroke-width=\"7\" stroke-linecap=\"round\"/> <ellipse cx=\"574\" cy=\"320\" rx=\"7\" ry=\"4\" fill=\"#0a0204\"/> <g fill=\"none\" stroke=\"#ffd0a0\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".28\" filter=\"url(#gbXblur)\"><path d=\"M566 314 C540 296 548 270 520 250 C500 236 506 214 486 200\"/></g> <circle cx=\"606\" cy=\"392\" r=\"60\" fill=\"url(#gbXglow)\" opacity=\".5\" filter=\"url(#gbXsoft)\"/> <path d=\"M0 860 L140 820 L300 840 L420 812 L560 850 L560 900 L0 900 Z M1070 900 L1070 848 L1220 818 L1360 840 L1480 810 L1600 830 L1600 900 Z\" fill=\"#0c0306\"/> <path d=\"M80 870 L140 846 L190 858 M300 880 L360 852 L420 862 M1150 880 L1220 852 L1290 866 M1400 876 L1470 846 L1540 856\" fill=\"none\" stroke=\"#ff7a2a\" stroke-width=\"3\" opacity=\".8\" filter=\"url(#gbXblur)\"/> <path d=\"M80 870 L140 846 L190 858 M300 880 L360 852 L420 862 M1150 880 L1220 852 L1290 866 M1400 876 L1470 846 L1540 856\" fill=\"none\" stroke=\"#ffd080\" stroke-width=\"1.2\"/> <g><circle cx=\"703\" cy=\"214\" r=\"3\" fill=\"#ffd27a\" opacity=\"0.39\" class=\"gbe\" style=\"--d:2.14s\"/><circle cx=\"788\" cy=\"656\" r=\"1.5\" fill=\"#ffb35a\" opacity=\"0.37\" class=\"gbe\" style=\"--d:1.73s\"/><circle cx=\"183\" cy=\"306\" r=\"1.5\" fill=\"#ff5a2a\" opacity=\"0.39\" class=\"gbe\" style=\"--d:2.26s\"/><circle cx=\"497\" cy=\"705\" r=\"4\" fill=\"#ffd27a\" opacity=\"0.70\" class=\"gbe\" style=\"--d:1.59s\"/><circle cx=\"492\" cy=\"107\" r=\"4\" fill=\"#ffb35a\" opacity=\"0.52\" class=\"gbe\" style=\"--d:0.58s\"/><circle cx=\"281\" cy=\"644\" r=\"2.5\" fill=\"#ffb35a\" opacity=\"0.41\" class=\"gbe\" style=\"--d:2.28s\"/><circle cx=\"424\" cy=\"441\" r=\"1.5\" fill=\"#ffd27a\" opacity=\"0.69\" class=\"gbe\" style=\"--d:2.48s\"/><circle cx=\"1056\" cy=\"756\" r=\"4\" fill=\"#ff5a2a\" opacity=\"0.82\" class=\"gbe\" style=\"--d:1.86s\"/><circle cx=\"968\" cy=\"430\" r=\"2.5\" fill=\"#ffb35a\" opacity=\"0.83\" class=\"gbe\" style=\"--d:2.80s\"/><circle cx=\"539\" cy=\"143\" r=\"4\" fill=\"#ff7a3a\" opacity=\"0.67\" class=\"gbe\" style=\"--d:3.50s\"/><circle cx=\"1533\" cy=\"519\" r=\"2.5\" fill=\"#ffd27a\" opacity=\"0.42\" class=\"gbe\" style=\"--d:1.67s\"/><circle cx=\"740\" cy=\"215\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.37\" class=\"gbe\" style=\"--d:2.67s\"/><circle cx=\"1182\" cy=\"646\" r=\"2.5\" fill=\"#ff7a3a\" opacity=\"0.77\" class=\"gbe\" style=\"--d:2.38s\"/><circle cx=\"1227\" cy=\"527\" r=\"1.5\" fill=\"#ffd27a\" opacity=\"0.92\" class=\"gbe\" style=\"--d:1.90s\"/><circle cx=\"1400\" cy=\"126\" r=\"1.5\" fill=\"#ff7a3a\" opacity=\"0.74\" class=\"gbe\" style=\"--d:3.97s\"/><circle cx=\"952\" cy=\"351\" r=\"3\" fill=\"#ff7a3a\" opacity=\"0.36\" class=\"gbe\" style=\"--d:1.85s\"/><circle cx=\"384\" cy=\"685\" r=\"1.5\" fill=\"#ff5a2a\" opacity=\"0.39\" class=\"gbe\" style=\"--d:3.07s\"/><circle cx=\"304\" cy=\"816\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.58\" class=\"gbe\" style=\"--d:3.49s\"/><circle cx=\"205\" cy=\"230\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.68\" class=\"gbe\" style=\"--d:3.53s\"/><circle cx=\"921\" cy=\"623\" r=\"2.5\" fill=\"#ff5a2a\" opacity=\"0.94\" class=\"gbe\" style=\"--d:2.73s\"/><circle cx=\"819\" cy=\"296\" r=\"2\" fill=\"#ffd27a\" opacity=\"0.46\" class=\"gbe\" style=\"--d:0.93s\"/><circle cx=\"517\" cy=\"72\" r=\"3\" fill=\"#ffb35a\" opacity=\"0.51\" class=\"gbe\" style=\"--d:0.02s\"/><circle cx=\"898\" cy=\"607\" r=\"2.5\" fill=\"#ff7a3a\" opacity=\"0.92\" class=\"gbe\" style=\"--d:2.76s\"/><circle cx=\"1095\" cy=\"692\" r=\"1.5\" fill=\"#ff5a2a\" opacity=\"0.89\" class=\"gbe\" style=\"--d:3.12s\"/><circle cx=\"1433\" cy=\"632\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.59\" class=\"gbe\" style=\"--d:0.41s\"/><circle cx=\"1339\" cy=\"470\" r=\"1.5\" fill=\"#ffb35a\" opacity=\"0.39\" class=\"gbe\" style=\"--d:0.84s\"/><circle cx=\"372\" cy=\"172\" r=\"2.5\" fill=\"#ffd27a\" opacity=\"0.41\" class=\"gbe\" style=\"--d:2.27s\"/><circle cx=\"1138\" cy=\"163\" r=\"2.5\" fill=\"#ffd27a\" opacity=\"0.39\" class=\"gbe\" style=\"--d:0.83s\"/><circle cx=\"810\" cy=\"212\" r=\"2.5\" fill=\"#ff7a3a\" opacity=\"0.71\" class=\"gbe\" style=\"--d:1.90s\"/><circle cx=\"276\" cy=\"559\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.64\" class=\"gbe\" style=\"--d:0.34s\"/><circle cx=\"249\" cy=\"827\" r=\"2.5\" fill=\"#ff7a3a\" opacity=\"0.64\" class=\"gbe\" style=\"--d:2.77s\"/><circle cx=\"1097\" cy=\"83\" r=\"2\" fill=\"#ff7a3a\" opacity=\"0.44\" class=\"gbe\" style=\"--d:2.17s\"/><circle cx=\"95\" cy=\"836\" r=\"4\" fill=\"#ff7a3a\" opacity=\"0.94\" class=\"gbe\" style=\"--d:3.45s\"/><circle cx=\"1465\" cy=\"327\" r=\"4\" fill=\"#ff7a3a\" opacity=\"0.89\" class=\"gbe\" style=\"--d:1.42s\"/><circle cx=\"496\" cy=\"605\" r=\"4\" fill=\"#ff7a3a\" opacity=\"0.73\" class=\"gbe\" style=\"--d:2.45s\"/><circle cx=\"439\" cy=\"305\" r=\"3\" fill=\"#ffb35a\" opacity=\"0.47\" class=\"gbe\" style=\"--d:1.97s\"/><circle cx=\"1537\" cy=\"89\" r=\"1.5\" fill=\"#ff7a3a\" opacity=\"0.63\" class=\"gbe\" style=\"--d:0.77s\"/><circle cx=\"1279\" cy=\"412\" r=\"3\" fill=\"#ff7a3a\" opacity=\"0.92\" class=\"gbe\" style=\"--d:1.46s\"/><circle cx=\"491\" cy=\"164\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.47\" class=\"gbe\" style=\"--d:0.82s\"/><circle cx=\"1318\" cy=\"684\" r=\"1.5\" fill=\"#ff5a2a\" opacity=\"0.90\" class=\"gbe\" style=\"--d:1.38s\"/><circle cx=\"1357\" cy=\"146\" r=\"1.5\" fill=\"#ff5a2a\" opacity=\"0.82\" class=\"gbe\" style=\"--d:3.00s\"/><circle cx=\"1019\" cy=\"242\" r=\"3\" fill=\"#ff7a3a\" opacity=\"0.40\" class=\"gbe\" style=\"--d:3.78s\"/><circle cx=\"1518\" cy=\"465\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.80\" class=\"gbe\" style=\"--d:0.34s\"/><circle cx=\"365\" cy=\"234\" r=\"2\" fill=\"#ffd27a\" opacity=\"0.44\" class=\"gbe\" style=\"--d:3.62s\"/><circle cx=\"1383\" cy=\"209\" r=\"4\" fill=\"#ff5a2a\" opacity=\"0.74\" class=\"gbe\" style=\"--d:1.40s\"/><circle cx=\"1163\" cy=\"621\" r=\"2\" fill=\"#ffd27a\" opacity=\"0.36\" class=\"gbe\" style=\"--d:3.88s\"/><circle cx=\"1370\" cy=\"165\" r=\"4\" fill=\"#ffb35a\" opacity=\"0.61\" class=\"gbe\" style=\"--d:3.49s\"/><circle cx=\"472\" cy=\"88\" r=\"2.5\" fill=\"#ffb35a\" opacity=\"0.53\" class=\"gbe\" style=\"--d:0.96s\"/><circle cx=\"1241\" cy=\"393\" r=\"2.5\" fill=\"#ff5a2a\" opacity=\"0.85\" class=\"gbe\" style=\"--d:0.24s\"/><circle cx=\"1555\" cy=\"422\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.85\" class=\"gbe\" style=\"--d:3.51s\"/><circle cx=\"307\" cy=\"604\" r=\"2\" fill=\"#ffd27a\" opacity=\"0.87\" class=\"gbe\" style=\"--d:3.11s\"/><circle cx=\"1286\" cy=\"64\" r=\"2\" fill=\"#ffb35a\" opacity=\"0.43\" class=\"gbe\" style=\"--d:2.48s\"/><circle cx=\"286\" cy=\"629\" r=\"1.5\" fill=\"#ff7a3a\" opacity=\"0.76\" class=\"gbe\" style=\"--d:2.12s\"/><circle cx=\"1028\" cy=\"855\" r=\"1.5\" fill=\"#ffd27a\" opacity=\"0.50\" class=\"gbe\" style=\"--d:1.11s\"/><circle cx=\"240\" cy=\"579\" r=\"3\" fill=\"#ffd27a\" opacity=\"0.81\" class=\"gbe\" style=\"--d:3.65s\"/><circle cx=\"947\" cy=\"393\" r=\"4\" fill=\"#ffb35a\" opacity=\"0.77\" class=\"gbe\" style=\"--d:1.81s\"/><circle cx=\"1132\" cy=\"549\" r=\"4\" fill=\"#ffb35a\" opacity=\"0.77\" class=\"gbe\" style=\"--d:3.51s\"/><circle cx=\"571\" cy=\"632\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.43\" class=\"gbe\" style=\"--d:0.49s\"/><circle cx=\"945\" cy=\"383\" r=\"1.5\" fill=\"#ffb35a\" opacity=\"0.61\" class=\"gbe\" style=\"--d:0.85s\"/><circle cx=\"660\" cy=\"185\" r=\"2\" fill=\"#ff7a3a\" opacity=\"0.44\" class=\"gbe\" style=\"--d:3.53s\"/><circle cx=\"997\" cy=\"284\" r=\"1.5\" fill=\"#ff5a2a\" opacity=\"0.88\" class=\"gbe\" style=\"--d:0.65s\"/><circle cx=\"1407\" cy=\"289\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.95\" class=\"gbe\" style=\"--d:1.62s\"/><circle cx=\"902\" cy=\"260\" r=\"2.5\" fill=\"#ff7a3a\" opacity=\"0.41\" class=\"gbe\" style=\"--d:1.46s\"/><circle cx=\"732\" cy=\"627\" r=\"3\" fill=\"#ff5a2a\" opacity=\"0.77\" class=\"gbe\" style=\"--d:1.54s\"/><circle cx=\"1099\" cy=\"698\" r=\"2.5\" fill=\"#ffd27a\" opacity=\"0.42\" class=\"gbe\" style=\"--d:3.67s\"/><circle cx=\"508\" cy=\"167\" r=\"1.5\" fill=\"#ff7a3a\" opacity=\"0.51\" class=\"gbe\" style=\"--d:3.62s\"/><circle cx=\"411\" cy=\"336\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.86\" class=\"gbe\" style=\"--d:2.70s\"/><circle cx=\"569\" cy=\"475\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.77\" class=\"gbe\" style=\"--d:0.36s\"/><circle cx=\"157\" cy=\"764\" r=\"2\" fill=\"#ff5a2a\" opacity=\"0.89\" class=\"gbe\" style=\"--d:1.08s\"/><circle cx=\"74\" cy=\"709\" r=\"1.5\" fill=\"#ff7a3a\" opacity=\"0.40\" class=\"gbe\" style=\"--d:3.42s\"/></g> <rect width=\"1600\" height=\"900\" fill=\"url(#gbXvig)\"/> </svg>";
const gbSvg = (vb, cls = '') => GB_SVG.replace('viewBox="0 0 1600 900"', `viewBox="${vb}" class="${cls}"`);
const gbSvgUrl = vb => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(vb ? gbSvg(vb) : GB_SVG);
const gbArt = () => MEDIA.get('gboss:art') || gbSvgUrl();   // a picture URL (for <img>)
const gbIconSrc = () => MEDIA.get('gboss:icon') || (MEDIA.get('gboss:art') ? null : gbSvgUrl('560 130 380 380'));
/* the round portrait: the uploaded icon, else the uploaded art cut round the middle, else the drawn head */
const gbIcon = (cls = '') => { const i = gbIconSrc(); return i ? `<img src="${i}" alt="" class="gb-ic ${cls}">` : `<img src="${MEDIA.get('gboss:art')}" alt="" class="gb-ic art ${cls}">`; };
BTH_ART.gboss = gbSvg('540 0 520 900', 'bth-svg gb-scene');

/* ---- the fight's state (player save, under the guild) ---- */
function gbState() {
  const st = guildState(), k = gbKey();
  if (!st.boss || st.boss.key !== k) { const old = st.boss; st.boss = { key: k, tries: 0, fights: [], mailed: [] }; if (old && old.key != null) gbMailLeft(old); }
  if (!st.boss.mailed) st.boss.mailed = [];
  return st.boss;
}
/* the practice members' battles in this fight, seeded (the same for everyone) */
function gbMateHits(g, k) {
  const out = [], t0 = GB_EPOCH + k * GB_MS;
  for (const m of g.members) {
    if (m.me) continue;
    const r = seeded(`gb:${g.id}:${k}:${m.name}`), sk = Math.min(1, (m.total || 0) / 240000), x = r(), n = x < .8 ? 2 : x < .9 ? 1 : 0;
    for (let i = 0; i < n; i++) { const t = t0 + (.03 + r() * .94) * GB_MS; if (m.joinedAt && t < m.joinedAt) continue; out.push({ t, d: Math.round(8 + r() * 36 + sk * 14), name: m.name }); }
  }
  return out;
}
/* the bar now: walks every battle (the practice members' and yours) in time order: level, HP left, damage by name, kills */
function gbBoard(g = myGuild(), now = Date.now(), B = gbState()) {
  if (!g) return null;
  const mine = B.fights.filter(f => f.gid === g.id).map(f => ({ t: f.t, d: f.d, name: S.player.name, me: true }));
  const ev = [...gbMateHits(g, B.key), ...mine].filter(e => e.t <= now && e.d > 0).sort((a, b) => a.t - b.t);
  const n = g.members.length;   // the HP grows with the guild (you included)
  let lv = 1, hp = gbLvHp(1, n), hitThis = false; const dmg = {}, kills = [];
  for (const e of ev) {
    const d = Math.min(e.d, hp); hp -= d; dmg[e.name] = (dmg[e.name] || 0) + d; if (e.me) hitThis = true;
    if (hp <= 0) { kills.push({ lv, t: e.t, by: e.name, last: !!e.me, helped: hitThis }); lv++; hp = gbLvHp(lv, n); hitThis = false; }
  }
  return { g, n, lv, hp, max: gbLvHp(lv, n), dmg, kills, ends: gbEnds(B.key), key: B.key };
}
const gbLeft = () => Math.max(0, GB_TRIES - gbState().tries);
const gbReady = () => inGuild() && gbLeft() > 0;
/* every dragon the guild defeats: each member (you too, whether you fought it or not) gets GB_KILL by mail, once per
   dragon (B.mailed = '<guild id>:<level>' keys). Checked whenever the home screen, the Battle card, the guild screen or the boss
   screen draws, and for the fight that just ended when a new one starts (gbMailLeft). */
let gbMailing = false;
function gbMailKills(bd, B = gbState()) {
  if (gbMailing || !bd) return;
  const id = k => bd.g.id + ':' + k.lv, since = (S.guild && S.guild.joined) || 0;   // only dragons that fell while you were in this guild
  const L = bd.kills.filter(k => k.t >= since && !B.mailed.includes(id(k))); if (!L.length) return;
  gbMailing = true;
  try {
    const mails = L.map(k => { B.mailed.push(id(k)); return { id: `gboss-${B.key}-${bd.g.id}-${k.lv}`, date: dayKey(), from: bd.g.name, title: `${gbName()} defeated!`, body: `Your guild brought down the level ${k.lv} ${gbName()}${k.last ? ', and you struck the final blow' : ` (final blow: ${k.by})`}. Every member of ${bd.g.name} gets this reward.`, reward: { ...GB_KILL } }; });
    mailAdd(mails); persist(); renderMenu();
  } finally { gbMailing = false; }
}
const gbCheckKills = () => { if (!gbMailing && inGuild()) gbMailKills(gbBoard()); };
function gbMailLeft(old) {
  const g = myGuild(); if (!g) return;
  if (!old.mailed) old.mailed = (old.got || []).map(lv => g.id + ':' + lv);   // older saves claimed kill rewards on the boss screen
  gbMailKills(gbBoard(g, gbEnds(old.key) - 1, old), old);
}

/* ---- a battle ---- */
function gbStart() {
  if (!inGuild()) return toast('Join a guild first', true);
  const bd = gbBoard(); if (gbLeft() <= 0) return toast('No battles left in this fight', true);
  const d = ccCampMyDeck(); if (!ccValidateDeck(d.cards).ok) return toast('Build a 30-card deck first', true);
  closeGuildBoss(false);
  startClash({ id: d.id, name: d.name, cards: d.cards.slice() }, (Math.random() * 4294967296) >>> 0, null, { lv: bd.lv, hp0: bd.hp, max: bd.max, gid: bd.g.id });
}
const gbMatch = (deck, seed, names, bs) => ccCreateMatch(seed, deck.cards.slice(), CC_TOWER_DECKS.spire.slice(), names, { ev: null, first: 0, hp: [CC_CFG.hp, bs.hp0], rounds: GB_ROUNDS, hitX: [1, GB_HITX], limitText: `Round ${GB_ROUNDS} ended: the ${gbName()} flies off` });
/* the boss's move: follows its plan for the turn while it stays right, else plans again (without freezing the page) */
async function gbBossPick(G) {
  const m = ccM;
  if (!m.bossPlan || !m.bossPlan.length || !ccAutoStill(G, m.bossPlan[0])) {
    const plan = await ccAutoPlanAsync(G, GB_AI, () => ccM === m);
    if (ccM !== m) return null;
    m.bossPlan = plan && plan.length && ccAutoStill(G, plan[0]) ? plan : null;
  }
  if (!m.bossPlan) return ccBotPick(G);
  const { pre, ...a } = m.bossPlan.shift(); return a;
}
/* the end of a battle (or leaving it): damage, rewards, the battle used up */
function gbFinish(G) {
  const bs = ccM.boss, B = gbState(), d = Math.max(0, bs.hp0 - Math.max(0, G.players[1].hp));
  if (B.key === gbKey()) B.tries++;
  B.fights.push({ t: Date.now(), d, gid: bs.gid, lv: bs.lv });
  const T = gbTier(d), out = { d, gold: T[3], wishes: T[4], stam: gbStam(d), gear: [], full: false, kill: G.players[1].hp <= 0, lv: bs.lv };
  S.wallet.coins = (S.wallet.coins || 0) + out.gold; S.wallet.wishes = (S.wallet.wishes || 0) + out.wishes; out.stamGot = giveStamina(out.stam);
  for (let i = 0; i < T[1]; i++) { if (wardFree() < 1) { out.full = true; break; } const x = gbGear(T[2]); if (x) out.gear.push(x); }
  persist(); return out;
}
function gbGear(urP) {
  const d = rpick(raidGear()), ur = Math.random() < urP, L = dungeonPieces(d, ur ? 5 : 4).length ? dungeonPieces(d, ur ? 5 : 4) : raidPieces(ur ? 5 : 4);
  if (!L.length) return null;
  const x = rpick(L), st = ur && Math.random() < GB_STAR2 ? 2 : hasClothStars(x) ? 1 : 0, isNew = !owns(x.id);
  addCloth(x.id, st === 2 ? 2 : 1); return { x, isNew, st };
}
function gbEndHTML(r) {
  if (!r) return '';
  return `<div class="gbe-end"><div class="gbe-dmg"><small>Damage to the ${esc(gbName())}</small><b>${r.d}</b>${r.kill ? `<em>${icon('crown')}You struck the final blow!</em>` : ''}</div>
    <div class="ccm-rews">
      <span class="ccm-rw">${curIcon('coins')}<b>+${fmt(r.gold)}</b><small>gold</small></span>
      ${r.wishes ? `<span class="ccm-rw">${curIcon('wishes')}<b>+${r.wishes}</b><small>Standard ticket${r.wishes > 1 ? 's' : ''}</small></span>` : ''}
      <span class="ccm-rw">${curIcon('stamina')}<b>+${r.stamGot}</b><small>stamina${r.stamGot < r.stam ? ' (999 cap)' : ''}</small></span>
      ${r.gear.map(g => `<span class="ccm-rw gear r${g.x.rarity}" title="${esc(g.x.name)}"><span class="ccm-rw-pic"><img src="${clothImg(g.x)}" alt="">${g.isNew ? '<i class="ccm-rw-new">NEW</i>' : ''}</span><span class="ccm-rw-txt">${ctag(g.x.rarity)}<b>${esc(g.x.name)}</b>${g.st ? clothStarRow(g.st) : ''}</span></span>`).join('')}
      ${r.full ? '<span class="ccm-rw none"><small>Wardrobe full: some gear was lost</small></span>' : !r.d ? '<span class="ccm-rw none"><small>Deal damage to earn gear</small></span>' : ''}
    </div><p class="tiny">${gbLeft() ? `${gbLeft()} battle${gbLeft() === 1 ? '' : 's'} left in this fight.` : 'No battles left in this fight.'}</p></div>`;
}
function gbEndBtns() {
  return `<div class="ccm-endb">${gbLeft() ? `<button class="btn gold" id="gbAgain">${icon('swords')}Fight again</button>` : ''}<button class="btn ${gbLeft() ? 'ghost' : 'gold'}" id="gbBack">${icon('dragon')}Guild Boss</button></div>`;
}
/* after leaving a battle early: its rewards in a popup over the boss screen */
function gbRewardsPop(r) {
  if (!r) return;
  const old = document.querySelector('.rdrop.gbpop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop gbpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Battle rewards');
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">Battle rewards</h2>${gbEndHTML(r)}<div class="row" style="justify-content:center"><button class="btn gold" data-gbok>Great!</button></div></div>`;
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-gbok]')) el.remove(); });
  document.body.appendChild(el);
}
/* the boss's card next to its plaque in a battle (same frame as a leader card) */
const gbCardHTML = () => `<div class="pf-slot ccl-card r5 gb-card"><img src="${gbArt()}" alt="" style="${artPosStyle('gboss:art') || 'object-position:44% 30%'}"><span class="pf-sl"><b>${esc(gbName())}</b><small>Level ${ccM && ccM.boss ? ccM.boss.lv : 1}</small></span></div>`;

/* ---- the boss screen ---- */
let gbEl = null, gbBackBattle = false;
function openGuildBoss() {
  closeModal(); gbState();
  if (!gbEl) { gbEl = document.createElement('div'); gbEl.className = 'gbs'; gbEl.setAttribute('role', 'dialog'); gbEl.setAttribute('aria-label', 'Guild boss'); document.body.appendChild(gbEl); }
  renderGB();
}
/* closing: back to the guild screen if it is open under it, else to Battle / home */
function closeGuildBoss(home = true) { if (gbEl) { gbEl.remove(); gbEl = null; } if (home) { if (fmEl) renderFarm(); else bthHome(); } }
/* the boss screen's right panel (the owner liked the left side and asked for the right one to be more organised, nicer
   and see-through): a glass card with your three numbers (battles left, damage, guild rank), the kill notice, a card
   with your deck and the Fight! button and its rules, then three glass tabs: Rewards (one row per damage tier with its
   items as chips, your last tier lit), Guild ranking (medals for the top 3, a damage bar per member, you pinned) and
   Your battles (this fight's battles with their damage and tier) */
let gbTab = 'rew';
const gbAgo = t => { const m = Math.max(0, Math.round((Date.now() - t) / 6e4)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
function gbPanelHTML(g, B, bd, left, you, myPos, mailedN, deck, ok, rank, mate) {
  const le = ccLeaderOf(deck.id), mine = B.fights.filter(f => f.gid === g.id), last = mine.length ? gbTier(mine[mine.length - 1].d) : null;
  const tierRange = i => { const t = GB_TIERS[i], nx = GB_TIERS[i + 1]; return nx ? (nx[0] - 1 > t[0] ? `${t[0]}–${nx[0] - 1}` : `${t[0]}`) : `${t[0]}+`; };
  const stamRange = i => { const t = GB_TIERS[i], nx = GB_TIERS[i + 1], a = gbStam(t[0]), b = nx ? gbStam(nx[0] - 1) : GB_STAM_MAXV; return a === b ? `${a}` : `${a}–${b}`; };
  let pane = '';
  if (gbTab === 'rank') {
    const top = rank.length ? rank[0][1] : 1;
    const row = ([n, d], i) => { const m = mate(n), me = n === S.player.name;
      return `<div class="gbp-rr ${me ? 'me' : ''} ${i < 3 ? 'r' + (i + 1) : ''}"><span class="gbp-rk">${i < 3 ? icon('crown') : ''}<b>${i + 1}</b></span>${me ? `<span class="gd-av me">${avatarHTML(30)}</span>` : `<span class="gd-av" style="--h:${m.hue || 200}">${esc(n[0])}</span>`}
        <span class="gbp-rn"><b>${esc(n)}${me ? ' <small>(you)</small>' : ''}</b><i class="gbp-rbar"><i style="width:${Math.max(3, d / Math.max(1, top) * 100).toFixed(1)}%"></i></i></span><em>${fmt(d)}</em></div>`; };
    const shown = rank.slice(0, 30);
    pane = rank.length ? `<div class="gbp-rank">${shown.map(row).join('')}</div>${myPos >= 30 ? `<div class="gbp-rank pin">${row(rank[myPos], myPos)}</div>` : ''}
      <p class="gbp-note">${rank.length} member${rank.length === 1 ? '' : 's'} hit the dragon this fight · ${fmt(rank.reduce((a, r) => a + r[1], 0))} damage in all</p>`
      : `<p class="gbp-empty">${icon('swords')}Nobody has fought yet this fight.</p>`;
  } else if (gbTab === 'log') {
    pane = mine.length ? `<div class="gbp-log">${mine.map((f, i) => { const t = gbTier(f.d); return `<div class="gbp-lr"><span class="gbp-ln"><b>${i + 1}</b></span><span class="gbp-lt"><b>Battle ${i + 1}</b><small>Level ${f.lv} dragon · ${gbAgo(f.t)}</small></span><span class="gbp-ld"><b>${fmt(f.d)}</b><small>damage</small></span><span class="gbp-lw">${curIcon('coins')}${fmt(t[3])}</span></div>`; }).join('')}</div>
      <p class="gbp-note">${mine.reduce((a, f) => a + f.d, 0)} damage from you this fight · ${left} battle${left === 1 ? '' : 's'} left</p>`
      : `<p class="gbp-empty">${icon('swords')}No battles yet this fight. You get ${GB_TRIES} every 48 hours.</p>`;
  } else {
    const cell = (v, cls = '') => `<span class="gbp-c ${cls}">${v}</span>`;
    pane = `<div class="gbp-tiers"><div class="gbp-th"><span>Damage</span><span>${icon('hanger')}Gear</span><span>${curIcon('coins')}Gold</span><span>${curIcon('wishes')}</span><span>${curIcon('stamina')}</span></div>
      ${GB_TIERS.map((t, i) => `<div class="gbp-tier ${last === t ? 'on' : ''}"><span class="gbp-dmg"><b>${tierRange(i)}</b></span>
        ${cell(t[1] ? `<b>${t[1]}×</b><small>${Math.round(t[2] * 100)}% UR</small>` : '<i>—</i>', 'gear')}${cell(`<b>${fmt(t[3])}</b>`)}${cell(t[4] ? `<b>${t[4]}</b>` : '<i>—</i>')}${cell(`<b>${stamRange(i)}</b>`)}${last === t ? '<em class="gbp-last">Your last</em>' : ''}</div>`).join('')}</div>
      <div class="gbp-kill">${icon('crown')}<span><b>Every dragon your guild defeats</b><small>${curIcon('pearls')}${GB_KILL.pearls} pearls + ${curIcon('stamina')}${GB_KILL.stamina} stamina for every member, by mail</small></span></div>
      <p class="gbp-note">Every battle pays by the damage it deals (after the ×${GB_HITX}). Gear is ${ctag(4)} or ${ctag(5)} only, 5% of UR pieces are 2★.</p>`;
  }
  const tab = (id, ic, nm, n) => `<button class="gbp-tab ${gbTab === id ? 'on' : ''}" data-gbt="${id}" role="tab" aria-selected="${gbTab === id}">${icon(ic)}<span>${nm}</span>${n != null ? `<em>${n}</em>` : ''}</button>`;
  return `<div class="gbp-card gbp-stats">
      <div class="gbp-st"><small>Battles left</small><span class="gbs-pips">${Array.from({ length: GB_TRIES }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span><b>${left} / ${GB_TRIES}</b></div>
      <div class="gbp-st"><small>Your damage</small><b class="hot">${fmt(you)}</b></div>
      <div class="gbp-st"><small>Guild rank</small><b>${myPos >= 0 ? '#' + (myPos + 1) : '—'}</b></div></div>
    ${mailedN ? `<button class="gbs-killed" id="gbMail">${icon('crown')}<span><b>Dragon defeated${mailedN > 1 ? ` ×${mailedN}` : ''}!</b><small>${curIcon('pearls')}${GB_KILL.pearls * mailedN} + ${curIcon('stamina')}${GB_KILL.stamina * mailedN} sent to your mail</small></span>${icon('mail')}</button>` : ''}
    <div class="gbp-card gbp-fight">
      <div class="gbs-deck"><span class="gbp-lead">${le ? baseThumb(le) : CC_IC}</span><span class="gbp-dk"><small>Your deck</small><b>${esc(deck.name)}</b></span><small class="gbp-ok ${ok ? '' : 'bad'}">${ok ? 'Ready' : `${deck.cards.length}/30`}</small><button class="btn ghost sm" id="gbDeck">Change</button></div>
      <button class="smx-go ten gbs-go" id="gbFight" ${left && ok ? '' : 'disabled'}><b>${left ? 'Fight!' : 'No battles left'}</b><small>${left ? `Dragon HP ${fmt(bd.hp)} · level ${bd.lv}` : `New fight in ${fmtDur2(gbEnds(B.key) - Date.now())}`}</small></button>
      <div class="gbp-rules"><span>${icon('clock')}${GB_ROUNDS} rounds</span><span>${icon('swords')}Every hit ×${GB_HITX}</span><span>${icon('user')}You go first</span></div></div>
    <nav class="gbp-tabs" role="tablist">${tab('rew', 'gift', 'Rewards')}${tab('rank', 'trophy', 'Ranking', rank.length || null)}${tab('log', 'clock', 'Your battles', mine.length || null)}</nav>
    <div class="gbp-card gbp-pane" role="tabpanel">${pane}</div>`;
}
function renderGB() {
  if (!gbEl) return;
  const g = myGuild(), B = gbState(), bd = g && gbBoard(g); if (bd) gbMailKills(bd, B);
  const art = MEDIA.get('gboss:art') ? `<img src="${MEDIA.get('gboss:art')}" alt="" style="${artPosStyle('gboss:art')}">` : gbSvg('0 0 1600 900', 'gb-svg');
  const head = `<header class="gbs-head"><button class="smx-back" id="gbClose2" aria-label="Back">${icon('back')}</button>
      <div class="inv-title"><span class="inv-badge">${icon('dragon')}</span><h2 class="ts">Guild Boss</h2></div>${infoBtn('gboss', 'How the guild boss works')}
      ${g ? `<span class="gbs-guild">${guildIcon(g.icon, 30)}<b>${esc(g.name)}</b></span>` : ''}<span class="smx-sp"></span>
      <span class="gbs-time">${icon('clock')}Ends in ${fmtDur2(gbEnds(B.key) - Date.now())}</span>
      <button class="inv-x" id="gbClose" aria-label="Close">${icon('close')}</button></header>`;
  if (!g) {
    gbEl.innerHTML = `<div class="gbs-bg" aria-hidden="true">${art}<i></i></div>${head}
      <div class="gbs-join"><h1>${esc(gbName())}</h1><p>The guild boss is fought by a whole guild together. Join or create a guild to take part.</p><button class="btn gold" id="gbGuild">${icon('guild')}Find a guild</button></div>`;
  } else {
    const mailedN = B.mailed.filter(x => x.startsWith(g.id + ':')).length;
    const left = gbLeft(), you = bd.dmg[S.player.name] || 0, deck = ccCampMyDeck(), ok = ccValidateDeck(deck.cards).ok;
    const rank = Object.entries(bd.dmg).sort((a, b) => b[1] - a[1]), myPos = rank.findIndex(([n]) => n === S.player.name);
    const mate = n => g.members.find(m => m.name === n) || {};
    gbEl.innerHTML = `<div class="gbs-bg" aria-hidden="true">${art}<i></i></div>${head}
      <div class="gbs-body">
        <section class="gbs-boss">
          <small class="gbs-lv">Level ${bd.lv}${bd.kills.length ? ` · defeated ${bd.kills.length} time${bd.kills.length === 1 ? '' : 's'} this fight` : ''}<span class="gbs-tm2"> · ends in ${fmtDur2(gbEnds(B.key) - Date.now())}</span></small>
          <h1 class="gbs-name">${esc(gbName())}</h1>
          <div class="gbs-hp"><span class="gbs-hpbar"><i style="width:${bd.hp / bd.max * 100}%"></i><em></em></span><b>${fmt(bd.hp)} <small>/ ${fmt(bd.max)} HP</small></b></div>
          <p class="gbs-sub">Your whole guild fights the same dragon: every battle's damage comes off this bar. Its HP grows with the guild (${bd.n} member${bd.n === 1 ? '' : 's'}: ${fmt(gbBaseHp(bd.n))} HP). Bring it down and <b>every member gets ${curIcon('pearls')}${GB_KILL.pearls} pearls + ${curIcon('stamina')}${GB_KILL.stamina} stamina</b> by mail; a stronger one (+${GB_LV_UP * 100}% HP) then takes its place.</p>
        </section>
        <aside class="gbs-panel gbp">${gbPanelHTML(g, B, bd, left, you, myPos, mailedN, deck, ok, rank, mate)}
        </aside>
      </div>`;
  }
  const q = s => gbEl.querySelector(s), on = (s, f) => { const b = q(s); if (b) b.onclick = f; };
  on('#gbClose', () => closeGuildBoss()); on('#gbClose2', () => closeGuildBoss());
  on('#gbGuild', () => { closeGuildBoss(false); openFarm('guild'); });
  on('#gbFight', gbStart);
  on('#gbMail', () => openMail());
  on('#gbDeck', () => ccDeckPicker(renderGB));
  gbEl.querySelectorAll('[data-gbt]').forEach(t => t.onclick = () => { gbTab = t.dataset.gbt; renderGB(); });
}
/* pick the deck you fight with (sets your selected deck) */
function ccDeckPicker(back) {
  const sv = ccSave(), cur = ccCampMyDeck();
  openModal({ title: 'Your deck', ic: 'cards', kind: 'ccqm', body: `<div class="ccq"><p class="ccq-intro">Pick a ready deck (30 cards):</p>
    <div class="ccq-decks">${ccAllDecks().map(d => { const v = ccValidateDeck(d.cards).ok; return `<button class="ccq-dk ${d.id === cur.id ? 'on' : ''}" data-cdeck="${d.id}" ${v ? '' : 'disabled'}><span>${d.preset ? icon('lock') : CC_IC}</span><b>${esc(d.name)}</b><small>${v ? 'Ready' : `${d.cards.length}/30`}</small></button>`; }).join('')}</div></div>`,
    onMount: b => b.querySelectorAll('[data-cdeck]').forEach(x => x.onclick = () => { sv.sel = x.dataset.cdeck; persist(); closeModal(); back(); }) });
}
INFO.gboss = () => ({ title: 'Guild Boss', body: `<p class="desc">A dragon your whole guild fights in Card Battle.</p>
  <ul class="info-list"><li>A fight lasts <b>48 hours</b>. You get <b>${GB_TRIES} battles</b> in each fight.</li>
  <li>The dragon's HP is shared by the guild: everyone's damage comes off the same bar. It grows with the guild, from <b>${fmt(GB_HP)} HP</b> with 1 member to <b>${fmt(GB_HP_MAX)} HP</b> with ${GB_HP_N}. When it falls, a stronger one (+${GB_LV_UP * 100}% HP) takes its place.</li>
  <li>A battle is played with your own deck against the dragon's deck. You go first; it ends after <b>round ${GB_ROUNDS}</b>, when your hero falls or when the dragon falls. The dragon is a very strong player, but it is huge: <b>every hit on it deals triple damage</b>.</li>
  <li>After every battle you get rewards by the damage you dealt: SSR or UR gear (never R), gold, Standard tickets and 5 to 50 stamina.</li>
  <li>Every time your guild defeats the dragon, <b>every member gets ${GB_KILL.pearls} pearls and ${GB_KILL.stamina} stamina by mail</b>.</li></ul>` });

/* admin → Battle screen → Guild boss: its name, its art (16:9, framable) and its round icon */
function gbAdminHTML() {
  const a = MEDIA.get('gboss:art'), i = MEDIA.get('gboss:icon');
  return `<div><h3>Guild boss</h3><p class="tiny">The dragon your players fight with their guild (2 battles every 48 hours, ${fmt(GB_HP)}–${fmt(GB_HP_MAX)} HP shared by the guild, growing with its members; each kill mails ${GB_KILL.pearls} pearls + ${GB_KILL.stamina} stamina to every member). Its card on the Battle screen uses the Guild Boss wallpaper above.</p></div>
    <div class="gb-ad">
      <label class="gb-adname"><span class="lbl-sm">Name</span><input class="input" id="gbAdName" maxlength="28" value="${esc((S.gboss && S.gboss.name) || '')}" placeholder="Elder Dragon"></label>
      <div class="gb-adit"><span class="gb-adpic wide">${a ? `<img src="${a}" alt="" style="${artPosStyle('gboss:art')}">` : gbSvg('0 0 1600 900')}</span><b>Boss art</b><small>16:9, 1920×1080 best: the boss screen, the battle intro and its card. ${a ? 'Your picture' : 'Drawn default'}</small>
        <span class="row" style="gap:6px;justify-content:center"><label class="btn mint sm">${icon('upload')}${a ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="gbAdArt"></label>${a ? '<button class="btn ghost sm" id="gbAdArtDel">Default</button>' : ''}</span>${artFrameBtn('gboss:art', 'screen', 'Guild boss art')}</div>
      <div class="gb-adit"><span class="gb-adpic round">${gbIcon()}</span><b>Boss icon</b><small>Square: the round portrait on its plaque and the coin flip. Without one it is cut from the art.</small>
        <span class="row" style="gap:6px;justify-content:center"><label class="btn mint sm">${icon('upload')}${i ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="gbAdIc"></label>${i ? '<button class="btn ghost sm" id="gbAdIcDel">Default</button>' : ''}</span></div>
    </div>
    <div class="row"><button class="btn ghost sm" id="gbAdOpen">${icon('dragon')}Open the guild boss</button></div>`;
}
function gbAdminBind(p, redo) {
  const on = (s, ev, f) => { const b = p.querySelector(s); if (b) b[ev] = f; };
  on('#gbAdName', 'onchange', e => { S.gboss = { ...(S.gboss || {}), name: e.target.value.trim().slice(0, 28) }; persist(); toast('Boss name saved.'); if (gbEl) renderGB(); });
  on('#gbAdArt', 'onchange', async e => { try { if (await mediaSet('gboss:art', await resizeImage(e.target.files[0], 1920, 'image/jpeg'))) { redo(); toast('Boss art saved.'); } } catch (x) { toast(x.message, true); } });
  on('#gbAdIc', 'onchange', async e => { try { if (await mediaSet('gboss:icon', await resizeImage(e.target.files[0], 256))) { redo(); toast('Boss icon saved.'); } } catch (x) { toast(x.message, true); } });
  on('#gbAdArtDel', 'onclick', async () => { await mediaDel('gboss:art'); redo(); toast('Boss art back to the drawn dragon.'); });
  on('#gbAdIcDel', 'onclick', async () => { await mediaDel('gboss:icon'); redo(); toast('Boss icon removed.'); });
  on('#gbAdOpen', 'onclick', () => { closeModal(); openGuildBoss(); });
}
