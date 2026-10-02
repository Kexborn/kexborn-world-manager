const { HTMLField, SchemaField, NumberField, StringField, BooleanField, ArrayField } = foundry.data.fields;

export class SpecialPlaceData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new HTMLField({ initial: "" }),
            banner: new StringField({ initial: "" }),
            attributes: new SchemaField({
                hp: new SchemaField({ value: new NumberField({ initial: 1, integer: true }), max: new NumberField({ initial: 1, integer: true }) })
            })
        };
    }
}

export class SettlementData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      banner: new StringField({ initial: "icons/svg/castle.svg" }),
      level: new NumberField({ initial: 1, min: 1, max: 5, integer: true }),
      genre: new StringField({ initial: "fantasy" }),      
      organizations: new ArrayField(new StringField()), 
      npcs: new ArrayField(new StringField()), 
      attributes: new SchemaField({
        hp: new SchemaField({ value: new NumberField({ initial: 1, integer: true }), max: new NumberField({ initial: 1, integer: true }) })
      }),
      stats: new SchemaField({
        army: new NumberField({ initial: 0, integer: true }),
        law: new NumberField({ initial: 0, integer: true }),
        culture: new NumberField({ initial: 0, integer: true }),
        wealth: new NumberField({ initial: 0, integer: true }),
        health: new NumberField({ initial: 0, integer: true }), 
        science: new NumberField({ initial: 0, integer: true })
      })
    };
  }
}

export class OrganizationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      features: new HTMLField({ initial: "" }),
      npcs: new ArrayField(new StringField()), 
      influence: new NumberField({ initial: 0, integer: true }),
      stats: new SchemaField({
        attack: new NumberField({ initial: 0, integer: true }),
        resources: new NumberField({ initial: 0, integer: true }),
        vitality: new NumberField({ initial: 0, integer: true })
      }),
      subtypes: new SchemaField({
        strongmen: new BooleanField({ initial: false }),
        agility: new BooleanField({ initial: false }),
        sages: new BooleanField({ initial: false })
      }),
      attributes: new SchemaField({
        hp: new SchemaField({ value: new NumberField({ initial: 1, integer: true }), max: new NumberField({ initial: 1, integer: true }) })
      })
    };
  }
}

export class OrganizationFeatureData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { description: new HTMLField({ initial: "" }) };
  }
}

export class FactionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      influence: new NumberField({ initial: 0, min: 0, max: 10, integer: true }),
      npcs: new ArrayField(new StringField()) 
    };
  }
}

export class CityStructureData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            description: new HTMLField({ initial: "" }),
            genre: new StringField({ initial: "universal" }),
            category: new StringField({ initial: "power" }),
            level: new NumberField({ initial: 1, min: 1, max: 5, integer: true }),
            priority: new NumberField({ initial: 0, integer: true }), 
            bonuses: new SchemaField({
                army: new NumberField({ initial: 0 }),
                law: new NumberField({ initial: 0 }),
                culture: new NumberField({ initial: 0 }),
                wealth: new NumberField({ initial: 0 }),
                health: new NumberField({ initial: 0 }), 
                science: new NumberField({ initial: 0 })
            }),
            prerequisites: new ArrayField(new StringField()) 
        };
    }
}