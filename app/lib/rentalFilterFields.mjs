export const filterFields = {
  "Preț": [
    { name: "minPrice", label: "Preț minim (€)", type: "number" },
    { name: "maxPrice", label: "Preț maxim (€)", type: "number" },
  ],
  "Camere": [
    { name: "rooms", label: "Număr de camere", options: [["", "Oricâte"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5+"]] },
  ],
  "Suprafață": [
    { name: "minSurface", label: "Suprafață minimă (m²)", type: "number" },
    { name: "maxSurface", label: "Suprafață maximă (m²)", type: "number" },
  ],
  "Mobilat": [
    { name: "furnished", label: "Mobilat", options: [["", "Oricare"], ["yes", "Da"], ["no", "Nu"]] },
  ],
  "Mai multe": [
    { name: "zone", label: "Cartier", options: [["", "Toate cartierele"]] },
    { name: "bedrooms", label: "Dormitoare", options: [["", "Oricâte"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4+"]] },
    { name: "bathrooms", label: "Băi", options: [["", "Oricâte"], ["1", "1"], ["2", "2"], ["3", "3+"]] },
    { name: "propertyType", label: "Tip proprietate", options: [["", "Toate"], ["apartment", "Apartament"], ["studio", "Garsonieră"], ["house", "Casă"], ["room", "Cameră"]] },
    { name: "listingType", label: "Tip închiriere", options: [["", "Toate"], ["entire", "Locuință întreagă"], ["room", "Cameră"]] },
    { name: "availableFrom", label: "Disponibilitate — disponibil până la", type: "date" },
    { name: "sort", label: "Sortare", options: [["newest", "Cele mai noi"], ["price_asc", "Preț crescător"], ["price_desc", "Preț descrescător"], ["surface_desc", "Suprafață descrescătoare"]] },
  ],
};
