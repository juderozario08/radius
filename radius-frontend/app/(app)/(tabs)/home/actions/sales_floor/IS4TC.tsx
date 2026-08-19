import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import { BarcodeScanner, BarcodeScannerRef } from '@/components/common/BarcodeScanner';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { ENDPOINTS } from '@/constants/routes';
import { callApi } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { MimsProductInventory, ScanProductResponse } from '@/types/inventory.types';

export default function IS4TCScanScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const scannerRef = useRef<BarcodeScannerRef>(null);
  
  const [scannedItems, setScannedItems] = useState<MimsProductInventory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const response = await callApi<{status: string, items: MimsProductInventory[]}>('/api/sales_floor/is4tc/session', { method: "GET" }, logout);
      if (response && response.items) {
        setScannedItems(response.items);
      }
    } catch (error) {
      console.error("Failed to fetch IS4TC session:", error);
    }
  };

  const clearSession = async () => {
    Alert.alert("Clear Scan List", "Are you sure you want to clear the shared IS4TC scan list for the store?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
          setIsProcessing(true);
          try {
            await callApi('/api/sales_floor/is4tc/session/clear', { method: "DELETE" }, logout);
            setScannedItems([]);
            Toast.show({ type: "success", text1: "Cleared", text2: "IS4TC session cleared." });
          } catch (error) {
            Toast.show({ type: "error", text1: "Error", text2: "Failed to clear session." });
          } finally {
            setIsProcessing(false);
          }
      }}
    ]);
  };

  const fetchProductByBarcode = async (barcode: string) => {
    // Prevent fetching if already scanned
    if (scannedItems.some(item => item.upc === barcode || item.sku === barcode)) {
      Toast.show({ type: "info", text1: "Already Scanned", text2: "This product is already in the list." });
      return;
    }

    setIsProcessing(true);
    try {
      const endpoint = `${ENDPOINTS.AUTHENTICATED.MIMS.scanProduct}?barcode=${encodeURIComponent(barcode)}`;
      const response = await callApi<ScanProductResponse>(endpoint, { method: "GET" }, logout);

      if (response?.product) {
        // Add to Redis session
        const addResp = await callApi<{status: string, items: MimsProductInventory[]}>('/api/sales_floor/is4tc/session/add', {
          method: "POST",
          body: { product: response.product }
        }, logout);

        if (addResp?.items) {
          setScannedItems(addResp.items);
          Toast.show({ type: "success", text1: "Added to List", text2: response.product.name });
        }
      } else {
        Toast.show({ type: "error", text1: "Not Found", text2: "Product not found in inventory." });
      }
    } catch (err) {
      Toast.show({ type: "error", text1: "Error", text2: "Failed to process scan." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    fetchProductByBarcode(barcode);
    setTimeout(() => {
        scannerRef.current?.resetScanner();
    }, 1500);
  };

  const handleManualEntry = () => {
    if (!manualSku) return;
    setModalVisible(false);
    fetchProductByBarcode(manualSku);
    setManualSku('');
    scannerRef.current?.resetScanner();
  };

  // Removed local addScannedItem as it is now handled by the Redis endpoint

  return (
    <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
      <HeaderComponent
        headerCenter={<Text style={globalStyles.headerTitle}>IS4TC Scan</Text>}
        headerRight={
          <View style={{ flexDirection: 'row', gap: 15, marginRight: 15 }}>
            <TouchableOpacity onPress={clearSession}>
              <MaterialCommunityIcons name="delete-sweep-outline" size={28} color={COLORS.danger} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Top Half: Reusable Barcode Scanner Component */}
      <BarcodeScanner
          ref={scannerRef}
          onBarcodeScanned={handleBarcodeScanned}
      />
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}

      {/* Bottom Half: Scanned Products List */}
      <View style={styles.listSection}>
        <Text style={[globalStyles.sectionTitle, { marginBottom: 10 }]}>
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
            <Text style={[globalStyles.emptyText, { marginTop: 40 }]}>No items scanned yet.</Text>
          }
        />
      </View>

      {/* Manual Entry Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContentWrapper, { padding: 20 }]}>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: 'bold',
  },
  listSection: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  cardHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  cardBody: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
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
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 20, 
    gap: 20 
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: COLORS.textSecondary, 
    fontSize: 16, 
    fontWeight: '600'
  },
  addText: {
    color: COLORS.primary, 
    fontSize: 16, 
    fontWeight: '600'
  }
});
