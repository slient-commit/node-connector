const { v4: uuidv4 } = require("uuid");
const SQLiteManager = require("./sqlite-manager");
const IO = require("./io");
const NodeExecuter = require("./node-executer");
const { encrypt, decrypt, isEncrypted } = require("./crypto-utils");

// Registry of secret param aliases per plugin className.
// Ensures old sheets (saved before secret:true existed) get annotated correctly.
const SECRET_PARAMS = {
  SSHTool: ["ssh_password"],
  FTPTool: ["password"],
  SendEmail: ["password"],
};

class SheetManager {
  // Annotate params with secret:true based on the registry
  _annotateSecretParams(sheet) {
    if (sheet && sheet.data && sheet.data.nodes) {
      for (const node of sheet.data.nodes) {
        if (!node.params || !node.className) continue;
        const secretAliases = SECRET_PARAMS[node.className];
        if (!secretAliases) continue;
        for (const param of node.params) {
          if (!param) continue;
          if (secretAliases.includes(param.alias)) {
            param.secret = true;
          }
        }
      }
    }
  }

  // Encrypt secret param values (returns a deep clone, does NOT mutate input)
  _encryptSecretParams(sheet) {
    const copy = JSON.parse(JSON.stringify(sheet));
    this._annotateSecretParams(copy);
    if (copy.data && copy.data.nodes) {
      for (const node of copy.data.nodes) {
        if (!node.params) continue;
        for (const param of node.params) {
          if (!param) continue;
          if (param.secret && param.value && !isEncrypted(param.value)) {
            param.value = encrypt(param.value);
          }
        }
      }
    }
    return copy;
  }

  // Decrypt secret param values (mutates in place — called on freshly loaded data)
  _decryptSecretParams(sheet) {
    this._annotateSecretParams(sheet);
    if (sheet && sheet.data && sheet.data.nodes) {
      for (const node of sheet.data.nodes) {
        if (!node.params) continue;
        for (const param of node.params) {
          if (!param) continue;
          if (param.secret && isEncrypted(param.value)) {
            try {
              param.value = decrypt(param.value);
            } catch (_err) {
              // If decryption fails (e.g. key changed), leave value as-is
              param.value = "";
            }
          }
        }
      }
    }
    return sheet;
  }

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
    const encrypted = this._encryptSecretParams(sheet);
    new IO().write(encrypted, `./sheets/${sheet.uid}.json`);
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
    const sheet = new IO().read(`./sheets/${row.uid}.json`);
    return this._decryptSecretParams(sheet);
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
