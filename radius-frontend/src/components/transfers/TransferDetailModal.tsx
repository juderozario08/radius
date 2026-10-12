import { ActionButtonRow } from "@/components/common/ActionButtonRow";
import { DetailRow } from "@/components/common/DetailRow";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { transferScreenStyles as styles } from "@/components/transfers/transferScreenStyles";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { OutboundTransferDetailResponse } from "@/types/receiving.types";
import { FlatList, Modal, Text, View } from "react-native";

type Props = {
    isDetailModalVisible: boolean;
    setIsDetailModalVisible: (visible: boolean) => void;
    isDetailLoading: boolean;
    transferDetail: OutboundTransferDetailResponse | null;
    isAdmin: boolean;
    handleCancelTransfer: (id: number) => void;
    handleOpenDispatchModal: (id: number) => void;
};

export function TransferDetailModal({ isDetailModalVisible, setIsDetailModalVisible, isDetailLoading, transferDetail, isAdmin, handleCancelTransfer, handleOpenDispatchModal }: Props) {
    return (
            <Modal
                visible={isDetailModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDetailModalVisible(false)}
            >
                <View style={globalStyles.modalOverlay}>
                    <View style={globalStyles.modalContentWrapper}>
                        <View style={[globalStyles.modalCardContainer, styles.detailModalContainer]}>
                            {isDetailLoading || !transferDetail ? (
                                <View style={styles.modalLoading}>
                                    <LoadingSpinner />
                                </View>
                            ) : (
                                <>
                                    <View style={globalStyles.modalHeader}>
                                        <View>
                                            <Text style={globalStyles.modalName}>
                                                Transfer #{transferDetail.transfer_id}
                                            </Text>
                                            <Text style={styles.modalSubHeader}>
                                                To: {transferDetail.to_store_name}
                                            </Text>
                                        </View>
                                        <View style={[styles.detailStatusBadge, getBadgeBg(transferDetail.status)]}>
                                            <Text style={[styles.detailStatusText, getBadgeTextColor(transferDetail.status)]}>
                                                {transferDetail.status.replace("_", " ")}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={globalStyles.divider} />

                                    <FlatList
                                        style={styles.detailScroll}
                                        showsVerticalScrollIndicator={false}
                                        data={transferDetail.items}
                                        keyExtractor={(it) => String(it.transfer_item_id)}
                                        contentContainerStyle={globalStyles.section}
                                        ListHeaderComponent={
                                            <>
                                                <View style={globalStyles.section}>
                                                    <Text style={globalStyles.sectionTitle}>Transfer Info</Text>
                                                    {isAdmin && <DetailRow label="Origin Store:" value={transferDetail.from_store_name} />}
                                                    <DetailRow label="Destination Store:" value={transferDetail.to_store_name} />
                                                    <DetailRow label="Created By:" value={transferDetail.requested_by_name} />
                                                    <DetailRow
                                                        label="Created At:"
                                                        value={new Date(transferDetail.created_at).toLocaleString()}
                                                    />
                                                    {transferDetail.transfer_reason ? (
                                                        <DetailRow label="Reason:" value={transferDetail.transfer_reason} />
                                                    ) : null}
                                                    <DetailRow
                                                        label="Manual Check:"
                                                        value={transferDetail.manual_check_required ? "Yes (Itemized Scan)" : "No (Auto-Receive Allowed)"}
                                                    />
                                                </View>

                                                {(transferDetail.shipped_at || transferDetail.carrier || transferDetail.tracking_number) && (
                                                    <View style={globalStyles.section}>
                                                        <Text style={globalStyles.sectionTitle}>Dispatch & Tracking</Text>
                                                        {transferDetail.shipped_at && (
                                                            <DetailRow
                                                                label="Dispatched At:"
                                                                value={new Date(transferDetail.shipped_at).toLocaleString()}
                                                            />
                                                        )}
                                                        {transferDetail.carrier && (
                                                            <DetailRow label="Carrier:" value={transferDetail.carrier} />
                                                        )}
                                                        {transferDetail.tracking_number && (
                                                            <DetailRow label="Tracking #:" value={transferDetail.tracking_number} />
                                                        )}
                                                    </View>
                                                )}
                                                <Text style={globalStyles.sectionTitle}>
                                                    Items ({transferDetail.items.length})
                                                </Text>
                                            </>
                                        }
                                        renderItem={({ item: it }) => (
                                            <View style={styles.itemRowCard}>
                                                <View style={styles.itemRowLeft}>
                                                    <Text style={styles.itemRowName} numberOfLines={1}>{it.name}</Text>
                                                    <Text style={styles.itemRowSku}>SKU: {it.sku} • UPC: {it.upc}</Text>
                                                </View>
                                                <View style={styles.itemRowRight}>
                                                    <Text style={styles.itemRowQtyLabel}>Requested: <Text style={styles.itemRowQtyValue}>{it.qty_requested}</Text></Text>
                                                    {it.qty_sent !== null && (
                                                        <Text style={styles.itemRowQtyLabel}>Sent: <Text style={styles.itemRowQtyValue}>{it.qty_sent}</Text></Text>
                                                    )}
                                                    {it.qty_received !== null && (
                                                        <Text style={styles.itemRowQtyLabel}>Received: <Text style={styles.itemRowQtyValue}>{it.qty_received}</Text></Text>
                                                    )}
                                                </View>
                                            </View>
                                        )}
                                    />

                                    <View style={globalStyles.divider} />

                                    <ActionButtonRow
                                        buttons={[
                                            {
                                                key: "close",
                                                label: "Close",
                                                kind: "neutral",
                                                onPress: () => setIsDetailModalVisible(false),
                                            },
                                            ...(transferDetail.status === "PENDING"
                                                ? [
                                                    {
                                                        key: "cancel",
                                                        label: "Cancel",
                                                        kind: "danger" as const,
                                                        onPress: () => handleCancelTransfer(transferDetail.transfer_id),
                                                    },
                                                    {
                                                        key: "dispatch",
                                                        label: "Dispatch",
                                                        kind: "primary" as const,
                                                        onPress: () => handleOpenDispatchModal(transferDetail.transfer_id),
                                                    },
                                                ]
                                                : []),
                                        ]}
                                    />
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
    );
}

function getBadgeBg(status: string) {
    switch (status) {
        case "PENDING":
            return { backgroundColor: COLORS.warningBg };
        case "IN_TRANSIT":
            return { backgroundColor: COLORS.infoBg };
        case "RECEIVED":
            return { backgroundColor: COLORS.activeBg };
        case "CANCELLED":
            return { backgroundColor: COLORS.inactiveBg };
        default:
            return { backgroundColor: COLORS.surface };
    }
}

function getBadgeTextColor(status: string) {
    switch (status) {
        case "PENDING":
            return { color: COLORS.warning };
        case "IN_TRANSIT":
            return { color: COLORS.info };
        case "RECEIVED":
            return { color: COLORS.success };
        case "CANCELLED":
            return { color: COLORS.dangerDark };
        default:
            return { color: COLORS.textSecondary };
    }
}
