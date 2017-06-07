'use strict';

var _ = require('lodash');
var ships = require('./ships');
var events = require('../controllers/events');
var XpItem = require('./xpItem');
var itemTypes = require('./itemTypes');
var upgrades = require('../models/upgrades').all;
var pilots = require('../models/pilots').allRebels;

// Ship build
var ShipBuild = function (startingShipId) {
    this.startingShip = this.getShipById(startingShipId);

    this.xpHistory = [];
    this.currentXp = 0;
    this.addToHistory(itemTypes.STARTING_SHIP_TYPE, {
        shipId: this.startingShip.id
    });

    this.pilotAbilities = [];
    this.upgrades = {};

    this.currentShip = this.startingShip;
    events.trigger('model.build.currentShip.update', this);

    this.setPilotSkill(2);
};

ShipBuild.prototype.getShipById = function (shipId) {
    var hotacShipModel = _.find(ships, function (ship) {
        return ship.id === shipId;
    });
    var newModel = _.clone(hotacShipModel, true);
    return newModel;
};

ShipBuild.prototype.getUpgradeById = function (upgradeId) {
    return _.find(upgrades, function (upgradeItem) {
        return upgradeItem.id === upgradeId;
    });
};

ShipBuild.prototype.getPilotById = function (pilotId) {
    return _.find(pilots, function (pilotCard) {
        return pilotCard.id === pilotId;
    });
};

ShipBuild.prototype.setPilotSkill = function (ps) {
    this.pilotSkill = ps;
    events.trigger('model.build.pilotSkill.update', {
        pilotSkill: this.pilotSkill,
        build: this
    });
};

ShipBuild.prototype.addXp = function (xp) {
    this.currentXp += xp;
    events.trigger('model.build.xp.update', this.currentXp);
};

ShipBuild.prototype.removeXp = function (xp) {
    this.currentXp -= xp;
    events.trigger('model.build.xp.update', this.currentXp);
};

ShipBuild.prototype.addToHistory = function (type, data) {
    var xpItem = new XpItem(type, data);
    this.addXp(xpItem.cost());
    this.xpHistory.push(xpItem);
    events.trigger('model.build.xpHistory.add', {
        build: this,
        xpItem: xpItem
    });
};

ShipBuild.prototype.changeShip = function (shipId) {
    this.addToHistory(itemTypes.SHIP_TYPE, {
        shipId: shipId
    });
    this.currentShip = this.getShipById(shipId);
    events.trigger('model.build.currentShip.update', this);
};

ShipBuild.prototype.increasePilotSkill = function () {
    this.setPilotSkill(this.pilotSkill + 1);
    this.addToHistory(itemTypes.PILOT_SKILL, {
        pilotSkill: this.pilotSkill
    });
};

ShipBuild.prototype.addMissionXp = function (xpAmount) {
    this.addToHistory(itemTypes.MISSION, {
        missionXp: xpAmount
    });
};

ShipBuild.prototype.buyUpgrade = function (upgradeId) {
    this.addToHistory(itemTypes.BUY_UPGRADE, {
        upgradeId: upgradeId
    });
    var upgrade = this.getUpgradeById(upgradeId);
    if (!this.upgrades[upgrade.slot]) {
        this.upgrades[upgrade.slot] = [];
    }
    this.upgrades[upgrade.slot].push(upgrade);
    events.trigger('model.build.upgrades.update', this);
};

ShipBuild.prototype.buyPilotAbility = function (pilotId) {
    this.addToHistory(itemTypes.BUY_PILOT_ABILITY, {
        pilotId: pilotId
    });
    var pilot = this.getPilotById(pilotId);
    this.pilotAbilities.push(pilot);
    events.trigger('model.build.pilotAbilities.update', this);
};

ShipBuild.prototype.generateExportString = function () {
    var itemExports = _.map(this.xpHistory, function (xpItem) {
        return xpItem.exportString();
    });
    var exportString = itemExports.join(',');
    return exportString;
};

module.exports = ShipBuild;

