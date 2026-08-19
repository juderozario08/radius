//radius-frontend/app/(app)/inventory/[productId].tsx
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
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

export default function ProductScreen() {
    const { productId } = useLocalSearchParams();
    const { logout } = useAuth();

    const [productDetails, setProductDetails] = useState<ProductScreenDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    const fetchProduct = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const endpoint = `/api/sales_floor/inventory/product-details?product_id=${productId}`;
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
    };

    return (
        <TopSafeAreaView style={[globalStyles.container, { backgroundColor: COLORS.headerBackground }]}>
            <HeaderComponent
                headerLeft={<BackButton />}
                headerCenter={<Text style={globalStyles.headerTitle}>Product Details</Text>}
            />
            {isLoading ? (
                <View style={globalStyles.centerElement}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
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

