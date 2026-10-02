const BaseActorSheet = foundry.appv1.sheets.ActorSheet;
const BaseItemSheet = foundry.appv1.sheets.ItemSheet;

function getFallbackGenres() {
    return {
        "fantasy": { name: game.i18n.localize("KEXBORN.Genres.Fantasy"), categories: { "power": { label: game.i18n.localize("KEXBORN.Categories.Power") }, "cult": { label: game.i18n.localize("KEXBORN.Categories.Cult") }, "entertainment": { label: game.i18n.localize("KEXBORN.Categories.Entertainment") }, "education": { label: game.i18n.localize("KEXBORN.Categories.Education") }, "industry": { label: game.i18n.localize("KEXBORN.Categories.Industry") }, "trade": { label: game.i18n.localize("KEXBORN.Categories.Trade") }, "special": { label: game.i18n.localize("KEXBORN.Categories.Special") } } },
        "modern": { name: game.i18n.localize("KEXBORN.Genres.Modern"), categories: { "power": { label: game.i18n.localize("KEXBORN.Categories.Power") }, "cult": { label: game.i18n.localize("KEXBORN.Categories.Cult") }, "entertainment": { label: game.i18n.localize("KEXBORN.Categories.Entertainment") }, "education": { label: game.i18n.localize("KEXBORN.Categories.EducationTech") }, "industry": { label: game.i18n.localize("KEXBORN.Categories.Industry") }, "trade": { label: game.i18n.localize("KEXBORN.Categories.Trade") }, "military": { label: game.i18n.localize("KEXBORN.Categories.Military") }, "special": { label: game.i18n.localize("KEXBORN.Categories.Special") } } },
        "scifi": { name: game.i18n.localize("KEXBORN.Genres.Scifi"), categories: { "power": { label: game.i18n.localize("KEXBORN.Categories.Power") }, "cult": { label: game.i18n.localize("KEXBORN.Categories.Cult") }, "entertainment": { label: game.i18n.localize("KEXBORN.Categories.Entertainment") }, "education": { label: game.i18n.localize("KEXBORN.Categories.EducationTech") }, "industry": { label: game.i18n.localize("KEXBORN.Categories.Industry") }, "trade": { label: game.i18n.localize("KEXBORN.Categories.Trade") }, "military": { label: game.i18n.localize("KEXBORN.Categories.Military") }, "special": { label: game.i18n.localize("KEXBORN.Categories.Special") } } }
    };
}

const SafeEditor = {
    enrichHTML: async (text, options) => {
        const editor = (typeof foundry !== "undefined" && foundry.applications?.ux?.TextEditor?.implementation) 
            ? foundry.applications.ux.TextEditor.implementation 
            : TextEditor;
        return await editor.enrichHTML(text, options);
    }
};

