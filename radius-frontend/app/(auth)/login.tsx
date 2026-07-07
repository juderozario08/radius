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
import { SafeAreaView } from "react-native-safe-area-context";

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

/*
function checkPassword(password: string): string[] {
    let symbol = false;
    let number = false;
    let lower = false;
    let upper = false;
    let length = password.length >= 8;

    const symbols = ['!', '@', '.', ',', '?', '$'];

    const result: string[] = [];

    for (let i = 0; length && i < password.length; i++) {
        if (!symbol && symbols.includes(password[i])) {
            symbol = true;
        }
        if (!number && /\d/.test(password[i])) {
            number = true;
        }
        if (!upper && /[A-Z]/.test(password[i])) {
            upper = true;
        }
        if (!lower && /[a-z]/.test(password[i])) {
            lower = true;
        }
    }

    if (!length) {
        return ["Password must be at least 8 characters"];
    }
    if (!upper) {
        result.push("Password requires at least 1 upper case character.")
    }
    if (!lower) {
        result.push("Password requires at least 1 lower case character.")
    }
    if (!number) {
        result.push("Password requires at least 1 number.")
    }
    if (!symbol) {
        result.push("Password must contain one of the following symbols " + symbols.toString().replaceAll(",", "") + ".")
    }

    return result;
} */

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
            const res = await apiFetch<LoginResponse>("/login", {
                method: "POST",
                body: JSON.stringify({ email, password, force }),
            });
            await login(res.token);
        } catch (e) {
            if (e instanceof ConflictError) {
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
            Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Could not connect to server",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Radius</Text>
            <KeyboardAvoidingView>
                <TextInput
                    style={[styles.input, { marginBottom: 25 }]}
                    placeholder="Email"
                    placeholderTextColor={"#aaa"}
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
                        placeholderTextColor={"#aaa"}
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
        </SafeAreaView>
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
