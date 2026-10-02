import { SpecialPlaceData, SettlementData, FactionData, OrganizationData, CityStructureData, OrganizationFeatureData } from "./data.js";
import { SettlementSheet, FactionSheet, OrganizationSheet, CityStructureSheet, OrganizationFeatureSheet, SpecialPlaceSheet } from "./sheets.js";

// --- БАЗА ЖАНРОВ ПО УМОЛЧАНИЮ ---
function getDefaultGenres() {
    return {
        "fantasy": {
            name: game.i18n.localize("KEXBORN.Genres.Fantasy"),
            categories: {
                "power": { label: game.i18n.localize("KEXBORN.Categories.Power"), default: true, hidden: false },
                "cult": { label: game.i18n.localize("KEXBORN.Categories.Cult"), default: true, hidden: false },
                "entertainment": { label: game.i18n.localize("KEXBORN.Categories.Entertainment"), default: true, hidden: false },
                "education": { label: game.i18n.localize("KEXBORN.Categories.Education"), default: true, hidden: false },
                "industry": { label: game.i18n.localize("KEXBORN.Categories.Industry"), default: true, hidden: false },
                "trade": { label: game.i18n.localize("KEXBORN.Categories.Trade"), default: true, hidden: false },
                "special": { label: game.i18n.localize("KEXBORN.Categories.Special"), default: true, hidden: false }
            }
        },
        "modern": {
            name: game.i18n.localize("KEXBORN.Genres.Modern"),
            categories: {
                "power": { label: game.i18n.localize("KEXBORN.Categories.Power"), default: true, hidden: false },
                "cult": { label: game.i18n.localize("KEXBORN.Categories.Cult"), default: true, hidden: false },
                "entertainment": { label: game.i18n.localize("KEXBORN.Categories.Entertainment"), default: true, hidden: false },
                "education": { label: game.i18n.localize("KEXBORN.Categories.EducationTech"), default: true, hidden: false },
                "industry": { label: game.i18n.localize("KEXBORN.Categories.Industry"), default: true, hidden: false },
                "trade": { label: game.i18n.localize("KEXBORN.Categories.Trade"), default: true, hidden: false },
                "military": { label: game.i18n.localize("KEXBORN.Categories.Military"), default: true, hidden: false },
                "special": { label: game.i18n.localize("KEXBORN.Categories.Special"), default: true, hidden: false }
            }
        },
        "scifi": {
            name: game.i18n.localize("KEXBORN.Genres.Scifi"),
            categories: {
                "power": { label: game.i18n.localize("KEXBORN.Categories.Power"), default: true, hidden: false },
                "cult": { label: game.i18n.localize("KEXBORN.Categories.Cult"), default: true, hidden: false },
                "entertainment": { label: game.i18n.localize("KEXBORN.Categories.Entertainment"), default: true, hidden: false },
                "education": { label: game.i18n.localize("KEXBORN.Categories.EducationTech"), default: true, hidden: false },
                "industry": { label: game.i18n.localize("KEXBORN.Categories.Industry"), default: true, hidden: false },
                "trade": { label: game.i18n.localize("KEXBORN.Categories.Trade"), default: true, hidden: false },
                "military": { label: game.i18n.localize("KEXBORN.Categories.Military"), default: true, hidden: false },
                "special": { label: game.i18n.localize("KEXBORN.Categories.Special"), default: true, hidden: false }
            }
        }
    };
}