export class SettlementSheet extends BaseActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet", "actor", "settlement"],
            template: "modules/kexborn-world-manager/templates/settlement-sheet.html",
            width: 1000, height: 900,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [{ dragSelector: ".item-list .item", dropSelector: ".sheet-body" }],
            scrollY: [".sheet-body"]
        });
    }

    async getData() {
        const context = await super.getData();
        context.theme = game.settings.get("kexborn-world-manager", "theme");
        context.isTreeView = game.settings.get("kexborn-world-manager", "infraView") === "tree";
        context.system = this.actor.system;
        context.editable = this.isEditable; 
        context.isLocked = this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true;
        context.docName = this.actor.name;
        context.enrichedDescription = await SafeEditor.enrichHTML(this.actor.system.description || "", { async: true });

        context.enableNpcsTab = game.settings.get("kexborn-world-manager", "enableNpcsTab");
        context.enableInfraTab = game.settings.get("kexborn-world-manager", "enableInfraTab");
        context.enableInfluenceTab = game.settings.get("kexborn-world-manager", "enableInfluenceTab");
        context.showSettlementStats = game.settings.get("kexborn-world-manager", "showSettlementStats");

        let genresConfig = game.settings.get("kexborn-world-manager", "genresData");
        if (foundry.utils.isEmpty(genresConfig) || !genresConfig["scifi"]) {
            genresConfig = getFallbackGenres();
        }

        context.availableGenres = {};
        for (let key in genresConfig) context.availableGenres[key] = genresConfig[key].name;

        let currentGenre = this.actor.system.genre || "fantasy";
        if (!genresConfig[currentGenre]) currentGenre = Object.keys(genresConfig)[0];

        context.infrastructure = [];
        for (let [catId, catData] of Object.entries(genresConfig[currentGenre].categories)) {
            if (!catData.hidden) {
                context.infrastructure.push({ id: catId, label: catData.label, items: [] });
            }
        }
        
        if (!context.infrastructure.find(c => c.id === "special")) {
            context.infrastructure.push({ id: "special", label: game.i18n.localize("KEXBORN.Categories.Special"), items: [] });
        }

        context.factions = [];
        context.levels = { "1": "1", "2": "2", "3": "3", "4": "4", "5": "5" };
        let computedStats = { army: 0, law: 0, culture: 0, wealth: 0, health: 0, science: 0 };
        const sortedItems = this.actor.items.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        const builtItemNames = new Set();

        for (let item of sortedItems) {
            if (item.type === "kexborn-world-manager.faction") {
                let desc = item.system.description || "";
                let tooltip = `<div style='text-align:center; margin-bottom: 5px;'><b>${item.name}</b></div><hr><div style='font-size:12px; font-weight:normal; text-align:left; max-width: 300px; white-space: normal; margin: 5px 0;'>${desc}</div>`;
                context.factions.push({ id: item.id, name: item.name, img: item.img, system: item.system, tooltip: tooltip });
            } else if (item.type === "kexborn-world-manager.city-structure") {
                builtItemNames.add(item.name);
                
                let itemGenre = item.system.genre || "fantasy";
                let catId = item.system.category || "special";
                
                if (itemGenre === "universal" || (itemGenre !== currentGenre && itemGenre !== "universal")) {
                    catId = "special";
                }

                const safeBonuses = item.system.bonuses || { army: 0, law: 0, culture: 0, wealth: 0, health: 0, science: 0 };
                let displayItem = { id: item.id, img: item.img, name: item.name, system: item.system, safeLevel: item.system.level || 1, formattedBonuses: {} };
                
                computedStats.army += Number(safeBonuses.army || 0); 
                computedStats.law += Number(safeBonuses.law || 0); 
                computedStats.culture += Number(safeBonuses.culture || 0); 
                computedStats.wealth += Number(safeBonuses.wealth || 0); 
                computedStats.health += Number(safeBonuses.health || 0); 
                computedStats.science += Number(safeBonuses.science || 0);

                for (let stat of ["army", "law", "culture", "wealth", "health", "science"]) {
                    let val = Number(safeBonuses[stat] || 0);
                    if (val !== 0) displayItem.formattedBonuses[stat] = (val > 0 ? "+" : "") + val;
                }
                
                let category = context.infrastructure.find(c => c.id === catId);
                if (!category) category = context.infrastructure.find(c => c.id === "special");
                category.items.push(displayItem);
            }
        }
        context.computedStats = computedStats;

        if (context.isTreeView) {
            const allStructures = game.items.filter(i => {
                if (i.type !== "kexborn-world-manager.city-structure") return false;
                let iGenre = i.system.genre || "fantasy";
                return iGenre === currentGenre || iGenre === "universal" || builtItemNames.has(i.name);
            });
            
            context.treeCategories = [];
            
            for (let cat of context.infrastructure) {
                let catNode = { id: cat.id, label: cat.label, rows: [] };
                
                let catItems = allStructures.filter(i => {
                    let iGenre = i.system.genre || "fantasy";
                    let iCat = i.system.category || "special";
                    if (iGenre === "universal" || (iGenre !== currentGenre && iGenre !== "universal")) iCat = "special";
                    return iCat === cat.id;
                }).sort((a, b) => {
                    const prioA = a.system.priority || 0;
                    const prioB = b.system.priority || 0;
                    if (prioA !== prioB) return prioA - prioB;
                    const levelA = a.system.level || 1;
                    const levelB = b.system.level || 1;
                    if (levelA !== levelB) return levelA - levelB;
                    return a.name.localeCompare(b.name, 'ru');
                });

                let unplacedItems = new Set(catItems);
                
                const formatItem = (item) => {
                    let isBuilt = builtItemNames.has(item.name);
                    let reqs = item.system.prerequisites || [];
                    let missingReqs = reqs.filter(r => r && r.trim() !== "" && !builtItemNames.has(r.trim()));
                    
                    let itemLevel = Number(item.system.level || 1);
                    let cityLevel = Number(this.actor.system.level || 1);
                    let isLevelMet = itemLevel <= cityLevel;

                    let isAvailable = missingReqs.length === 0 && isLevelMet;
                    let tooltip = `<div style='text-align:center; margin-bottom: 5px;'><b>${item.name}</b></div>`;
                    
                    if (item.system.description) {
                        tooltip += `<hr><div style='font-size:12px; font-weight:normal; text-align:left; max-width: 300px; white-space: normal; margin: 5px 0;'>${item.system.description}</div>`;
                    }

                    const safeBonuses = item.system.bonuses || {};
                    let bonusesHtml = [];
                    const statLabels = { 
                        army: game.i18n.localize("KEXBORN.Stats.Army"), 
                        law: game.i18n.localize("KEXBORN.Stats.Law"), 
                        culture: game.i18n.localize("KEXBORN.Stats.Culture"), 
                        wealth: game.i18n.localize("KEXBORN.Stats.Wealth"), 
                        health: game.i18n.localize("KEXBORN.Stats.Health"), 
                        science: game.i18n.localize("KEXBORN.Stats.Science") 
                    };
                    
                    for (let stat of ["army", "law", "culture", "wealth", "health", "science"]) {
                        let val = Number(safeBonuses[stat] || 0);
                        if (val !== 0) {
                            let sign = val > 0 ? "+" : "";
                            let color = val > 0 ? "#4a5" : "#ff6b6b"; 
                            bonusesHtml.push(`<span style='display:inline-block; padding:2px 4px; margin:2px; border:1px solid rgba(255,255,255,0.2); border-radius:3px; background:rgba(0,0,0,0.3);'>${statLabels[stat]} <span style='color:${color}; font-weight:bold;'>${sign}${val}</span></span>`);
                        }
                    }

                    if (bonusesHtml.length > 0) {
                        tooltip += `<hr><div style='font-size:11px; margin: 5px 0; display:flex; flex-wrap:wrap; justify-content:center;'>${bonusesHtml.join("")}</div>`;
                    }

                    if (missingReqs.length > 0) {
                        tooltip += `<hr><div style='color:#ff6b6b; font-size:12px; margin: 5px 0;'><b>${game.i18n.localize("KEXBORN.Tree.Required")}</b><br/>${missingReqs.join("<br/>")}</div>`;
                    }
                    if (!isLevelMet && !isBuilt) {
                        tooltip += `<hr><div style='color:#ff6b6b; font-size:12px; margin: 5px 0;'><b>${game.i18n.localize("KEXBORN.Tree.RequiredCityLevel")} ${itemLevel}</b> (${game.i18n.localize("KEXBORN.Tree.CurrentLevel")} ${cityLevel})</div>`;
                    }
                    tooltip += `<hr><div style='font-size:11px; opacity:0.8; margin-top: 5px;'>${game.i18n.localize("KEXBORN.Tree.ControlsHint")}</div>`;

                    return { id: item.id, name: item.name, img: item.img, isBuilt, isAvailable, isLocked: !isBuilt && !isAvailable, tooltip };
                };

                while(unplacedItems.size > 0) {
                    let root = Array.from(unplacedItems).find(item => {
                        let reqs = item.system.prerequisites || [];
                        return !reqs.some(reqName => Array.from(unplacedItems).some(ui => ui.name === reqName.trim()));
                    });
                    
                    if (!root) root = Array.from(unplacedItems).sort((a,b) => (a.system.level||1) - (b.system.level||1))[0];
                    let row = [ [], [], [], [], [] ];
                    
                    const placeItem = (item) => {
                        let lvl = item.system.level || 1;
                        row[lvl - 1].push(formatItem(item));
                        unplacedItems.delete(item);
                        
                        let children = Array.from(unplacedItems).filter(child => {
                            let reqs = child.system.prerequisites || [];
                            return reqs.some(r => r.trim() === item.name);
                        });
                        children.forEach(c => placeItem(c));
                    };
                    
                    placeItem(root);
                    
                    row.forEach(cell => {
                        if (cell.length > 1) {
                            for (let i = 1; i < cell.length; i++) cell[i].isBranch = true;
                        }
                    });
                    catNode.rows.push(row);
                }
                context.treeCategories.push(catNode);
            }
        }

        context.linkedOrganizations = [];
        for (let uuid of (this.actor.system.organizations || [])) {
            const orgActor = fromUuidSync(uuid);
            if (orgActor) {
                let influence = Number(orgActor.system.influence) || 0;
                let desc = orgActor.system.description || "";
                let tooltip = `<div style='text-align:center; margin-bottom: 5px;'><b>${orgActor.name}</b></div><hr><div style='font-size:12px; font-weight:normal; text-align:left; max-width: 300px; white-space: normal; margin: 5px 0;'>${desc}</div>`;
                context.linkedOrganizations.push({ uuid: orgActor.uuid, img: orgActor.img, name: orgActor.name, system: orgActor.system, tooltip: tooltip, influenceTokens: [{ value: 1, active: (influence >= 1) }, { value: 2, active: (influence >= 2) }, { value: 3, active: (influence >= 3) }, { value: 4, active: (influence >= 4) }, { value: 5, active: (influence >= 5) }] });
            }
        }
        context.linkedNpcs = [];
        for (let uuid of (this.actor.system.npcs || [])) {
            const npcActor = fromUuidSync(uuid);
            if (npcActor) context.linkedNpcs.push({ uuid: npcActor.uuid, img: npcActor.img, name: npcActor.name });
        }
        return context;
    }

    _canDragStart(selector) { if (this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true) return false; return super._canDragStart(selector); }
    _canDragDrop(selector) { if (this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true) return false; return super._canDragDrop(selector); }

    async _onDropActor(event, data) {
        if (!this.isEditable) return false;
        if (this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.UnlockToEdit"));
        const droppedActor = await fromUuid(data.uuid);
        if (!droppedActor) return false;
        if (droppedActor.type === "kexborn-world-manager.organization") { const orgs = new Set(this.actor.system.organizations || []); if (orgs.has(droppedActor.uuid)) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.OrgAlreadyAdded")); orgs.add(droppedActor.uuid); await this.actor.update({"system.organizations": Array.from(orgs)}); } else if (["npc", "character"].includes(droppedActor.type)) { const npcs = new Set(this.actor.system.npcs || []); if (npcs.has(droppedActor.uuid)) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.NpcAlreadyAdded")); npcs.add(droppedActor.uuid); await this.actor.update({"system.npcs": Array.from(npcs)}); }
    }

    async _onDropItem(event, data) {
        if (!this.isEditable) return false;
        if (this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true) return false;
        const item = await Item.implementation.fromDropData(data);
        if (!item) return false;
        if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(event, data);
        
        const allowedTypes = ["kexborn-world-manager.faction", "kexborn-world-manager.city-structure"];
        if (!allowedTypes.includes(item.type)) {
            ui.notifications.warn("В поселение можно добавлять только Фракции и Городские сооружения!");
            return false;
        }
        
        if (this.actor.items.some(i => i.name === item.name && i.type === item.type)) return ui.notifications.warn(game.i18n.format("KEXBORN.Notifications.AlreadyAdded", { name: item.name }));
        if (item.type === "kexborn-world-manager.city-structure" && (item.system.level || 1) > (this.actor.system.level || 1)) return ui.notifications.error(game.i18n.format("KEXBORN.Notifications.LevelTooHigh", { itemLvl: item.system.level || 1, cityLvl: this.actor.system.level || 1 }));
        return super._onDropItem(event, data);
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.isEditable) return;

        html.find('.influence-slider').on('input change', async ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget).closest(".item");
            const itemId = li.attr("data-item-id");
            const item = this.actor.items.get(itemId);
            const newValue = parseInt(ev.target.value);
            li.find('.influence-val').text(newValue);
            if (ev.type === 'change' && item) await item.update({"system.influence": newValue});
        });

        html.find('.tree-node').on('contextmenu', async ev => { ev.preventDefault(); const worldItemId = $(ev.currentTarget).data("item-id"); const worldItem = game.items.get(worldItemId); if (worldItem) worldItem.sheet.render(true); });
        
        html.find('.tree-node').on('click', async ev => {
            ev.preventDefault();
            if (this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.UnlockToEditInfra"));
            const node = $(ev.currentTarget);
            if (node.hasClass("locked")) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.BuildPrerequisitesFirst"));
            const worldItemId = node.data("item-id");
            const worldItem = game.items.get(worldItemId);
            if (!worldItem) return ui.notifications.error(game.i18n.localize("KEXBORN.Notifications.OriginalNotFound"));
            const existingItem = this.actor.items.find(i => i.name === worldItem.name && i.type === "kexborn-world-manager.city-structure");
            if (existingItem) {
                await this.actor.deleteEmbeddedDocuments("Item", [existingItem.id]);
            } else {
                if ((worldItem.system.level || 1) > (this.actor.system.level || 1)) return ui.notifications.error(game.i18n.format("KEXBORN.Notifications.LevelTooHigh", { itemLvl: worldItem.system.level || 1, cityLvl: this.actor.system.level || 1 }));
                const itemData = worldItem.toObject();
                await this.actor.createEmbeddedDocuments("Item", [itemData]);
            }
        });

        html.find('.sheet-lock').on('click', async ev => { ev.preventDefault(); const isLocked = this.actor.getFlag("kexborn-world-manager", "sheetLocked") ?? true; await this.actor.setFlag("kexborn-world-manager", "sheetLocked", !isLocked); });
        html.find('.item-delete').on('click', async ev => { ev.preventDefault(); const li = $(ev.currentTarget).closest(".item"); const itemId = li.attr("data-item-id"); const uuid = li.attr("data-uuid"); const listType = li.attr("data-list-type"); if (listType === "organization") { const orgs = (this.actor.system.organizations || []).filter(id => id !== uuid); await this.actor.update({"system.organizations": orgs}); } else if (listType === "npc") { const npcs = (this.actor.system.npcs || []).filter(id => id !== uuid); await this.actor.update({"system.npcs": npcs}); } else if (itemId) { this.actor.deleteEmbeddedDocuments("Item", [itemId]); } });
        html.find('.item-edit').on('click', async ev => { ev.preventDefault(); const li = $(ev.currentTarget).closest(".item"); const itemId = li.attr("data-item-id"); const uuid = li.attr("data-uuid"); if (uuid) { const doc = await fromUuid(uuid); if (doc) doc.sheet.render(true); } else if (itemId) { const item = this.actor.items.get(itemId); if (item) item.sheet.render(true); } });
        
        html.find('.org-token-radio').on('click', async ev => { ev.preventDefault(); ev.stopPropagation(); const uuid = $(ev.currentTarget).closest(".item").attr("data-uuid"); const orgActor = await fromUuid(uuid); const newValue = parseInt($(ev.currentTarget).attr("data-value")); if (orgActor && !isNaN(newValue)) await orgActor.update({"system.influence": newValue}); });
        html.find('.org-token-radio').on('contextmenu', async ev => { ev.preventDefault(); ev.stopPropagation(); const uuid = $(ev.currentTarget).closest(".item").attr("data-uuid"); const orgActor = await fromUuid(uuid); if (orgActor) { let current = orgActor.system.influence || 0; let newVal = Math.max(0, current - 1); await orgActor.update({"system.influence": newVal}); } });
        html.find('.org-stat-input').on('change', async ev => { ev.preventDefault(); const uuid = $(ev.currentTarget).closest(".item").attr("data-uuid"); const orgActor = await fromUuid(uuid); const field = ev.target.name; const newValue = parseInt(ev.target.value) || 0; if (orgActor) await orgActor.update({[field]: newValue}); });
    }
}

