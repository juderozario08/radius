import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { returnScreenStyles as styles } from "@/components/returns/returnScreenStyles";
import { COLORS } from "@/constants/colors";
import { CustomerReturnDetailResponse } from "@/types/returns.types";
import { formatMoney, multiplyMoney } from "@/utils/money";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

type Props = {
    selectedReturnId: number | null;
    setSelectedReturnId: (id: number | null) => void;
    isLoadingDetail: boolean;
    returnDetail: CustomerReturnDetailResponse | null;
    isManagerOrAdmin: boolean;
    isProcessingAction: boolean;
    handleRejectReturn: (id: number) => void;
    handleApproveReturn: (id: number) => Promise<void>;
};

export function ReturnDetailModal({ selectedReturnId, setSelectedReturnId, isLoadingDetail, returnDetail, isManagerOrAdmin, isProcessingAction, handleRejectReturn, handleApproveReturn }: Props) {
    return (
            <Modal
                visible={!!selectedReturnId}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedReturnId(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>Return #{selectedReturnId}</Text>
                            <TouchableOpacity onPress={() => setSelectedReturnId(null)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {isLoadingDetail ? (
                            <View style={styles.centerContainer}>
                                <LoadingSpinner />
                            </View>
                        ) : returnDetail ? (
                            <FlatList
                                style={styles.detailModalBody}
                                data={returnDetail.items}
                                keyExtractor={(item) => String(item.return_item_id)}
                                ListHeaderComponent={
                                    <>
                                        <View style={styles.detailSummaryBox}>
                                            <View style={styles.detailSummaryRow}>
                                                <Text style={styles.detailSummaryLabel}>Status:</Text>
                                                <Text style={styles.detailSummaryValue}>
                                                    {returnDetail.return.status.replace("_", " ")}
                                                </Text>
                                            </View>
                                            <View style={styles.detailSummaryRow}>
                                                <Text style={styles.detailSummaryLabel}>Refund Method:</Text>
                                                <Text style={styles.detailSummaryValue}>
                                                    {returnDetail.return.refund_method.replace("_", " ")}
                                                </Text>
                                            </View>
                                            <View style={styles.detailSummaryRow}>
                                                <Text style={styles.detailSummaryLabel}>Total Refund:</Text>
                                                <Text style={styles.detailSummaryTotal}>
                                                    {formatMoney(returnDetail.return.total_refund)}
                                                </Text>
                                            </View>
                                            <View style={styles.detailSummaryRow}>
                                                <Text style={styles.detailSummaryLabel}>Processed By:</Text>
                                                <Text style={styles.detailSummaryValue}>
                                                    {returnDetail.return.employee_name}
                                                </Text>
                                            </View>
                                            {returnDetail.return.approved_by_name && (
                                                <View style={styles.detailSummaryRow}>
                                                    <Text style={styles.detailSummaryLabel}>Approved By:</Text>
                                                    <Text style={styles.detailSummaryValue}>
                                                        {returnDetail.return.approved_by_name}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.itemsListTitle}>Returned Items</Text>
                                    </>
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.detailItemRow}>
                                        <View style={styles.detailItemLeft}>
                                            <Text style={styles.detailItemName}>{item.product_name}</Text>
                                            <Text style={styles.detailItemSku}>SKU: {item.sku}</Text>
                                            <Text style={styles.detailItemReason}>
                                                Reason: {item.return_reason.replace("_", " ")}
                                            </Text>
                                            <Text style={styles.detailItemDisposition}>
                                                Disposition: {item.disposition.replace("_", " ")}
                                            </Text>
                                        </View>
                                        <View style={styles.detailItemRight}>
                                            <Text style={styles.detailItemQty}>Qty: {item.quantity}</Text>
                                            <Text style={styles.detailItemPrice}>
                                                {formatMoney(multiplyMoney(item.unit_price, item.quantity))}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                ListFooterComponent={
                                    returnDetail.return.status === "PENDING_APPROVAL" && isManagerOrAdmin ? (
                                        <View style={styles.managerActionRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn,
                                                    styles.rejectBtn,
                                                    isProcessingAction && styles.submitButtonDisabled,
                                                ]}
                                                onPress={() => handleRejectReturn(returnDetail.return.return_id)}
                                                disabled={isProcessingAction}
                                            >
                                                <Text style={styles.actionBtnText}>Reject</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn,
                                                    styles.approveBtn,
                                                    isProcessingAction && styles.submitButtonDisabled,
                                                ]}
                                                onPress={() => handleApproveReturn(returnDetail.return.return_id)}
                                                disabled={isProcessingAction}
                                            >
                                                <Text style={styles.actionBtnText}>Approve</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : null
                                }
                            />
                        ) : null}
                    </View>
                </View>
            </Modal>
    );
}
