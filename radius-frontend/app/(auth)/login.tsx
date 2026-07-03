import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch, ConflictError } from '@/api/client'

export default function LoginScreen() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function submitLogin(force: boolean) {
        setLoading(true)
        try {
            const res = await apiFetch<{ token: string }>('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, force }),
            })
            await login(res.token)
        } catch (e) {
            if (e instanceof ConflictError) {
                Alert.alert(
                    'Already logged in',
                    'This account is active on another device. Log out of that device and log in here?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Yes, log me in', onPress: () => submitLogin(true) },
                    ]
                )
                return
            }
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not connect to server')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Radius</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={() => submitLogin(false)} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
    title: { fontSize: 32, fontWeight: '700', marginBottom: 40 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 16 },
    button: { backgroundColor: '#CC0000', padding: 16, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