export class OrganizationSheet extends BaseActorSheet {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["sheet", "actor", "organization"], template: "modules/kexborn-world-manager/templates/organization-sheet.html", width: 550, height: 600, tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }], dragDrop: [{ dragSelector: ".item-list .item", dropSelector: ".sheet-body" }], scrollY: [".sheet-body"] }); }
    async getData() { const context = await super.getData(); context.theme = game.settings.get("kexborn-world-manager", "theme"); context.system = this.actor.system; context.editable = this.isEditable; context.docName = this.actor.name; if (!context.system.stats) context.system.stats = { attack: 0, resources: 0, vitality: 0 }; context.enrichedDescription = await SafeEditor.enrichHTML(this.actor.system.description || "", { async: true }); context.orgFeatures = this.actor.items.filter(i => i.type === "kexborn-world-manager.organization-feature"); context.linkedNpcs = []; for (let uuid of (this.actor.system.npcs || [])) { const npcActor = fromUuidSync(uuid); if (npcActor) context.linkedNpcs.push({ uuid: npcActor.uuid, img: npcActor.img, name: npcActor.name }); } let influence = Number(context.system.influence) || 0; context.influenceTokens = [ { value: 1, active: (influence >= 1) }, { value: 2, active: (influence >= 2) }, { value: 3, active: (influence >= 3) }, { value: 4, active: (influence >= 4) }, { value: 5, active: (influence >= 5) } ]; return context; }
    async _onDropActor(event, data) { if (!this.isEditable) return false; const droppedActor = await fromUuid(data.uuid); if (!droppedActor) return false; if (["npc", "character"].includes(droppedActor.type)) { const npcs = new Set(this.actor.system.npcs || []); if (npcs.has(droppedActor.uuid)) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.NpcAlreadyAdded")); npcs.add(droppedActor.uuid); await this.actor.update({"system.npcs": Array.from(npcs)}); } }
    async _onDropItem(event, data) { if (!this.isEditable) return false; const item = await Item.implementation.fromDropData(data); if (!item) return false; if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(event, data); if (item.type !== "kexborn-world-manager.organization-feature") { return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.OnlyFeaturesAllowed")); } return super._onDropItem(event, data); }
    activateListeners(html) { super.activateListeners(html); if (!this.isEditable) return; html.find('.token-radio').on('click', ev => { ev.preventDefault(); ev.stopPropagation(); const newValue = parseInt($(ev.currentTarget).attr("data-value")); if (!isNaN(newValue)) this.actor.update({"system.influence": newValue}); }); html.find('.token-radio').on('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); this.actor.update({"system.influence": 0}); }); html.find('.item-delete').on('click', async ev => { ev.preventDefault(); const li = $(ev.currentTarget).closest(".item"); const itemId = li.attr("data-item-id"); const uuid = li.attr("data-uuid"); const listType = li.attr("data-list-type"); if (listType === "npc") { const npcs = (this.actor.system.npcs || []).filter(id => id !== uuid); await this.actor.update({"system.npcs": npcs}); } else if (itemId) { this.actor.deleteEmbeddedDocuments("Item", [itemId]); } }); html.find('.item-edit').on('click', async ev => { ev.preventDefault(); const li = $(ev.currentTarget).closest(".item"); const itemId = li.attr("data-item-id"); const uuid = li.attr("data-uuid"); if (uuid) { const doc = await fromUuid(uuid); if (doc) doc.sheet.render(true); } else if (itemId) { const item = this.actor.items.get(itemId); if (item) item.sheet.render(true); } }); }
}

export class OrganizationFeatureSheet extends BaseItemSheet {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["sheet", "item", "organization-feature"], template: "modules/kexborn-world-manager/templates/organization-feature-sheet.html", width: 500, height: 450, scrollY: [".sheet-body"] }); }
    async getData() { const context = await super.getData(); context.theme = game.settings.get("kexborn-world-manager", "theme"); context.system = this.item.system; context.editable = this.isEditable; context.docName = this.item.name; context.enrichedDescription = await SafeEditor.enrichHTML(this.item.system.description || "", { async: true }); return context; }
}

export class FactionSheet extends BaseItemSheet {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["sheet", "item", "faction"], template: "modules/kexborn-world-manager/templates/faction-sheet.html", width: 550, height: 500, tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }], dragDrop: [{ dropSelector: ".sheet-body" }], scrollY: [".sheet-body"] }); }
    async getData() { const context = await super.getData(); context.theme = game.settings.get("kexborn-world-manager", "theme"); context.system = this.item.system; context.editable = this.isEditable; context.docName = this.item.name; context.enrichedDescription = await SafeEditor.enrichHTML(this.item.system.description || "", { async: true }); context.linkedNpcs = []; for (let uuid of (this.item.system.npcs || [])) { const npcActor = fromUuidSync(uuid); if (npcActor) context.linkedNpcs.push({ uuid: npcActor.uuid, img: npcActor.img, name: npcActor.name }); } return context; }
    async _onDrop(event) { if (!this.isEditable) return false; let data; try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch (err) { return false; } if (data && data.type === "Actor") { const droppedActor = await fromUuid(data.uuid); if (droppedActor && ["npc", "character"].includes(droppedActor.type)) { const npcs = new Set(this.item.system.npcs || []); if (npcs.has(droppedActor.uuid)) return ui.notifications.warn(game.i18n.localize("KEXBORN.Notifications.NpcAlreadyAdded")); npcs.add(droppedActor.uuid); return this.item.update({"system.npcs": Array.from(npcs)}); } } return super._onDrop(event); }
    activateListeners(html) { super.activateListeners(html); if (!this.isEditable) return; html.find('.item-delete').on('click', async ev => { ev.preventDefault(); const uuid = $(ev.currentTarget).closest(".item").attr("data-uuid"); const npcs = (this.item.system.npcs || []).filter(id => id !== uuid); await this.item.update({"system.npcs": npcs}); }); html.find('.item-edit').on('click', async ev => { ev.preventDefault(); const uuid = $(ev.currentTarget).closest(".item").attr("data-uuid"); if (uuid) { const doc = await fromUuid(uuid); if (doc) doc.sheet.render(true); } }); }
}

