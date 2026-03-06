const bcrypt = require("bcryptjs");
const SQLiteManager = require("../sqlite-manager");

class User {
  static async createUserTable() {
    await new SQLiteManager().createTable("users", [
      {
        name: "username",
        type: "TEXT UNIQUE NOT NULL",
      },
      {
        name: "password",
        type: "TEXT NOT NULL",
      },
      {
        name: "refreshToken",
        type: "TEXT",
      },
    ]);
  }

  static async getUserByUsername(username) {
    let value = null;
    await new SQLiteManager()
      .selectBy("users", {
        name: "username",
        value: username,
      })
      .then((user) => {
        value = user;
      });
    return value;
  }

  static async getUserById(id) {
    let value = null;
    await new SQLiteManager()
      .selectBy("users", {
        name: "id",
        value: id,
      })
      .then((user) => {
        value = user;
      });
    return value;
  }

  static async createUser(username, password) {
    await new SQLiteManager().insert("users", [
      {
        name: "username",
        value: username,
      },
      {
        name: "password",
        value: await bcrypt.hash(password, 10),
      },
    ]);
  }

  static async updateRefreshToken(userId, token) {
    await new SQLiteManager().update(
      "users",
      [
        {
          name: "refreshToken",
          value: token,
        },
      ],
      [
        {
          name: "id",
          value: userId,
        },
      ]
    );
  }

  static async updatePassword(userId, hashedPassword) {
    await new SQLiteManager().update(
      "users",
      [{ name: "password", value: hashedPassword }],
      [{ name: "id", value: userId }]
    );
  }

  static async getUserByRefreshToken(token) {
    let value = null;
    await new SQLiteManager()
      .selectBy("users", {
        name: "refreshToken",
        value: token,
      })
      .then((user) => {
        value = user;
      });
    return value;
  }
}

module.exports = User;
