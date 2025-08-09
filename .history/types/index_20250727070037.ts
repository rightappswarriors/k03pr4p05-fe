export interface Item {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
  barcode?: string;
  description?: string;
}

export interface CartItem extends Item {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}