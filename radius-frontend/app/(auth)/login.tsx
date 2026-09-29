import { apiFetch, ConflictError } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { LoginResponse } from "@/types/auth.types";
import { useRef, useState } from "react";
import { Platform, Alert, KeyboardAvoidingView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { COLORS } from "@/constants/colors";
import { ENDPOINTS } from "@/constants/routes";
import { TopSafeAreaView } from "@/components/common/TopSafeAreaView";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { globalStyles } from "@/constants/styles";

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
    const passwordRef = useRef<TextInput>(null);

    async function submitLogin(force: boolean) {
        setLoading(true);
        try {
            const res = await apiFetch<LoginResponse>(ENDPOINTS.AUTH.login, {
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
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={globalStyles.container}>
            <TopSafeAreaView style={styles.container}>
                <Text style={styles.title}>Radius</Text>
                <Input
                    style={styles.inputMargin}
                    placeholder="Email"
                    value={email}
                    onChangeText={(t) => {
                        setEmail(t);
                        setValidEmail(checkEmail(t));
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <View style={styles.errorWrapper}>
                    {!validEmail && email && (
                        <Text style={styles.errorLabel}>{" Please enter a valid email address."}</Text>
                    )}
                </View>
                <View style={styles.passwordContainer}>
                    <Input
                        style={styles.passwordInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t);
                        }}
                        secureTextEntry={hiding}
                        ref={passwordRef}
                        returnKeyType="done"
                        onSubmitEditing={() => submitLogin(false)}
                    />
                    <TouchableOpacity
                        onPress={() => setHiding(!hiding)}
                        style={styles.hidingContainer}
                    >
                        <Text style={styles.hidingText}>{hiding ? "Show" : "Hide"}</Text>
                    </TouchableOpacity>
                </View>
                <Button
                    title={loading ? "Logging in..." : "Log In"}
                    onPress={() => submitLogin(false)}
                    disabled={loading || !email || !password}
                />
            </TopSafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: COLORS.surface,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        marginBottom: 40,
        alignSelf: "center",
        color: COLORS.textPrimary,
    },
    inputMargin: {
        marginBottom: 5,
    },
    errorWrapper: {
        height: 20,
    },
    errorLabel: {
        color: COLORS.danger,
    },
    passwordContainer: {
        marginTop: 5, 
        marginBottom: 12, 
        justifyContent: "center"
    },
    passwordInput: {
        marginTop: 0, 
        marginBottom: 0, 
        paddingRight: 60,
    },
    hidingText: { color: COLORS.textSecondary },
    hidingContainer: {
        position: "absolute",
        right: 15,
        height: "100%",
        justifyContent: "center",
    },
});
