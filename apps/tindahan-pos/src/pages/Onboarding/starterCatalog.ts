/**
 * A curated starter list of common sari-sari store items, grouped by
 * category, with typical retail prices a new store can adjust later.
 * No barcodes — real UPC/EAN codes aren't something we can source here,
 * and fabricating ones risks colliding with a product the store scans
 * in for real later.
 */
export interface StarterCatalogItem {
  name: string;
  price: number;
}

export interface StarterCatalogCategory {
  key: string;
  label: string;
  items: StarterCatalogItem[];
}

export const STARTER_CATALOG: StarterCatalogCategory[] = [
  {
    key: "noodles",
    label: "Noodles",
    items: [
      { name: "Lucky Me Pancit Canton", price: 18 },
      { name: "Lucky Me Instant Mami", price: 12 },
      { name: "Payless Instant Noodles", price: 8 },
      { name: "Nissin Cup Noodles", price: 25 },
      { name: "Lucky Me Beef na Beef", price: 12 },
      { name: "Quickchow Sotanghon", price: 10 },
    ],
  },
  {
    key: "drinks",
    label: "Drinks",
    items: [
      { name: "Coke Sakto 200ml", price: 20 },
      { name: "Sprite Sakto 200ml", price: 20 },
      { name: "Royal Sakto 200ml", price: 20 },
      { name: "C2 Green Tea", price: 20 },
      { name: "Nescafe 3-in-1", price: 8 },
      { name: "Kopiko Brown", price: 8 },
      { name: "Milo Sachet", price: 10 },
      { name: "Gatorade", price: 30 },
    ],
  },
  {
    key: "snacks",
    label: "Snacks",
    items: [
      { name: "Skyflakes Crackers", price: 9 },
      { name: "Piattos", price: 15 },
      { name: "Nova Multigrain", price: 15 },
      { name: "Chippy", price: 15 },
      { name: "Boy Bawang", price: 12 },
      { name: "Clover Chips", price: 12 },
      { name: "Maxx Candy", price: 1 },
      { name: "Storck Chox", price: 5 },
      { name: "Choc Nut", price: 6 },
    ],
  },
  {
    key: "canned",
    label: "Canned Goods",
    items: [
      { name: "Century Tuna Flakes in Oil", price: 28 },
      { name: "555 Sardines", price: 22 },
      { name: "Argentina Corned Beef", price: 35 },
      { name: "Ligo Sardines", price: 20 },
      { name: "Purefoods Corned Beef", price: 40 },
      { name: "Del Monte Pineapple Juice", price: 45 },
    ],
  },
  {
    key: "household",
    label: "Household",
    items: [
      { name: "Tide Bar 125g", price: 24 },
      { name: "Safeguard Soap", price: 20 },
      { name: "Palmolive Shampoo Sachet", price: 8 },
      { name: "Downy Sachet", price: 8 },
      { name: "Joy Dishwashing Liquid Sachet", price: 8 },
      { name: "Colgate Toothpaste Small", price: 22 },
    ],
  },
  {
    key: "sachets",
    label: "Sachets",
    items: [
      { name: "Bear Brand Powdered Milk", price: 33 },
      { name: "Alaska Condensada", price: 15 },
      { name: "Datu Puti Vinegar Sachet", price: 5 },
      { name: "Silver Swan Soy Sauce Sachet", price: 5 },
      { name: "Knorr Sinigang Mix", price: 8 },
      { name: "Ajinomoto Sachet", price: 5 },
    ],
  },
];