// --- КЛАСС ОКНА НАСТРОЕК ЖАНРОВ ---
class GenreSettingsApp extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "kexborn-genres-menu",
            title: "KEXBORN.Settings.GenreMenuTitle",
            template: "modules/kexborn-world-manager/templates/genre-settings.html",
            width: 500, height: "auto", closeOnSubmit: true
        });
    }

    getData() {
        let savedData = game.settings.get("kexborn-world-manager", "genresData");
        if (foundry.utils.isEmpty(savedData)) savedData = foundry.utils.deepClone(getDefaultGenres());
        
        return {
            genres: savedData,
            activeTab: this.activeTab || "fantasy"
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.genre-selector').change(ev => {
            this.activeTab = ev.target.value;
            html.find('.genre-tab').hide();
            html.find(`.genre-tab[data-tab="${this.activeTab}"]`).show();
        });

        html.find('.toggle-hide').click(async ev => {
            const btn = $(ev.currentTarget);
            const hiddenInput = btn.siblings('.hidden-flag');
            const isHidden = hiddenInput.val() === "true";
            hiddenInput.val(!isHidden);
            
            if (!isHidden) {
                btn.find('i').removeClass('fa-eye').addClass('fa-eye-slash').css("color", "#ff6b6b");
                btn.attr("title", game.i18n.localize("KEXBORN.UI.Tooltips.Show"));
            } else {
                btn.find('i').removeClass('fa-eye-slash').addClass('fa-eye').css("color", "#4a5");
                btn.attr("title", game.i18n.localize("KEXBORN.UI.Tooltips.Hide"));
            }
        });

        html.find('.add-cat').click(async ev => {
            const genreId = $(ev.currentTarget).data("genre");
            const savedData = await this._getSubmitData(); 
            
            const newCatId = `custom_${foundry.utils.randomID(6)}`;
            savedData[genreId].categories[newCatId] = { label: game.i18n.localize("KEXBORN.Categories.NewCategory"), default: false, hidden: false };
            
            await game.settings.set("kexborn-world-manager", "genresData", savedData);
            this.render(true);
        });

        html.find('.delete-cat').click(async ev => {
            const genreId = $(ev.currentTarget).data("genre");
            const catId = $(ev.currentTarget).data("category");
            const savedData = await this._getSubmitData();
            
            delete savedData[genreId].categories[catId];
            await game.settings.set("kexborn-world-manager", "genresData", savedData);
            this.render(true);
        });
    }

    async _updateObject(event, formData) {
        const expanded = foundry.utils.expandObject(formData);
        
        delete expanded.activeTab;
        
        const defGenres = getDefaultGenres();
        for (let gKey in expanded) {
            if (defGenres[gKey]) expanded[gKey].name = defGenres[gKey].name;
        }
        
        await game.settings.set("kexborn-world-manager", "genresData", expanded);
        Object.values(ui.windows).forEach(app => {
            if (app.actor && app.actor.type === "kexborn-world-manager.settlement") app.render(false);
        });
    }
}

