import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MENU_CATEGORIES, MENU_CATEGORY_COLORS } from "../../constants/order";
import AppLoader from "../../components/AppLoader";
import { toast } from "../../components/Toast";
import { getCategories, getCurrentUser } from "../../lib/firebase";
import { addFavorite, getMenuItems, onMenuItemsUpdate, removeFavorite, type MenuItem } from "../../lib/firebase-store";

const DEFAULT_CATEGORIES = [
  { label: "All", value: "", color: "#F25C05" },
  ...MENU_CATEGORIES.map((c) => ({ label: c, value: c, color: MENU_CATEGORY_COLORS[c] || "#F25C05" })),
];

const CART_KEY = "@foodfix_cart";

export default function MenuScreen() {
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 3 : 2;
  const CARD_SIZE = Math.min(260, Math.floor((width - 32 - 12 * (columns - 1)) / columns));
  const CARD_IMAGE_H = Math.round(CARD_SIZE * 0.7);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [cartMap, setCartMap] = useState<Record<string, number>>({});

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus effect intentionally has no deps (screen-entry refresh).
  useFocusEffect(useCallback(() => {
    fetchMenu();
    loadCartMap();
  }, []));

  async function loadCartMap() {
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      if (raw) {
        const parsed: { menu_item_id: string; quantity: number }[] = JSON.parse(raw);
        const map: Record<string, number> = {};
        parsed.forEach((c) => {
          map[c.menu_item_id] = c.quantity;
        });
        setCartMap(map);
      } else {
        setCartMap({});
      }
    } catch {
      setCartMap({});
    }
  }

  // Real-time listener for menu updates so sold out triggers immediately
  useEffect(() => {
    const unsub = onMenuItemsUpdate((all) => {
      let filtered = all;
      if (activeCategory) {
        filtered = filtered.filter((i) => i.category === activeCategory);
      }
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        filtered = filtered.filter(
          (i) => i.name.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s)
        );
      }
      const today = new Date().toISOString().slice(0, 10);
      filtered = filtered.filter((i) => !i.batch_date || i.batch_date === today);
      setItems(filtered);
    });
    return () => unsub?.();
  }, [activeCategory, search]);

  const totalCartCount = Object.values(cartMap).reduce((sum, q) => sum + q, 0);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchMenu(), 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMenu(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [data, dynamicCategories] = await Promise.all([
        getMenuItems({
          category: activeCategory || undefined,
          search: search || undefined,
          availableOnly: false,
          autoExpireDaily: true,
        }),
        getCategories(),
      ]);

      const categoryNames = Array.from(
        new Set([
          ...MENU_CATEGORIES,
          ...dynamicCategories.map((c) => c.name).filter(Boolean),
          ...data.map((item) => item.category).filter(Boolean),
        ]),
      );

      const categoryColorMap = new Map<string, string>();
      dynamicCategories.forEach((c) => {
        if (c.name) {
          categoryColorMap.set(c.name, c.color || MENU_CATEGORY_COLORS[c.name] || "#F25C05");
        }
      });

      setCategoryOptions([
        { label: "All", value: "", color: "#F25C05" },
        ...categoryNames.map((name) => ({
          label: name,
          value: name,
          color: categoryColorMap.get(name) || MENU_CATEGORY_COLORS[name] || "#F25C05",
        })),
      ]);

      if (activeCategory && !categoryNames.includes(activeCategory)) {
        setActiveCategory("");
      }

      setItems(data);
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
    if (!silent) setLoading(false);
  }

  function handleOpenModal(item: MenuItem) {
    const isUnlimitedStock = item.is_made_to_order || item.batch_date;
    if (!item.available || (!isUnlimitedStock && item.stock_quantity <= 0)) return;
    setSelectedItem(item);
    const inCartQty = cartMap[item.id] || 0;
    setSelectedQty(inCartQty > 0 ? inCartQty : 1);
  }

  async function handleAddToCart() {
    if (!selectedItem) return;
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      let cart: { menu_item_id: string; name: string; price: number; quantity: number; stock_quantity: number; image_url?: string }[] = raw ? JSON.parse(raw) : [];
      const existingIndex = cart.findIndex((c) => c.menu_item_id === selectedItem.id);
      const isUnlimitedStock = selectedItem.is_made_to_order || selectedItem.batch_date;

      if (!isUnlimitedStock && selectedQty > selectedItem.stock_quantity) {
        Alert.alert("Stock Limit", `Only ${selectedItem.stock_quantity} left in stock.`);
        return;
      }

      const wasInCart = existingIndex >= 0;
      if (wasInCart) {
        cart[existingIndex].quantity = selectedQty;
      } else {
        cart.push({
          menu_item_id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price,
          quantity: selectedQty,
          stock_quantity: selectedItem.stock_quantity,
          image_url: selectedItem.image_url,
        });
      }

      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
      await loadCartMap();
      setSelectedItem(null);
      toast.success(wasInCart ? `Updated ${selectedItem.name} in cart` : `${selectedItem.name} added to cart`);
    } catch (e) {
      console.error("Cart error:", e);
      toast.error("Couldn't update cart. Please try again.");
    }
  }

  async function handleRemoveFromCart() {
    if (!selectedItem) return;
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      let cart: { menu_item_id: string; name: string; price: number; quantity: number; stock_quantity: number; image_url?: string }[] = raw ? JSON.parse(raw) : [];
      cart = cart.filter((c) => c.menu_item_id !== selectedItem.id);
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
      await loadCartMap();
      const removedName = selectedItem.name;
      setSelectedItem(null);
      toast.success(`Removed ${removedName} from cart`);
    } catch (e) {
      console.error("Cart remove error:", e);
      toast.error("Couldn't remove item from cart.");
    }
  }

  async function toggleFav(itemId: string) {
    const user = getCurrentUser();
    if (!user) return Alert.alert("Sign in", "Please sign in to save favorites.");
    try {
      if (favIds.has(itemId)) {
        await removeFavorite(user.uid, itemId);
        setFavIds((prev) => { const n = new Set(prev); n.delete(itemId); return n; });
      } else {
        await addFavorite(user.uid, itemId);
        setFavIds((prev) => new Set(prev).add(itemId));
      }
    } catch (e) {
      console.error("Fav error:", e);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.appTitle}>FOODFIX</Text>
            <Text style={styles.appSub}>Filipino Food Ordering</Text>
          </View>
        </View>

        {/* TOP SEARCH & ACTION ROW (Shopee style) */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#aaa" style={{ marginLeft: 14 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search food..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={{ marginRight: 10 }}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => router.push("/(tabs)/scan")}
            accessibilityLabel="Shopping Cart"
          >
            <Ionicons name="cart-outline" size={24} color="#2E1A06" />
            {totalCartCount > 0 && (
              <View style={styles.headerActionBadge}>
                <Text style={styles.headerActionBadgeText}>
                  {totalCartCount > 99 ? "99+" : totalCartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => router.push("/(tabs)/chat")}
            accessibilityLabel="Customer Chat"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#2E1A06" />
          </TouchableOpacity>
        </View>

        {/* CATEGORY FILTER - DROPDOWN TRIGGER */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <TouchableOpacity 
            style={styles.dropdownBtn} 
            onPress={() => setDropdownVisible(true)}
          >
            <Text style={styles.dropdownText}>
              {activeCategory ? `Category: ${activeCategory}` : "All Categories"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#2E1A06" />
          </TouchableOpacity>
        </View>

        {/* MENU GRID */}
        {loading ? (
          <AppLoader full={false} />
        ) : items.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="fast-food-outline" size={48} color="#ccc" />
            <Text style={styles.noResults}>No food items found.</Text>
          </View>
        ) : (
          <View>
            {/* Daily Menu */}
            {items.filter(i => !i.is_made_to_order).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  {activeCategory ? `Daily Menu - ${activeCategory}` : "Daily Menu"}
                </Text>
                <View style={styles.grid}>
                  {items.filter(i => !i.is_made_to_order).map((item) => {
                    const color = MENU_CATEGORY_COLORS[item.category] || "#F25C05";
                    const isUnlimitedStock = item.is_made_to_order || item.batch_date;
                    const unavailable = !item.available || (!isUnlimitedStock && item.stock_quantity <= 0);
                    return (
                      <View key={item.id} style={[styles.menuCard, { width: CARD_SIZE }, unavailable && styles.menuCardUnavailable]}>
                        {item.image_url ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={[styles.menuImage, { height: CARD_IMAGE_H }]}
                            contentFit="cover"
                            transition={300}
                            cachePolicy="none"
                            recyclingKey={item.id}
                          />
                        ) : (
                          <View style={[styles.imagePlaceholder, { height: CARD_IMAGE_H, backgroundColor: color + "22" }]}>
                            <Ionicons name="restaurant-outline" size={36} color="#ccc" />
                          </View>
                        )}

                        {/* Sold out overlay banner */}
                        {unavailable && (
                          <View style={styles.soldOutOverlay}>
                            <View style={styles.soldOutBadge}>
                              <Text style={styles.soldOutBadgeText}>
                                {!item.available ? "UNAVAILABLE" : "SOLD OUT"}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Category tag */}
                        <View style={[styles.catTag, { backgroundColor: color }]}>
                          <Text style={styles.catTagText}>{item.category}</Text>
                        </View>

                        {/* Favorite button */}
                        <TouchableOpacity style={styles.favBtn} onPress={() => toggleFav(item.id)}>
                          <Ionicons name={favIds.has(item.id) ? "heart" : "heart-outline"}
                            size={18} color={favIds.has(item.id) ? "#E74C3C" : "#999"} />
                        </TouchableOpacity>

                        <View style={styles.cardBottom}>
                          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                          {item.description ? (
                            <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                          ) : null}
                          <View style={styles.priceRow}>
                            <Text style={styles.price}>P{item.price?.toFixed(2)}</Text>
                            {!item.available ? (
                              <Text style={[styles.stock, styles.stockUnavailable]}>Unavailable</Text>
                            ) : isUnlimitedStock ? null : (
                              <Text style={styles.stock}>
                                {item.stock_quantity > 0 ? `${item.stock_quantity} left` : "Sold out"}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.addBtn,
                              unavailable && styles.addBtnDisabled,
                              !unavailable && cartMap[item.id] > 0 && styles.addBtnInCart,
                            ]}
                            onPress={() => handleOpenModal(item)}
                            disabled={unavailable}
                          >
                            <Ionicons name={cartMap[item.id] > 0 ? "create-outline" : "cart-outline"} size={14} color="#fff" />
                            <Text style={styles.addBtnText}>
                              {unavailable
                                ? "Unavailable"
                                : cartMap[item.id] > 0
                                ? `In Cart (${cartMap[item.id]})`
                                : "Add to Cart"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* Made to Order */}
            {items.filter(i => i.is_made_to_order).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  {activeCategory ? `Made to Order - ${activeCategory}` : "Made to Order"}
                </Text>
                <View style={styles.grid}>
                  {items.filter(i => i.is_made_to_order).map((item) => {
                    const color = MENU_CATEGORY_COLORS[item.category] || "#F25C05";
                    const unavailable = !item.available;
                    return (
                      <View key={item.id} style={[styles.menuCard, { width: CARD_SIZE }, unavailable && styles.menuCardUnavailable]}>
                        {item.image_url ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={[styles.menuImage, { height: CARD_IMAGE_H }]}
                            contentFit="cover"
                            transition={300}
                            cachePolicy="none"
                            recyclingKey={item.id}
                          />
                        ) : (
                          <View style={[styles.imagePlaceholder, { height: CARD_IMAGE_H, backgroundColor: color + "22" }]}>
                            <Ionicons name="restaurant-outline" size={36} color="#ccc" />
                          </View>
                        )}

                        {/* Sold out overlay banner */}
                        {unavailable && (
                          <View style={styles.soldOutOverlay}>
                            <View style={styles.soldOutBadge}>
                              <Text style={styles.soldOutBadgeText}>UNAVAILABLE</Text>
                            </View>
                          </View>
                        )}

                        {/* Category tag */}
                        <View style={[styles.catTag, { backgroundColor: color }]}>
                          <Text style={styles.catTagText}>{item.category}</Text>
                        </View>

                        {/* Favorite button */}
                        <TouchableOpacity style={styles.favBtn} onPress={() => toggleFav(item.id)}>
                          <Ionicons name={favIds.has(item.id) ? "heart" : "heart-outline"}
                            size={18} color={favIds.has(item.id) ? "#E74C3C" : "#999"} />
                        </TouchableOpacity>

                        <View style={styles.cardBottom}>
                          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                          {item.description ? (
                            <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                          ) : null}
                          <View style={styles.priceRow}>
                            <Text style={styles.price}>P{item.price?.toFixed(2)}</Text>
                            {!item.available && (
                              <Text style={[styles.stock, styles.stockUnavailable]}>Unavailable</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.addBtn,
                              unavailable && styles.addBtnDisabled,
                              !unavailable && cartMap[item.id] > 0 && styles.addBtnInCart,
                            ]}
                            onPress={() => handleOpenModal(item)}
                            disabled={unavailable}
                          >
                            <Ionicons name={cartMap[item.id] > 0 ? "create-outline" : "cart-outline"} size={14} color="#fff" />
                            <Text style={styles.addBtnText}>
                              {unavailable
                                ? "Unavailable"
                                : cartMap[item.id] > 0
                                ? `In Cart (${cartMap[item.id]})`
                                : "Add to Cart"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Category Dropdown Modal */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={() => setDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
          <View style={styles.dropdownModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {categoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.dropdownOption, activeCategory === cat.value && { backgroundColor: "#FFF5EE" }]}
                  onPress={() => {
                    setActiveCategory(cat.value);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, activeCategory === cat.value && { color: "#F25C05", fontWeight: "bold" }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDropdownVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Item Preview & Quantity Modal */}
      <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedItem(null)}>
          <View style={styles.itemModal} onStartShouldSetResponder={() => true}>
            {selectedItem?.image_url && (
              <Image source={{ uri: selectedItem.image_url }} style={styles.itemModalImg} contentFit="cover" />
            )}
            <View style={styles.itemModalBody}>
              <Text style={styles.itemModalName}>{selectedItem?.name}</Text>
              {selectedItem?.description && (
                <Text style={styles.itemModalDesc}>{selectedItem.description}</Text>
              )}
              <Text style={styles.itemModalPrice}>P{selectedItem?.price?.toFixed(2)}</Text>

              {selectedItem?.is_made_to_order && (
                <View style={styles.madeToOrderTag}>
                  <Text style={styles.madeToOrderText}>Made to Order</Text>
                </View>
              )}

              {selectedItem?.nutrients && (selectedItem.nutrients.calories || selectedItem.nutrients.protein || selectedItem.nutrients.carbs || selectedItem.nutrients.fat) && (
                <View style={styles.nutrientRow}>
                  {selectedItem.nutrients.calories != null && (
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientVal}>{selectedItem.nutrients.calories}</Text>
                      <Text style={styles.nutrientLabel}>Cal</Text>
                    </View>
                  )}
                  {selectedItem.nutrients.protein != null && (
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientVal}>{selectedItem.nutrients.protein}g</Text>
                      <Text style={styles.nutrientLabel}>Protein</Text>
                    </View>
                  )}
                  {selectedItem.nutrients.carbs != null && (
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientVal}>{selectedItem.nutrients.carbs}g</Text>
                      <Text style={styles.nutrientLabel}>Carbs</Text>
                    </View>
                  )}
                  {selectedItem.nutrients.fat != null && (
                    <View style={styles.nutrientBadge}>
                      <Text style={styles.nutrientVal}>{selectedItem.nutrients.fat}g</Text>
                      <Text style={styles.nutrientLabel}>Fat</Text>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.qtyContainer}>
                <Text style={styles.qtyLabel}>Quantity:</Text>
                <View style={styles.qtySelector}>
                  <TouchableOpacity 
                    style={styles.qtyBtn} 
                    onPress={() => {
                      if (selectedQty <= 1 && selectedItem && (cartMap[selectedItem.id] || 0) > 0) {
                        Alert.alert("Remove from Cart", `Remove ${selectedItem.name} from your cart?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Remove", style: "destructive", onPress: handleRemoveFromCart },
                        ]);
                      } else {
                        setSelectedQty(Math.max(1, selectedQty - 1));
                      }
                    }}
                  >
                    <Ionicons
                      name={selectedQty <= 1 && selectedItem && (cartMap[selectedItem.id] || 0) > 0 ? "trash-outline" : "remove"}
                      size={20}
                      color={selectedQty <= 1 && selectedItem && (cartMap[selectedItem.id] || 0) > 0 ? "#E74C3C" : "#F25C05"}
                    />
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{selectedQty}</Text>
                  <TouchableOpacity 
                    style={styles.qtyBtn} 
                    onPress={() => {
                      const max = selectedItem?.is_made_to_order || selectedItem?.batch_date ? 99 : (selectedItem?.stock_quantity || 99);
                      setSelectedQty(Math.min(max, selectedQty + 1));
                    }}
                  >
                    <Ionicons name="add" size={20} color="#F25C05" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalActionRow}>
                {selectedItem && (cartMap[selectedItem.id] || 0) > 0 ? (
                  <>
                    <TouchableOpacity style={styles.modalRemoveBtn} onPress={handleRemoveFromCart}>
                      <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                      <Text style={styles.modalRemoveText}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalAddBtn} onPress={handleAddToCart}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.modalAddText}>Update Cart</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedItem(null)}>
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalAddBtn} onPress={handleAddToCart}>
                      <Ionicons name="cart-outline" size={16} color="#fff" />
                      <Text style={styles.modalAddText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F0DC" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10,
  },
  appTitle: { fontSize: 20, fontWeight: "bold", color: "#2E1A06" },
  appSub: { fontSize: 11, color: "#B07820", marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    height: 48,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  headerActionBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#F25C05",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  headerActionBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  menuCardUnavailable: {
    opacity: 0.55,
  },
  soldOutOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 4,
  },
  soldOutBadge: {
    backgroundColor: "rgba(217, 38, 20, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fff",
  },
  soldOutBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  searchInput: { flex: 1, fontSize: 13, color: "#333", paddingHorizontal: 8, height: "100%" },
  sectionTitle: {
    fontSize: 16, fontWeight: "bold", color: "#2E1A06",
    marginHorizontal: 16, marginBottom: 10, marginTop: 4,
  },
  dropdownBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E8D8A0", elevation: 1
  },
  dropdownText: { fontSize: 14, fontWeight: "600", color: "#2E1A06" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, maxWidth: 860, alignSelf: "center" },
  menuCard: {
    backgroundColor: "#fff", borderRadius: 16,
    overflow: "hidden", elevation: 3,
  },
  menuImage: { width: "100%" },
  imagePlaceholder: {
    justifyContent: "center", alignItems: "center",
  },
  catTag: {
    position: "absolute", top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  catTagText: { fontSize: 9, color: "#fff", fontWeight: "bold" },
  unavailableBadge: {
    position: "absolute",
    top: 8,
    right: 40,
    backgroundColor: "#E74C3C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unavailableBadgeText: { fontSize: 9, color: "#fff", fontWeight: "bold" },
  inCartBadge: {
    position: "absolute", top: 8, right: 38,
    backgroundColor: "#F25C05", paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 3,
  },
  inCartBadgeText: { fontSize: 9, color: "#fff", fontWeight: "bold" },
  favBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "#fff", borderRadius: 14, padding: 4 },
  cardBottom: { padding: 10 },
  itemName: { fontSize: 13, fontWeight: "bold", color: "#2E1A06", marginBottom: 2 },
  itemDesc: { fontSize: 11, color: "#888", marginBottom: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  price: { fontSize: 15, fontWeight: "bold", color: "#F25C05" },
  stock: { fontSize: 10, color: "#888" },
  stockUnavailable: { color: "#E74C3C", fontWeight: "600" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: "#F25C05", borderRadius: 10, paddingVertical: 8,
  },
  addBtnInCart: { backgroundColor: "#B07820" },
  addBtnDisabled: { backgroundColor: "#BDBDBD" },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  noResults: { textAlign: "center", color: "#aaa", marginTop: 8 },
  
  // MODALS
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  dropdownModal: { width: "80%", backgroundColor: "#fff", borderRadius: 16, padding: 16, paddingBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#2E1A06", marginBottom: 12, textAlign: "center" },
  dropdownOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f0e5" },
  dropdownOptionText: { fontSize: 14, color: "#333", textAlign: "center" },
  modalCloseBtn: { marginTop: 12, paddingVertical: 10 },
  modalCloseText: { fontSize: 14, fontWeight: "600", color: "#888", textAlign: "center" },
  
  itemModal: { width: "85%", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  itemModalImg: { width: "100%", height: 200 },
  itemModalBody: { padding: 16 },
  itemModalName: { fontSize: 18, fontWeight: "bold", color: "#2E1A06", marginBottom: 4 },
  itemModalDesc: { fontSize: 13, color: "#666", marginBottom: 8 },
  itemModalPrice: { fontSize: 18, fontWeight: "bold", color: "#F25C05", marginBottom: 16 },
  qtyContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  qtyLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  qtySelector: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF5EE", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#F25C05" },
  qtyVal: { fontSize: 18, fontWeight: "bold", color: "#333", minWidth: 20, textAlign: "center" },
  modalActionRow: { flexDirection: "row", gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "bold", color: "#555" },
  modalRemoveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: "#FDEDEC", borderWidth: 1, borderColor: "#FADBD8",
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6,
  },
  modalRemoveText: { fontSize: 14, fontWeight: "bold", color: "#E74C3C" },
  modalAddBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: "#F25C05", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6,
  },
  modalAddText: { fontSize: 14, fontWeight: "bold", color: "#fff" },
  madeToOrderTag: {
    backgroundColor: "#8B4513", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10,
  },
  madeToOrderText: { fontSize: 11, color: "#fff", fontWeight: "bold" },
  nutrientRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  nutrientBadge: {
    backgroundColor: "#F9F0DC", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: "center", minWidth: 56,
  },
  nutrientVal: { fontSize: 14, fontWeight: "bold", color: "#2E1A06" },
  nutrientLabel: { fontSize: 10, color: "#888", marginTop: 1 },
  modalXBtn: {
    position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center",
  },
  modalNoImgHeader: {
    flexDirection: "row", justifyContent: "flex-end", padding: 10, paddingBottom: 0,
  },
  modalXBtnDark: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center",
  },
});
