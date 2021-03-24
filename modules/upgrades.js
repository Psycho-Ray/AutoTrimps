//Helium
var upgradeList = ['Miners', 'Scientists', 'Coordination', 'Speedminer', 'Speedlumber', 'Speedfarming', 'Speedscience', 'Speedexplorer', 'Megaminer', 'Megalumber', 'Megafarming', 'Megascience', 'Efficiency', 'TrainTacular', 'Trainers', 'Explorers', 'Blockmaster', 'Battle', 'Bloodlust', 'Bounty', 'Egg', 'Anger', 'Formations', 'Dominance', 'Barrier', 'UberHut', 'UberHouse', 'UberMansion', 'UberHotel', 'UberResort', 'Trapstorm', 'Gigastation', 'Shieldblock', 'Potency', 'Magmamancers'];

//Psycho Ray - Auto Giga Base and Delta
MODULES["upgrades"] = {};
MODULES["upgrades"].autoGigas = true;
MODULES["upgrades"].customTargetZone = undefined;
MODULES["upgrades"].customMetalRatio = undefined;

//2 or less = very fast run, around 5 = most regular runs, 10 = pushy, 11+ (usually 20) = really, really pushing, 100 = ...you know you're using Auto Trimps, right?
MODULES["upgrades"].customSlowDownFactor = 5;
MODULES["upgrades"].delayFirstGiga = MODULES["upgrades"].customSlowDownFactor > 10;

function gigaTargetZone() {
    //Init
    var targetZone = 59;
    var daily = game.global.challengeActive == 'Daily';
    var runningC2 = game.global.runningChallengeSquared;
    var heliumChallengeActive = game.global.challengeActive && game.challenges[game.global.challengeActive].heliumThrough;
    
    //Try setting target zone to the zone we finish our current challenge or do our void maps
    var voidZone = (daily) ? getPageSetting('DailyVoidMod') : getPageSetting('VoidMaps');
    var challengeZone = (heliumChallengeActive) ? game.challenges[game.global.challengeActive].heliumThrough : 0;
    
    //Also consider the zone we configured our portal to be used
    var portalZone = 0;
    if (autoTrimpSettings.AutoPortal.selected == "Helium Per Hour") portalZone = (daily) ? getPageSetting('dHeHrDontPortalBefore') : getPageSetting('HeHrDontPortalBefore');
    else if (autoTrimpSettings.AutoPortal.selected == "Custom") portalZone = (daily) ? getPageSetting('dCustomAutoPortal') : getPageSetting('CustomAutoPortal');
    
    //Finds a target zone for when doing c2
    var c2zone = 0;
    if (getPageSetting('c2runnerstart') == true && getPageSetting("c2runnerportal") > 0) c2zone = getPageSetting("c2runnerportal");
    else if (getPageSetting("FinishC2") > 0) c2zone = getPageSetting("FinishC2");
    
    //Set targetZone
    if (!runningC2) targetZone = Math.max(targetZone, voidZone, challengeZone, portalZone-1);
    else targetZone = Math.max(targetZone, c2zone-1);
    
    //Failsafe
    if (targetZone < 60) {
	targetZone = Math.max(65, game.global.highestLevelCleared);
        debug("Auto Gigastation: Warning! Unable to find a proper targetZone. Using your HZE instead", "general", "*rocket");
    }
    
    return targetZone;
}

