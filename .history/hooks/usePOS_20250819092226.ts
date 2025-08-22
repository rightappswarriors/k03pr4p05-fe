import { CartItem, Category, Item } from "@/types";
import { useState } from "react";
import { Dimensions } from "react-native";
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Breakpoints for responsive design
const DESKTOP_BREAKPOINT = 1024


export default function usePOS() {
       const [cartItems, setCartItems] = useState<CartItem[]>([]);
       const [items, setItems] = useState<Item[]>([]);
       const [categories, setCategories] = useState<Category[]>([]);
       const [loading, setLoading] = useState(true);
       const [sidebarOpen, setSidebarOpen] = useState(screenWidth >= DESKTOP_BREAKPOINT);
       const [searchQuery, setSearchQuery] = useState('');
       const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
       const [scannerVisible, setScannerVisible] = useState(false);
       const [screenDimensions, setScreenDimensions] = useState({ width: screenWidth, height: screenHeight });
      
}