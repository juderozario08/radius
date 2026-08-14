import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopSafeAreaView } from '@/components/common/TopSafeAreaView';
import HeaderComponent from '@/components/common/HeaderComponent';
import { BarcodeScanner, BarcodeScannerRef } from '@/components/common/BarcodeScanner';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

export default function IS4TCScanScreen() {
  const scannerRef = useRef<BarcodeScannerRef>(null);
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualSku, setManualSku] = useState('');

  const handleBarcodeScanned = (barcode: string) => {
    addScannedItem(barcode);
    // The BarcodeScanner component pauses itself when a scan happens.
    // We auto-resume after 1.5s to let the user keep scanning holes rapidly.
    setTimeout(() => {
        scannerRef.current?.resetScanner();
    }, 1500);
  };

  const addScannedItem = (sku: string) => {
    if (!sku) return;
    setScannedItems((prev) => {
      // If a product is already scanned, it should not repeat itself
      if (prev.includes(sku)) {
        return prev;
      }
      return [sku, ...prev];
    });
    setModalVisible(false);
    setManualSku('');
  };

  return (
    <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
      <HeaderComponent
        headerCenter={<Text style={globalStyles.headerTitle}>IS4TC Scan</Text>}
        headerRight={
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 15 }}>
            <Ionicons name="add" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      {/* Top Half: Reusable Barcode Scanner Component */}
      <BarcodeScanner
          ref={scannerRef}
          onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Bottom Half: Scanned Products List */}
      <View style={styles.listSection}>
        <Text style={[globalStyles.sectionTitle, { marginBottom: 10 }]}>
          Scanned Empty Holes ({scannedItems.length})
        </Text>
        <FlatList
          data={scannedItems}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={globalStyles.card}>
              <View style={globalStyles.row}>
                <Text style={styles.skuText}>SKU: {item}</Text>
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>Empty Hole</Text>
                </View>
              </View>
            </View>
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
            <Text style={globalStyles.modalName}>Enter SKU Manually</Text>
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
              <TouchableOpacity onPress={() => {
                addScannedItem(manualSku);
                scannerRef.current?.resetScanner();
              }} style={styles.modalButton}>
                <Text style={styles.addText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TopSafeAreaView>
  );
}

const styles = StyleSheet.create({
  listSection: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 20,
    gap: 12,
  },
  skuText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  urgentBadge: {
    backgroundColor: COLORS.inactiveBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
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
