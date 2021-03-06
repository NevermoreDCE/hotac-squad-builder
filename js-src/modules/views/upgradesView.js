'use strict';

var $ = require('jquery');
var _ = require('lodash');

var modalController = require('../controllers/modals');
var events = require('../controllers/events');
var abilityCardView = require('./abilityCard');
var loseUpgradeModal = require('./loseUpgradeModal');
var upgrades = require('../models/upgrades');
var conditions = require('../models/conditions');
var conditionsByName = conditions.keyedByName;
var templateUtils = require('../utils/templates');

module.exports = {
    init: function () {
        module.exports.bindEquipButtons();
    },
    bindEquipButtons: function () {
        $(document).on('click', '[equip-card]', function () {
            var upgradeId = parseInt($(this).attr('equip-card'), 10);
            events.trigger('view.upgrades.equipUpgrade', upgradeId);
        });
        $(document).on('click', '[unequip-card]', function () {
            var upgradeId = parseInt($(this).attr('unequip-card'), 10);
            events.trigger('view.upgrades.unequipUpgrade', upgradeId);
        });
        $(document).on('click', '[equip-ability]', function () {
            var upgradeId = parseInt($(this).attr('equip-ability'), 10);
            events.trigger('view.upgrades.equipAbility', upgradeId);
        });
        $(document).on('click', '[unequip-ability]', function () {
            var upgradeId = parseInt($(this).attr('unequip-ability'), 10);
            events.trigger('view.upgrades.unequipAbility', upgradeId);
        });
    },
    renderShipSlotsList: function (build) {
        var $wrapperElement = $('[view-bind=ship-slots-list]');

        var upgradeSlots = build.upgradeSlots;

        var freeSlots = _.map(upgradeSlots.free, function (upgradeSlot) {
            return module.exports.renderFreeShipSlot(upgradeSlot);
        });

        var enabledSlots = _.map(upgradeSlots.enabled, function (upgradeSlot) {
            return module.exports.renderShipSlot(upgradeSlot, build);
        });

        var disabledSlots = _.map(upgradeSlots.disabled, function (upgradeSlot) {
            if (build.pilotSkill < upgradeSlot.pilotSkill) {
                return module.exports.renderShipSlot(upgradeSlot, build);
            }
        });

        var slotsFromUpgrades = _.map(upgradeSlots.slotsFromUpgrades, function (upgradeSlot) {
            return module.exports.renderShipSlot(upgradeSlot, build);
        });

        var context = {
            free: freeSlots,
            enabled: enabledSlots,
            disabled: disabledSlots,
            slotsFromUpgrades: slotsFromUpgrades
        };

        var viewHtml = templateUtils.renderHTML('upgrades/shipslots', context);
        var $newElement = $(viewHtml);

        $newElement.on('click', '.ship-slots-list [open-card-preview]', function () {
            var upgradeId = parseInt($(this).attr('open-card-preview'), 10);
            var buttonType = $(this).attr('preview-button');
            modalController.openUpgradeCardModal(upgradeId, buttonType);
        });
        $newElement.on('click', '.ship-slots-list [open-ability-preview]', function () {
            var upgradeId = parseInt($(this).attr('open-ability-preview'), 10);
            var buttonType = $(this).attr('preview-button');
            modalController.openAbilityCardModal(upgradeId, buttonType);
        });

        var abilitiesAvailableToBuy = build.upgrades.getAbilitiesAvailableToBuy();
        $newElement.on('click', '.ship-slots-list [equip-slot]', function () {
            var slotType = $(this).attr('equip-slot');
            var upgradesAvailableToBuy = build.upgrades.getAvailableToBuy(slotType);
            var unusedUpgradesForType = _.filter(build.upgrades.unequipped, function (upgrade) {
                return upgrade.slot === slotType;
            });
            module.exports.clickEquipSlot(slotType, unusedUpgradesForType, build.upgrades.unequippedAbilities, upgradesAvailableToBuy, abilitiesAvailableToBuy, build);
        });

        $wrapperElement.empty().append($newElement);

    },
    renderShipSlot: function (upgradeSlot, build) {
        var upgradesAvailableToBuy = build.upgrades.getAvailableToBuy(upgradeSlot.type);
        var abilitiesAvailableToBuy = build.upgrades.getAbilitiesAvailableToBuy();

        // Don't show this slot if we can't either buy or equip anything existing into it
        //  (for example, no titles for this ship)
        var hasUpgradesToBuy = (upgradesAvailableToBuy.length > 0);
        var hasAbilitiesToBuy = (abilitiesAvailableToBuy.length > 0);
        var hasUpgradesToEquip = _.find(build.upgrades.unequipped, {
            slot: upgradeSlot.type
        });

        if (!upgradeSlot.equipped) {
            if (upgradeSlot.type === 'Elite') {
                if (!hasUpgradesToBuy && !hasUpgradesToEquip && !hasAbilitiesToBuy) {
                    return;
                }
            } else {
                if (!hasUpgradesToBuy && !hasUpgradesToEquip) {
                    return;
                }
            }
        }

        var context = {
            build: build,
            upgradeSlot: upgradeSlot,
            iconString: upgrades.getIconString(upgradeSlot.type)
        };

        var viewHtml = templateUtils.renderHTML('upgrades/ship-slot', context);

        return viewHtml;
    },
    renderFreeShipSlot: function (upgradeSlot) {
        var context = {
            upgradeSlot: upgradeSlot,
            iconString: upgrades.getIconString(upgradeSlot.type)
        };

        var viewHtml = templateUtils.renderHTML('upgrades/free-ship-slot', context);

        return viewHtml;
    },
    renderPrintCardList: function (build) {
        var $wrapper = $('[view-bind=print-card-list]');

        var upgrades = _.clone(build.currentShip.startingUpgrades);
        _.each(build.upgrades.purchased, function (upgrade) {
            upgrades.push(upgrade);
        });

        var context = {
            upgrades: upgrades,
            abilities: build.upgrades.purchasedAbilities,
            renderCard: abilityCardView.renderHtml,
            conditions: conditionsByName
        };
        templateUtils.renderToDom('card-list', $wrapper, context);
    },
    renderUpgradesList: function (build) {

        var $listsWrapper = $('.upgrade-slots-wrapper');
        var $unusedList = $('#unused-upgrade-list');
        $unusedList.empty();

        var hasUnequippedUpgrades = (build.upgrades.unequipped.length > 0 || build.upgrades.unequippedAbilities.length > 0);
        var hasDisabledUpgrades = (build.upgrades.disabled.length > 0);
        var hasDisabledOrUnequippedUpgrades = (hasDisabledUpgrades || hasUnequippedUpgrades);

        var unequipped = _.map(build.upgrades.unequipped, function (upgrade) {
            return module.exports.renderUpgradeItem(upgrade);
        });
        var unequippedAbilities = _.map(build.upgrades.unequippedAbilities, function (pilotAbility) {
            return module.exports.renderPilotUpgradeItem(pilotAbility);
        });
        var disabled = _.map(build.upgrades.disabled, function (upgrade) {
            return module.exports.renderUpgradeItem(upgrade);
        });

        if (!hasDisabledOrUnequippedUpgrades) {
            $listsWrapper.removeClass('two-column').addClass('one-column');
        } else {
            $listsWrapper.removeClass('one-column').addClass('two-column');
        }

        var $wrapperElement = $('[view-bind=allowed-list]');
        var context = {
            unequipped: unequipped,
            unequippedAbilities: unequippedAbilities,
            disabled: disabled,
            hasDisabledOrUnequippedUpgrades: hasDisabledOrUnequippedUpgrades,
            hasUnequippedUpgrades: hasUnequippedUpgrades,
            hasDisabledUpgrades: hasDisabledUpgrades
        };
        var viewHtml = templateUtils.renderHTML('upgrades/allowed-list', context);
        var $newElement = $(viewHtml);

        $newElement.on('click', 'li.upgrade.card', function () {
            var upgradeId = parseInt($(this).attr('upgrade-id'), 10);
            var canEquipUpgrade = build.upgrades.canEquipUpgrade(upgradeId);
            if (canEquipUpgrade) {
                modalController.openUpgradeCardModal(upgradeId, 'equip');
            } else {
                modalController.openUpgradeCardModal(upgradeId, 'equip-disabled');
            }
        });
        $newElement.on('click', 'li.upgrade.ability', function () {
            var pilotId = parseInt($(this).attr('ability-id'), 10);
            var canEquipAbilities = build.upgrades.canEquipAbilties();
            if (canEquipAbilities) {
                modalController.openAbilityCardModal(pilotId, 'equip');
            } else {
                modalController.openAbilityCardModal(pilotId, 'equip-disabled');
            }
        });

        $wrapperElement.empty().append($newElement);
    },
    renderUpgradeItem: function (upgrade) {
        var itemHtml = '<li class="upgrade card" upgrade-id="' + upgrade.id + '">' + upgrades.getIconString(upgrade.slot) + '<span class="upgrade-name">' + (upgrade.dualCardName || upgrade.name) + '</span><i class="material-icons eye">zoom_in</i></li>';
        return itemHtml;
    },
    renderPilotUpgradeItem: function (pilot) {
        var itemHtml = '<li class="upgrade ability" ability-id="' + pilot.id + '">' + upgrades.getIconString('Elite') + '<span class="upgrade-name">Ability: ' + pilot.name + '</span><i class="material-icons eye">zoom_in</i></li>';
        return itemHtml;
    },
    clickEquipSlot: function (upgradeType, unusedUpgrades, unusedAbilities, upgradesAvailableToBuy, abilitiesAvailableToBuy, build) {
        // open modal to choose upgrade to equip
        var tabs = module.exports.renderUpgradeModalContent(upgradeType, unusedUpgrades, unusedAbilities, upgradesAvailableToBuy, abilitiesAvailableToBuy, build);
        modalController.openOptionSelectModal(undefined, tabs[0].buttonLabel, 'Equip ' + upgradeType + ' slot', tabs);
    },
    renderUpgradeModalContent: function (upgradeType, unusedUpgrades, unusedAbilities, upgradesAvailableToBuy, abilitiesAvailableToBuy, build) {
        var tabs = [];

        if (unusedUpgrades.length > 0 || (unusedAbilities.length > 0 && upgradeType === 'Elite')) {
            var $unusedUpgradesTab = module.exports.renderCardListModalContent(upgradeType, build, unusedUpgrades, unusedAbilities, 'equip');

            tabs.push({
                name: 'Existing',
                $content: $unusedUpgradesTab,
                buttonLabel: 'Equip'
            });
        }

        var $cardTab = module.exports.renderCardListModalContent(upgradeType, build, upgradesAvailableToBuy, abilitiesAvailableToBuy, 'buy');
        tabs.push({
            name: 'Buy new',
            $content: $cardTab,
            buttonLabel: 'Buy'
        });

        return tabs;
    },
    renderCardListModalContent: function (upgradeType, build, upgradesToShow, abilitiesToShow, mode) {
        var $modalContent = $('<div class="card-image-list" id="modal-upgrade-list-' + mode + '">');
        var $upgradeList = $('<ul>');

        _.forEach(upgradesToShow, function (item) {
            var $upgrade = module.exports.renderModalCardListItem(build, mode, item);
            $upgradeList.append($upgrade);
        });
        if (upgradeType === 'Elite') {
            _.forEach(abilitiesToShow, function (pilotCard) {
                var $upgrade = module.exports.renderModalCardListItem(build, mode, undefined, pilotCard);
                $upgradeList.append($upgrade);
            });
        }

        $modalContent.append($upgradeList);

        return $modalContent;
    },
    renderModalCardListItem: function (build, mode, card, abilityPilot) {
        var $upgrade;
        if (card) {
            $upgrade = $('<li><div class="upgrade-card"><img src="/components/xwing-data/images/' + card.image + '" alt="' + card.name + '"></div></li>');

            if (mode === 'buy') {
                if (build.currentXp >= card.points) {
                    // We have enough XP to buy this item
                    $upgrade.on('click', function () {
                        var selectOptions = {
                            selectedUpgradeEvent: 'view.upgrades.buy',
                            selectedUpgradeId: card.id,
                            text: card.name + ': ' + card.hotacPoints + 'XP'
                        };
                        if (card.slot === 'Elite') {
                            selectOptions.text = '<span>' + card.name + ': ' + card.hotacPoints + 'XP</span><span class="help">Elite card upgrades cost double XP</span>';
                        }
                        $(this).trigger('select', selectOptions);
                    });
                } else {
                    // not enough XP
                    $upgrade.addClass('cannot-afford');
                }

            } else if (mode === 'equip') {
                // mode is equip existing item
                $upgrade.on('click', function () {
                    $(this).trigger('select', {
                        selectedUpgradeEvent: 'view.upgrades.equipUpgrade',
                        selectedUpgradeId: card.id,
                        text: '<span>' + card.name + '</span><span class="help">No cost to equip a purchased upgrade</span>'
                    });
                });
            }
        }
        if (abilityPilot) {
            var upgradeCost = abilityPilot.skill;
            $upgrade = $('<li></li>');
            var $card = abilityCardView.renderElement(abilityPilot);
            $upgrade.append($card);

            if (mode === 'buy') {
                var enabled = true;
                if (build.currentXp < upgradeCost) {
                    // not enough XP
                    $upgrade.addClass('cannot-afford');
                    enabled = false;
                }
                if (build.pilotSkill < abilityPilot.skill) {
                    // not high enough PS level yet
                    $upgrade.addClass('lower-ps');
                    enabled = false;
                }

                if (enabled) {
                    $upgrade.on('click', function () {
                        $(this).trigger('select', {
                            selectedUpgradeEvent: 'view.pilotAbilities.buy',
                            selectedUpgradeId: abilityPilot.id,
                            text: abilityPilot.name + ': ' + abilityPilot.skill + 'XP'
                        });
                    });
                }
            } else {
                // Mode is to equip existing ability
                $upgrade.on('click', function () {
                    $(this).trigger('select', {
                        selectedUpgradeEvent: 'view.upgrades.equipAbility',
                        selectedUpgradeId: abilityPilot.id,
                        text: abilityPilot.name
                    });
                });
            }
        }

        return $upgrade;
    },
    renderLoseButton: function (build) {
        var $wrapperElement = $('[view-bind=lose-upgrade-button]');

        var hasPurchased = (build.upgrades.purchased.length > 0 || build.upgrades.purchasedAbilities.length > 0);
        var context = {
            hasPurchased: hasPurchased
        };
        templateUtils.renderToDom('upgrades/lose-upgrade-button', $wrapperElement, context);

        var clickHandler = function () {
            var $modalContent = loseUpgradeModal.renderView(build);
            modalController.openTitledModal($modalContent, 'Lose an upgrade', 'lose-upgrade-modal');
        };
        $('[trigger-lose-upgrade]').off('click.loseButton').on('click.loseButton', clickHandler);
    }
};
