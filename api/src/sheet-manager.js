const { v4: uuidv4 } = require("uuid");
const SQLiteManager = require("./sqlite-manager");
const IO = require("./io");
const NodeExecuter = require("./node-executer");

class SheetManager {
  async create(name) {
    const sheet = {
      id: -1,
      uid: uuidv4(),
      name: name,
      slug: this.slugify(name),
      data: {
        nodes: [],
      },
    };

    await new SQLiteManager()
      .insert("sheets", [
        { name: "name", value: sheet.name },
        { name: "uid", value: sheet.uid },
        { name: "slug", value: sheet.slug },
        { name: "is_active", value: 1 },
        { name: "trigger_type", value: "cron" },
        { name: "cron_schedule", value: "0 * * * *" },
      ])
      .then((lastid) => {
        if (lastid > -1) {
          sheet.id = lastid;
        }
      });

    new IO().write(sheet, `./sheets/${sheet.uid}.json`);
    return sheet;
  }

  save(sheet) {
    new IO().write(sheet, `./sheets/${sheet.uid}.json`);
  }

  async load(uid) {
    let row = null;
    await new SQLiteManager()
      .selectBy("sheets", {
        name: "uid",
        value: uid,
      })
      .then((_row) => {
        row = _row;
      });

    if (!row) return null;
    return new IO().read(`./sheets/${row.uid}.json`);
  }

  async addNode(sheet, node) {
    if (sheet) {
      if (!sheet.data.nodes.find((n) => n.id === node.id)) {
        sheet.data.nodes.push(node);
        this.save(sheet);
      }
    }
  }

  getNodeStore(sheet) {
    const store = [];
    sheet.data.nodes.forEach((node) => {
      store.push(new NodeExecuter(node));
    });
    return store;
  }

  async removeNode(sheet, node) {
    if (sheet) {
      if (sheet.data.nodes.find((n) => n.id === node.id)) {
        sheet.data.nodes = sheet.data.nodes.filter((n) => n.id !== node.id);
        this.save(sheet);
      }
    }
  }

  async createDbTable() {
    const db = new SQLiteManager();
    await db.createTable("sheets", [
      { name: "name", type: "TEXT" },
      { name: "uid", type: "TEXT" },
      { name: "slug", type: "TEXT" },
    ]);
    await db.addColumn("sheets", "is_active", "INTEGER", 1);
    await db.addColumn("sheets", "trigger_type", "TEXT", "'cron'");
    await db.addColumn("sheets", "cron_schedule", "TEXT", "'0 * * * *'");
  }

  slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-");
  }
}

module.exports = SheetManager;
