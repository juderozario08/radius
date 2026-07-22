//radius-frontend/app/(auth)/login.tsx
import { apiFetch, ConflictError } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { LoginResponse } from "@/types/auth.types";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { COLORS } from "@/constants/colors";
import { ENDPOINTS } from "@/constants/routes";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";

function checkEmail(email: string): boolean {
    let atSeen = false;
    let dotAfterAtSeen = false;
    let charsAfterFinalDot = false;
    for (const i of email) {
        if (atSeen && i === "@") {
            return false;
        }
        if (i === "@") {
            atSeen = true;
        }
        if (atSeen && i === ".") {
            dotAfterAtSeen = true;
        }
        if (dotAfterAtSeen && /[A-Za-z]/.test(i)) {
            charsAfterFinalDot = true;
        }
        if (charsAfterFinalDot && i === ".") {
            charsAfterFinalDot = false;
        }
    }
    return atSeen && dotAfterAtSeen && charsAfterFinalDot;
}

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [hiding, setHiding] = useState(true);
    const [validEmail, setValidEmail] = useState<boolean>(false);

    async function submitLogin(force: boolean) {
        setLoading(true);
        try {
            const res = await apiFetch<LoginResponse>(ENDPOINTS.UNAUTHENTICATED.login, {
                method: "POST",
                body: JSON.stringify({ email, password, force }),
            });

            await login(res);
        } catch (err) {
            if (err instanceof ConflictError) {
                Alert.alert(
                    "Already logged in",
                    "This account is active on another device. Log out of that device and log in here?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Yes, log me in", onPress: () => submitLogin(true) },
                    ],
                );
                return;
            }
            Toast.show({
                type: "error",
                text1: String(err),
                position: "bottom",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <TopSafeAreaView style={styles.container}>
            <Text style={styles.title}>Radius</Text>
            <KeyboardAvoidingView>
                <TextInput
                    style={[styles.input, { marginBottom: 25 }]}
                    placeholder="Email"
                    placeholderTextColor={COLORS.placeholder}
                    value={email}
                    onChangeText={(t) => {
                        setEmail(t);
                        setValidEmail(checkEmail(t));
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {!validEmail && email && (
                    <Text
                        style={{ position: "absolute", color: "red", top: 55, left: 4 }}
                    >
                        Please enter a valid email address.
                    </Text>
                )}
                <View>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={COLORS.placeholder}
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t);
                        }}
                        secureTextEntry={hiding}
                    />
                    <TouchableOpacity
                        onPress={() => setHiding(!hiding)}
                        style={styles.hidingContainer}
                    >
                        {hiding ? (
                            <Text style={styles.hidingText}>Show</Text>
                        ) : (
                            <Text style={styles.hidingText}>Hide</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <TouchableOpacity
                style={[
                    styles.button,
                    (loading || !email || !password) && { opacity: 0.7 },
                ]}
                onPress={() => {
                    submitLogin(false);
                }}
                disabled={loading || !email || !password}
            >
                <Text style={styles.buttonText}>
                    {loading ? "Logging in..." : "Log In"}
                </Text>
            </TouchableOpacity>
        </TopSafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        marginBottom: 40,
        alignSelf: "center",
    },
    input: {
        borderWidth: 2,
        borderColor: "#aaa",
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
        fontSize: 16,
    },
    button: {
        backgroundColor: "#CC0000",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    hidingText: { color: "#666" },
    hidingContainer: { position: "absolute", right: 10, top: 18 },
    errorContainer: {
        minHeight: 80,
        position: "absolute",
        marginLeft: 25,
        marginTop: 360,
    },
});
