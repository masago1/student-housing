import test from "node:test";
import assert from "node:assert/strict";
import { existingListingImages } from "../app/lib/listingForm.mjs";

test("edit preserves all image records and places the saved cover first without mutating data", () => {
  const rows = [{ id: "a", image_url: "a.jpg", storage_path: "owner/a" }, { id: "b", image_url: "b.jpg", storage_path: "owner/b" }];
  const images = existingListingImages(rows, "b.jpg");
  assert.deepEqual(images.map(image => image.id), ["b", "a"]);
  assert.deepEqual(rows.map(image => image.id), ["a", "b"]);
  for (const image of images) {
    assert.equal(image.existing, true); assert.equal(image.file, null);
    assert.equal(image.preview, image.image_url);
    assert.equal(image.storage_path, `owner/${image.id}`);
  }
});

test("legacy cover-only listings remain visible and are not treated as new uploads", () => {
  const images = existingListingImages([], "cover.jpg");
  assert.equal(images.length, 1); assert.equal(images[0].existing, true);
  assert.equal(images[0].file, null); assert.equal(images[0].image_url, "cover.jpg");
  assert.deepEqual(existingListingImages(null, ""), []);
});