export class CityStructureSheet extends BaseItemSheet {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["sheet", "item", "city-structure"], template: "modules/kexborn-world-manager/templates/city-structure-sheet.html", width: 550, height: 550, tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }], scrollY: [".sheet-body"] }); }
    
    async getData() { 
        const context = await super.getData(); 
        context.theme = game.settings.get("kexborn-world-manager", "theme"); 
        context.system = this.item.system; 
        context.editable = this.isEditable; 
        context.docName = this.item.name; 
        context.enrichedDescription = await SafeEditor.enrichHTML(context.system.description || "", { async: true }); 
        context.safeBonuses = context.system.bonuses || { army: 0, law: 0, culture: 0, wealth: 0, health: 0, science: 0 }; 
        context.safeLevel = context.system.level || 1; 
        context.levels = { "1": "1", "2": "2", "3": "3", "4": "4", "5": "5" }; 
        
        let genresConfig = game.settings.get("kexborn-world-manager", "genresData");
        if (foundry.utils.isEmpty(genresConfig) || !genresConfig["scifi"]) {
            genresConfig = getFallbackGenres();
        }
        
        context.availableGenres = {
            "universal": game.i18n.localize("KEXBORN.Genres.Universal"),
            "fantasy": genresConfig.fantasy?.name || game.i18n.localize("KEXBORN.Genres.Fantasy"),
            "modern": genresConfig.modern?.name || game.i18n.localize("KEXBORN.Genres.Modern"),
            "scifi": genresConfig.scifi?.name || game.i18n.localize("KEXBORN.Genres.Scifi")
        };

        context.safeGenre = context.system.genre || "universal";
        if (!context.availableGenres[context.safeGenre]) context.safeGenre = "universal";

        context.availableCategories = {};
        
        if (context.safeGenre === "universal") {
            context.availableCategories["special"] = game.i18n.localize("KEXBORN.Categories.Special");
        } else {
            let catData = genresConfig[context.safeGenre]?.categories || {};
            for (let [cKey, cData] of Object.entries(catData)) {
                if (!cData.hidden) context.availableCategories[cKey] = cData.label;
            }
        }
        
        context.safeCategory = context.system.category || "special";
        
        if (!context.availableCategories[context.safeCategory]) {
            context.safeCategory = Object.keys(context.availableCategories)[0] || "special";
        }

        return context; 
    }
}

export class SpecialPlaceSheet extends BaseActorSheet {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: ["sheet", "actor", "special-place"], template: "modules/kexborn-world-manager/templates/special-place-sheet.html", width: 700, height: 700, scrollY: [".sheet-body"] }); }
    async getData() { const context = await super.getData(); context.theme = game.settings.get("kexborn-world-manager", "theme"); context.system = this.actor.system; context.editable = this.isEditable; context.docName = this.actor.name; context.enrichedDescription = await SafeEditor.enrichHTML(this.actor.system.description || "", { async: true }); return context; }
}