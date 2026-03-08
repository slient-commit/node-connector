const sqlite3 = require("sqlite3").verbose();
const dbname = require("../config").dbPath;

// Only allow safe SQL identifiers: letters, digits, underscores
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Allowed tokens in column type definitions (e.g. "TEXT UNIQUE NOT NULL")
const ALLOWED_TYPE_TOKENS = new Set([
  "TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC",
  "NOT", "NULL", "UNIQUE", "PRIMARY", "KEY",
  "AUTOINCREMENT", "DEFAULT", "CHECK", "COLLATE",
]);

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Invalid SQL identifier for ${label}: "${value}"`);
  }
}

function assertColumnType(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid column type: "${value}"`);
  }
  const tokens = value.trim().toUpperCase().split(/\s+/);
  for (const token of tokens) {
    if (!ALLOWED_TYPE_TOKENS.has(token)) {
      throw new Error(`Invalid column type token: "${token}" in "${value}"`);
    }
  }
}

class SQLiteManager {
  async openConnection() {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(dbname, (err) => {
        if (err) {
          console.error("Error opening database", err.message);
          resolve(undefined);
        } else {
          resolve(db);
        }
      });
    });
  }

  closeConnection(db) {
    // Close the database connection when done
    db.close((err) => {
      if (err) {
        console.error("Error closing database", err.message);
      }
    });
  }

  async createTable(name, columns = []) {
    assertIdentifier(name, "table name");
    columns.forEach((col) => {
      assertIdentifier(col.name, "column name");
      assertColumnType(col.type);
    });
    return new Promise(async (resolve) => {
      await this.openConnection().then((db) => {
        if (!db) return resolve(false);
        let query = `CREATE TABLE IF NOT EXISTS "${name}" (id INTEGER PRIMARY KEY AUTOINCREMENT,`;
        columns.forEach((column) => {
          query += `"${column.name}" ${column.type},`;
        });
        query = query.substring(0, query.length - 1);
        query += ");";
        db.run(query, (err) => {
          if (err) {
            console.error("Error creating table", err.message);
          }
          db.close();
          resolve(true);
        });
      });
    });
  }

  async selectBy(table_name, column = undefined) {
    assertIdentifier(table_name, "table name");
    return new Promise(async (resolve) => {
      if (!column) resolve(null);
      assertIdentifier(column.name, "column name");
      await this.openConnection().then((db) => {
        if (!db) resolve(null);
        db.get(
          `SELECT * FROM "${table_name}" WHERE "${column.name}" = ?`,
          [column.value],
          (err, row) => {
            if (err) {
              console.error("Database error:", err.message);
            }
            resolve(row);

            // Close connection after query
            db.close();
          }
        );
      });
    });
  }

  async selectAllBy(table_name, column = undefined, orderBy = null, limit = null) {
    assertIdentifier(table_name, "table name");
    return new Promise(async (resolve) => {
      if (!column) resolve([]);
      assertIdentifier(column.name, "column name");
      await this.openConnection().then((db) => {
        if (!db) resolve([]);
        let query = `SELECT * FROM "${table_name}" WHERE "${column.name}" = ?`;
        if (orderBy) {
          const parts = orderBy.trim().split(/\s+/);
          const col = parts[0];
          const dir = parts[1] ? parts[1].toUpperCase() : null;
          assertIdentifier(col, "orderBy column");
          if (dir && dir !== "ASC" && dir !== "DESC") {
            throw new Error(`Invalid ORDER BY direction: "${dir}"`);
          }
          query += ` ORDER BY "${col}"${dir ? " " + dir : ""}`;
        }
        if (limit) {
          const parsedLimit = parseInt(limit, 10);
          if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
            throw new Error(`Invalid LIMIT value: "${limit}"`);
          }
          query += ` LIMIT ${parsedLimit}`;
        }
        db.all(query, [column.value], (err, rows) => {
          if (err) {
            console.error("Database error:", err.message);
          }
          resolve(rows || []);
          db.close();
        });
      });
    });
  }

  async insert(table_name, columns = []) {
    assertIdentifier(table_name, "table name");
    columns.forEach((col) => assertIdentifier(col.name, "column name"));
    return new Promise(async (resolve) => {
      await this.openConnection().then((db) => {
        if (!db) resolve(-1);
        let __columns = "";
        let __values_spaces = "";
        let values = [];
        columns.forEach((column) => {
          __columns += `"${column.name}",`;
          __values_spaces += "?,";
          values.push(column.value);
        });
        __columns = __columns.substring(0, __columns.length - 1);
        __values_spaces = __values_spaces.substring(
          0,
          __values_spaces.length - 1
        );

        let query = `INSERT INTO "${table_name}" (${__columns}) VALUES (${__values_spaces})`;
        let stmt = db.prepare(query);
        stmt.run(values, function (err) {
          if (err) {
            console.error(`Error inserting to ${table_name}:`, err.message);
            stmt.finalize();
            db.close();
            resolve(-1);
            return;
          }
          stmt.finalize();
          db.close();
          resolve(this.lastID);
        });
      });
    });
  }

  async update(table_name, columns_to_update = [], where_columns = []) {
    assertIdentifier(table_name, "table name");
    columns_to_update.forEach((col) => assertIdentifier(col.name, "column name"));
    where_columns.forEach((col) => assertIdentifier(col.name, "column name"));
    return new Promise(async (resolve) => {
      await this.openConnection().then((db) => {
        if (!db) resolve(-1);
        let __columns = "";
        let __where = "";
        let values = [];
        columns_to_update.forEach((column) => {
          __columns += `"${column.name}" = ?, `;
          values.push(column.value);
        });

        where_columns.forEach((column) => {
          __where += `"${column.name}" = ? AND `;
          values.push(column.value);
        });
        __columns = __columns.substring(0, __columns.length - 2);
        __where = __where.substring(0, __where.length - 5);

        let query = `UPDATE "${table_name}" SET ${__columns} WHERE ${__where}`;
        let stmt = db.prepare(query);
        stmt.run(values, function (err) {
          if (err) {
            console.error(`Error updating ${table_name}:`, err.message);
            stmt.finalize();
            db.close();
            resolve(-1);
            return;
          }
          stmt.finalize();
          db.close();
          resolve(this.lastID);
        });
      });
    });
  }

  async addColumn(tableName, columnName, columnType, defaultValue = null) {
    assertIdentifier(tableName, "table name");
    assertIdentifier(columnName, "column name");
    assertColumnType(columnType);
    return new Promise(async (resolve) => {
      await this.openConnection().then((db) => {
        if (!db) return resolve(false);
        let query = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnType}`;
        if (defaultValue !== null) {
          query += ` DEFAULT ?`;
          db.run(query, [defaultValue], (err) => {
            if (err && !err.message.includes("duplicate column name")) {
              console.error("Error adding column:", err.message);
            }
            db.close();
            resolve(true);
          });
        } else {
          db.run(query, (err) => {
            if (err && !err.message.includes("duplicate column name")) {
              console.error("Error adding column:", err.message);
            }
            db.close();
            resolve(true);
          });
        }
      });
    });
  }

  async select(table_name) {
    assertIdentifier(table_name, "table name");
    return new Promise(async (resolve) => {
      await this.openConnection().then((db) => {
        if (!db) resolve([]);
        db.all(`SELECT * FROM "${table_name}"`, [], (err, rows) => {
          db.close();
          if (err) {
            console.error("Error querying users:", err.message);
          }
          resolve(rows);
        });
      });
    });
  }
}

module.exports = SQLiteManager;
