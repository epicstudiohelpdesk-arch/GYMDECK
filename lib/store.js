import fs from "fs";
import path from "path";

const DATA_DIR = process.env.GYMDECK_DATA_DIR || path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class Store {
  constructor(filename) {
    this.filePath = path.join(DATA_DIR, filename);
    this.cache = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.cache.set(k, v);
        }
      }
    } catch (err) {
      console.error(`Store: failed to load ${this.filePath}:`, err.message);
    }
  }

  flush() {
    try {
      const obj = Object.fromEntries(this.cache);
      const tmp = this.filePath + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf-8");
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error(`Store: failed to flush ${this.filePath}:`, err.message);
    }
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
    this.flush();
  }

  delete(key) {
    this.cache.delete(key);
    this.flush();
  }

  values() {
    return Array.from(this.cache.values());
  }

  find(predicate) {
    return Array.from(this.cache.values()).find(predicate);
  }

  entries() {
    return this.cache.entries();
  }

  has(key) {
    return this.cache.has(key);
  }
}

export const userStore = new Store("users.json");
export const otpStore = new Store("otp.json");
