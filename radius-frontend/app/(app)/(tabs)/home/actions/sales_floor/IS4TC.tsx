import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import BackButton from '@/components/common/BackButton';
import { BarcodeScanner, BarcodeScannerRef } from '@/components/common/BarcodeScanner';
import { COLORS } from '@/constants/colors';
import { globalStyles, SPACING, RADIUS, FONT_SIZE } from '@/constants/styles';
import { ENDPOINTS } from '@/constants/routes';
import { callApi } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { MimsProductInventory, ScanProductResponse } from '@/types/inventory.types';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function IS4TCScanScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const scannerRef = useRef<BarcodeScannerRef>(null);

  const [scannedItems, setScannedItems] = useState<MimsProductInventory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSession = useCallback(async () => {
    const url = user?.store_id
      ? `${ENDPOINTS.SALES_FLOOR.IS4TC.session}?store_id=${user.store_id}`
      : ENDPOINTS.SALES_FLOOR.IS4TC.session;
    const response = await callApi<{status: string, items: MimsProductInventory[]}>(url, { method: "GET" }, logout);
    if (response && response.items) {
      setScannedItems(response.items);
    }
  }, [logout, user?.store_id]);

  React.useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const clearSession = async () => {
    Alert.alert("Clear Scan List", "Are you sure you want to clear the shared IS4TC scan list for the store?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
          setIsProcessing(true);
          const url = user?.store_id
            ? `${ENDPOINTS.SALES_FLOOR.IS4TC.clearSession}?store_id=${user.store_id}`
            : ENDPOINTS.SALES_FLOOR.IS4TC.clearSession;
          const result = await callApi(url, { method: "DELETE" }, logout);
          if (result !== null) {
            setScannedItems([]);
            Toast.show({ type: "success", text1: "Cleared", text2: "IS4TC session cleared." });
          }
          setIsProcessing(false);
      }}
    ]);
  };

  const fetchProductByBarcode = async (barcode: string) => {
    if (scannedItems.some(item => item.upc === barcode || item.sku === barcode)) {
      Toast.show({ type: "info", text1: "Already Scanned", text2: "This product is already in the list." });
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);
    const endpoint = `${ENDPOINTS.SALES_FLOOR.INVENTORY.scanProduct}?barcode=${encodeURIComponent(barcode)}`;
    const response = await callApi<ScanProductResponse>(endpoint, { method: "GET" }, logout);

    if (response?.product) {
      const addUrl = user?.store_id
        ? `${ENDPOINTS.SALES_FLOOR.IS4TC.addToSession}?store_id=${user.store_id}`
        : ENDPOINTS.SALES_FLOOR.IS4TC.addToSession;
      const addResp = await callApi<{status: string, items: MimsProductInventory[]}>(addUrl, {
        method: "POST",
        body: { product: response.product }
      }, logout);

      if (addResp?.items) {
        scannerRef.current?.triggerSuccess();
        setScannedItems(addResp.items);
        Toast.show({ type: "success", text1: "Added to List", text2: response.product.name });
      }
    } else {
      scannerRef.current?.triggerError();
      if (response) {
        Toast.show({ type: "error", text1: "Not Found", text2: "Product not found in inventory." });
      }
    }
    setIsProcessing(false);
  };

  const handleBarcodeScanned = (barcode: string) => {
    fetchProductByBarcode(barcode);
  };

  const handleManualEntry = () => {
    if (!manualSku) return;
    setModalVisible(false);
    fetchProductByBarcode(manualSku);
    setManualSku('');
    scannerRef.current?.resetScanner();
  };

  return (
    <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
      <HeaderComponent
        headerLeft={<BackButton />}
        headerCenter={<Text style={globalStyles.headerTitle}>IS4TC Scan</Text>}
        headerRight={
          <View style={{ flexDirection: 'row', gap: SPACING.mdlPlus, marginRight: SPACING.mdlPlus }}>
            <TouchableOpacity onPress={clearSession}>
              <MaterialCommunityIcons name="delete-sweep-outline" size={28} color={COLORS.danger} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <BarcodeScanner
          ref={scannerRef}
          onBarcodeScanned={handleBarcodeScanned}
      />
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <LoadingSpinner />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      <View style={styles.listSection}>
        <Text style={[globalStyles.sectionTitle, { marginBottom: SPACING.smd }]}>
          Scanned Empty Holes ({scannedItems.length})
        </Text>
        <FlatList
          data={scannedItems}
          keyExtractor={(item, index) => `${item.product_id}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/(app)/(tabs)/inventory/${item.product_id}`)}>
              <View style={globalStyles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.detailText}>SKU: {item.sku}</Text>
                  <Text style={styles.detailText}>UPC: {item.upc}</Text>
                  <Text style={styles.detailText}>Available Qty: <Text style={styles.qtyText}>{item.available_qty}</Text></Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[globalStyles.emptyText, { marginTop: SPACING.huge }]}>No items scanned yet.</Text>
          }
        />
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContentWrapper, { padding: SPACING.xl }]}>
            <Text style={globalStyles.modalName}>Enter SKU or UPC</Text>
            <TextInput
              style={styles.input}
              value={manualSku}
              onChangeText={setManualSku}
              placeholder="e.g. 0123456789"
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleManualEntry} style={styles.modalButton}>
                <Text style={styles.addText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TopSafeAreaView>
  );
}

const styles = StyleSheet.create({
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    color: COLORS.surface,
    marginTop: SPACING.smd,
    fontWeight: 'bold',
  },
  listSection: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  cardHeader: {
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  cardBody: {
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  qtyText: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.smd,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.xl,
    gap: SPACING.xl
  },
  modalButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600'
  },
  addText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600'
  }
});
