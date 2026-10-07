import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import HeaderComponent from "@/components/common/HeaderComponent";
import BackButton from "@/components/common/BackButton";
import { ENDPOINTS } from "@/constants/routes";
import { callApi } from "@/utils/helpers";
import { ProductScreenDetails } from "@/types/inventory.types";
import { ProductDetails } from "@/components/inventory/ProductDetails";
import { useAuth } from "@/hooks/useAuth";
import { COLORS } from "@/constants/colors";
import { globalStyles } from "@/constants/styles";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function ProductScreen() {
    const { productId } = useLocalSearchParams();
    const { logout } = useAuth();

    const [productDetails, setProductDetails] = useState<ProductScreenDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProduct = useCallback(async () => {
        if (!productId || typeof productId !== "string") return;
        setIsLoading(true);
        setError(null);
        try {
            const endpoint = ENDPOINTS.SALES_FLOOR.INVENTORY.productDetails(productId);
            const data = await callApi<ProductScreenDetails>(endpoint, { method: "GET" }, logout);
            if (data) {
                setProductDetails(data);
            } else {
                setError("Product not found");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load product");
        } finally {
            setIsLoading(false);
        }
    }, [productId, logout]);

    useEffect(() => {
        void fetchProduct();
    }, [fetchProduct]);

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Product Details</Text>}
            />
            {isLoading ? (
                <View style={globalStyles.centerElement}>
                    <LoadingSpinner />
                </View>
            ) : error || !productDetails ? (
                <View style={globalStyles.centerElement}>
                    <Text style={globalStyles.errorText}>{error || "Product not found"}</Text>
                </View>
            ) : (
                <ProductDetails details={productDetails} />
            )}
        </TopSafeAreaView>
    );
}