Hooks.once("init", function() {
    console.log("Kexborn World Manager | Инициализация для Foundry v14...");

    game.settings.register("kexborn-world-manager", "theme", {
        name: "KEXBORN.Settings.ThemeName",
        hint: "KEXBORN.Settings.ThemeHint",
        scope: "world",      
        config: true,        
        type: String,
        choices: {
            "dnd": "KEXBORN.Settings.ThemeDND",
            "dnd-dark": "KEXBORN.Settings.ThemeDNDDark",
            "dark": "KEXBORN.Settings.ThemeDark",
            "scifi-light-blue": "KEXBORN.Settings.ThemeScifiLightBlue",
            "scifi-dark-blue": "KEXBORN.Settings.ThemeScifiDarkBlue",
            "scifi-red": "KEXBORN.Settings.ThemeScifiRed",
            "scifi-green": "KEXBORN.Settings.ThemeScifiGreen",
            "scifi-orange": "KEXBORN.Settings.ThemeScifiOrange",
            "scifi-violet": "KEXBORN.Settings.ThemeScifiViolet",
            "scifi-grey": "KEXBORN.Settings.ThemeScifiGrey",
            "universal": "KEXBORN.Settings.ThemeUniversal",
            "universal-dark": "KEXBORN.Settings.ThemeUniversalDark"
        },
        default: "dnd",      
        onChange: () => {
            Object.values(ui.windows).forEach(app => app.render(false));
        }
    });

    game.settings.register("kexborn-world-manager", "infraView", {
        name: "KEXBORN.Settings.InfraViewName",
        hint: "KEXBORN.Settings.InfraViewHint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "list": "KEXBORN.Settings.InfraViewList",
            "tree": "KEXBORN.Settings.InfraViewTree"
        },
        default: "tree",
        onChange: () => {
            Object.values(ui.windows).forEach(app => {
                if (app.actor && app.actor.type === "kexborn-world-manager.settlement") app.render(false);
            });
        }
    });

    CONFIG.Actor.dataModels["kexborn-world-manager.special-place"] = SpecialPlaceData;
    CONFIG.Actor.dataModels["kexborn-world-manager.settlement"] = SettlementData;
    CONFIG.Actor.dataModels["kexborn-world-manager.organization"] = OrganizationData;

    CONFIG.Item.dataModels["kexborn-world-manager.faction"] = FactionData;
    CONFIG.Item.dataModels["kexborn-world-manager.city-structure"] = CityStructureData;
    CONFIG.Item.dataModels["kexborn-world-manager.organization-feature"] = OrganizationFeatureData;
    
    const DocSheetConfig = foundry.applications.apps.DocumentSheetConfig;

    DocSheetConfig.registerSheet(Actor, "kexborn-world-manager", SettlementSheet, { types: ["kexborn-world-manager.settlement"], makeDefault: true });
    DocSheetConfig.registerSheet(Actor, "kexborn-world-manager", OrganizationSheet, { types: ["kexborn-world-manager.organization"], makeDefault: true });
    DocSheetConfig.registerSheet(Actor, "kexborn-world-manager", SpecialPlaceSheet, { types: ["kexborn-world-manager.special-place"], makeDefault: true });
    
    DocSheetConfig.registerSheet(Item, "kexborn-world-manager", FactionSheet, { types: ["kexborn-world-manager.faction"], makeDefault: true });
    DocSheetConfig.registerSheet(Item, "kexborn-world-manager", CityStructureSheet, { types: ["kexborn-world-manager.city-structure"], makeDefault: true });
    DocSheetConfig.registerSheet(Item, "kexborn-world-manager", OrganizationFeatureSheet, { types: ["kexborn-world-manager.organization-feature"], makeDefault: true });

    game.settings.register("kexborn-world-manager", "enableNpcsTab", {
        name: "KEXBORN.Settings.EnableNpcsTabName", hint: "KEXBORN.Settings.EnableNpcsTabHint",
        scope: "world", config: true, type: Boolean, default: true
    });
    
    game.settings.register("kexborn-world-manager", "enableInfraTab", {
        name: "KEXBORN.Settings.EnableInfraTabName", hint: "KEXBORN.Settings.EnableInfraTabHint",
        scope: "world", config: true, type: Boolean, default: true
    });
    
    game.settings.register("kexborn-world-manager", "showSettlementStats", {
        name: "KEXBORN.Settings.ShowSettlementStatsName", 
        hint: "KEXBORN.Settings.ShowSettlementStatsHint",
        scope: "world", 
        config: true, 
        type: Boolean, 
        default: true,
        onChange: () => {
            Object.values(ui.windows).forEach(app => {
                if (app.actor && app.actor.type === "kexborn-world-manager.settlement") app.render(false);
            });
        }
    });

    game.settings.register("kexborn-world-manager", "enableInfluenceTab", {
        name: "KEXBORN.Settings.EnableInfluenceTabName", hint: "KEXBORN.Settings.EnableInfluenceTabHint",
        scope: "world", config: true, type: Boolean, default: true
    });

    game.settings.registerMenu("kexborn-world-manager", "genreMenu", {
        name: "KEXBORN.Settings.GenreMenuName",
        label: "KEXBORN.Settings.GenreMenuLabel", 
        hint: "KEXBORN.Settings.GenreMenuHint",
        icon: "fas fa-cogs",
        type: GenreSettingsApp,
        restricted: true 
    });

    game.settings.register("kexborn-world-manager", "genresData", {
        scope: "world", config: false, type: Object, default: getDefaultGenres()
    });
});

Hooks.on("updateActor", (actor, changes, options, userId) => {
    if (actor.type !== "kexborn-world-manager.organization") return;
    
    Object.values(ui.windows).forEach(app => {
        if (app.actor && app.actor.type === "kexborn-world-manager.settlement") {
            const orgs = app.actor.system.organizations || [];
            if (orgs.includes(actor.uuid)) app.render(false); 
        }
    });
});