function autoGiga(targetZone, metalRatio = 0.5, slowDown = 10, customBase) {
    //Pre Init
    if (!targetZone || targetZone < 60) targetZone = gigaTargetZone();
    
    //Init
    var base = (customBase) ? customBase : getPageSetting('FirstGigastation');
    var baseZone = game.global.world;
    var rawPop = game.resources.trimps.max - game.unlocks.impCount.TauntimpAdded;
    var gemsPS = getPerSecBeforeManual("Dragimp");
    var metalPS = getPerSecBeforeManual("Miner");
    var megabook = (game.global.frugalDone) ? 1.6 : 1.5;
    
    //Calculus
    var nGigas = Math.min(Math.floor(targetZone-60), Math.floor(targetZone/2 - 25), Math.floor(targetZone/3 - 12), Math.floor(targetZone/5), Math.floor(targetZone/10 + 17), 39);
    var metalDiff = Math.max(0.1 * metalRatio * metalPS / gemsPS, 1);

    var delta = 3;
    for (var i=0; i<10; i++) {
        //Population guess
        var pop = 6 * Math.pow(1.2, nGigas)*10000;
        pop *= base * (1 - Math.pow(5/6, nGigas+1)) + delta*(nGigas+1 - 5*(1 - Math.pow(5/6, nGigas+1)));
        pop += rawPop - base*10000;
        pop /= rawPop;
        
        //Delta
        delta = Math.pow(megabook, targetZone - baseZone);
        delta *= metalDiff * slowDown * pop;
        delta /= Math.pow(1.75, nGigas);
        delta = Math.log(delta);
        delta /= Math.log(1.4);
        delta /= nGigas;
    }
    
    //Returns a number in the x.yy format, and as a number, not a string
    return +(Math.round(delta + "e+2")  + "e-2");
}

function firstGiga(forced) {
    //Build our first giga if: A) Has more than 2 Warps & B) Can't afford more Coords & C)* Lacking Health or Damage & D)* Has run at least 1 map or if forced to
    var s = !MODULES["upgrades"].delayFirstGiga;
    var a = game.buildings.Warpstation.owned >= 2;
    var b = game.upgrades.Coordination.allowed > game.upgrades.Coordination.done;
    var c = s || !enoughHealth || !enoughDamage;
    var d = s || game.global.mapBonus >= 2 || game.global.mapBonus >= getPageSetting('MaxMapBonuslimit') || game.global.mapBonus >= getPageSetting('MaxMapBonushealth');
    if (!forced && !(a && b && c && d)) return false;
    
    //Define Base and Delta for this run
    var base = game.buildings.Warpstation.owned;
    var deltaZ = (MODULES["upgrades"].customTargetZone     >= 60) ? MODULES["upgrades"].customTargetZone     : undefined;
    var deltaM = (MODULES["upgrades"].customMetalRatio     >   0) ? MODULES["upgrades"].customMetalRatio     : undefined;
    var deltaS = (MODULES["upgrades"].customSlowDownFactor >   1) ? MODULES["upgrades"].customSlowDownFactor : undefined;
    var delta = autoGiga(deltaZ, deltaM, deltaS);
    
    //Save settings
    setPageSetting('FirstGigastation', base);
    setPageSetting('DeltaGigastation', delta);
    
    //Log
    debug("Auto Gigastation: Setting pattern to " + base + "+" + delta, "general", "*rocket");
    
    return true;
}

