const fs = require("fs");
const path = require("path");

class ToolLoader {
  isClass(fn) {
    return (
      typeof fn === "function" &&
      Object.prototype.toString.call(fn) === "[object Function]" &&
      /^\s*class\s+/.test(fn.toString())
    );
  }

  loadClassesFromFolder(folderPath) {
    const classes = [];
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively scan subfolders
        const nestedClasses = this.loadClassesFromFolder(fullPath);
        classes.push(...nestedClasses);
      } else if (file.endsWith(".js")) {
        try {
          const module = require(fullPath);

          // If module is a class
          if (this.isClass(module)) {
            classes.push(module);
          }
        } catch (err) {
          console.error(`Error requiring file: ${fullPath}`, err);
        }
      }
    }

    return classes;
  }

  load(folder_path) {
    // Usage
    const classFolderPath = path.join(__dirname, folder_path);
    const loadedClasses = this.loadClassesFromFolder(classFolderPath);

    // Now you can instantiate any class dynamically
    // for (const Class of loadedClasses) {
    //   const instance = new Class();
    //   console.log(`Instantiated: ${Class.name}`);
    //   // You could call methods here or check for specific ones
    // }

    return loadedClasses;
  }
}

module.exports = ToolLoader;
