import test from "node:test";
import assert from "node:assert/strict";
import { parseReadingSize, saveReadingSize, READING_PREF_KEY } from "./reading-preferences.ts";

test("reading sizes reject untrusted data and persist only valid choices", () => {
  assert.equal(parseReadingSize(null), "standard");
  assert.equal(parseReadingSize("anything"), "standard");
  assert.equal(parseReadingSize("large"), "large");
  const data = new Map<string,string>();
  const storage = {
    getItem(k:string){return data.get(k)??null;},
    setItem(k:string,v:string){data.set(k,v);},
    removeItem(k:string){data.delete(k);},
  };
  assert.equal(saveReadingSize(storage, "extra-large"), true);
  assert.equal(storage.getItem(READING_PREF_KEY), "extra-large");
  assert.equal(saveReadingSize(storage, "secret" as "standard"), false);
});

test("reader controls degrade safely with browser storage disabled", () => {
  const blocked={ getItem(){return null;},setItem(){throw Error("no access");},removeItem(){} };
  assert.equal(saveReadingSize(blocked, "large"), false);
});