function buyUpgrades() {
    //For every upgrade available...
    for (var upgrade in upgradeList) {
        upgrade = upgradeList[upgrade];
        var gameUpgrade = game.upgrades[upgrade];
        var available = (gameUpgrade.allowed > gameUpgrade.done && canAffordTwoLevel(gameUpgrade));
        var fuckbuildinggiga = (bwRewardUnlocked("AutoStructure") == true && game.talents.deciBuild.purchased && getPageSetting('hidebuildings')==true && getPageSetting('BuyBuildingsNew')==0);
        
        //Can't buy it, ignore it
        if (!available) continue;
        
        //Coord & Amals
        if (upgrade == 'Coordination' && (getPageSetting('BuyUpgradesNew') == 2 || !canAffordCoordinationTrimps())) continue;
        if (upgrade == 'Coordination' && getPageSetting('amalcoord')==true && getPageSetting('amalcoordhd') > 0 && calcHDratio() < getPageSetting('amalcoordhd') && ((getPageSetting('amalcoordt') < 0 && (game.global.world < getPageSetting('amalcoordz') || getPageSetting('amalcoordz') < 0)) || (getPageSetting('amalcoordt') > 0 && getPageSetting('amalcoordt') > game.jobs.Amalgamator.owned && (game.resources.trimps.realMax() / game.resources.trimps.getCurrentSend()) > 2000))) continue;
        
        //WS
        if (upgrade == 'Coordination' && getEmpowerment() == "Wind" && 
            ((getPageSetting('AutoStance') == 3 && game.global.challengeActive != "Daily" && getPageSetting('WindStackingMin') > 0 && game.global.world >= getPageSetting('WindStackingMin') && calcHDratio() < 5) || 
                (getPageSetting('use3daily') == true && game.global.challengeActive == "Daily" && getPageSetting('dWindStackingMin') > 0 && game.global.world >= getPageSetting('dWindStackingMin') && calcHDratio() < 5)))
                    continue;
        
        if (upgrade == 'Coordination' && 
            ((getPageSetting('AutoStance') == 3 && game.global.challengeActive != "Daily" && getPageSetting('wsmax') > 0 && getPageSetting('wsmaxhd') > 0 && game.global.world >= getPageSetting('wsmax') && calcHDratio() < getPageSetting('wsmaxhd')) || 
                (getPageSetting('use3daily') == true && game.global.challengeActive == "Daily" && getPageSetting('dwsmax') > 0 && getPageSetting('dwsmaxhd') > 0 && game.global.world >= getPageSetting('dwsmax') && calcHDratio() < getPageSetting('dwsmaxhd'))))
                    continue;
        
        //Gigastations
        if (upgrade == 'Gigastation' && !fuckbuildinggiga) {
            if (MODULES.upgrades.autoGigas && game.upgrades.Gigastation.done == 0) {
		if (!firstGiga()) continue;
	    }
            else if (game.buildings.Warpstation.owned < (Math.floor(game.upgrades.Gigastation.done * getPageSetting('DeltaGigastation')) + getPageSetting('FirstGigastation'))) continue;
        }
          
        //Other
        if (upgrade == 'Shieldblock' && !getPageSetting('BuyShieldblock')) continue;
        if (upgrade == 'Bloodlust' && game.global.challengeActive == 'Scientist' && getPageSetting('BetterAutoFight')) continue;
        
        if (game.upgrades.Scientists.done < game.upgrades.Scientists.allowed && upgrade != 'Scientists') continue;
        buyUpgrade(upgrade, true, true);
        debug('Upgraded ' + upgrade, "upgrades", "*upload2");
    }
}

//Radon

var RupgradeList = ['Miners', 'Scientists', 'Coordination', 'Speedminer', 'Speedlumber', 'Speedfarming', 'Speedscience', 'Speedexplorer', 'Megaminer', 'Megalumber', 'Megafarming', 'Megascience', 'Efficiency', 'Explorers', 'Battle', 'Bloodlust', 'Bounty', 'Egg', 'Rage', 'Prismatic', 'Prismalicious', 'Formations', 'Dominance', 'UberHut', 'UberHouse', 'UberMansion', 'UberHotel', 'UberResort', 'Trapstorm', 'Potency'];

function RbuyUpgrades() {

    for (var upgrade in RupgradeList) {
        upgrade = RupgradeList[upgrade];
        var gameUpgrade = game.upgrades[upgrade];
        var available = (gameUpgrade.allowed > gameUpgrade.done && canAffordTwoLevel(gameUpgrade));
			
        //Coord
	if (upgrade == 'Coordination' && (getPageSetting('RBuyUpgradesNew') == 2 || !canAffordCoordinationTrimps())) continue;

        //Other
        if (!available) continue;
        if (game.upgrades.Scientists.done < game.upgrades.Scientists.allowed && upgrade != 'Scientists') continue;
            buyUpgrade(upgrade, true, true);
            debug('Upgraded ' + upgrade, "upgrades", "*upload2");
        }
}
