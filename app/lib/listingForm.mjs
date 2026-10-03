// Existing image records stay intact; the saved cover is always the first preview.
export function existingListingImages(rows = [], cover = "") {
  const images = (rows || []).map(image => ({ ...image, existing: true, file: null, preview: image.image_url }));
  const coverIndex = images.findIndex(image => image.image_url === cover);
  if (coverIndex > 0) images.unshift(...images.splice(coverIndex, 1));
  else if (cover && coverIndex === -1) images.unshift({ id: null, existing: true, file: null, image_url: cover, preview: cover, storage_path: null });
  return images;
}
export function formatListingDate(isoDate) {
  return isoDate ? isoDate.split("-").reverse().join("/") : "";
}

export const legacyHeatingLabels = {
  central: "Centrală proprie", district: "Termoficare", electric: "Încălzire electrică",
  gas: "Gaz", other: "Altă sursă",
};
