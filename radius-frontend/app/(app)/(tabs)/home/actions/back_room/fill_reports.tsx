import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FillReportsScreen() {
  return (
    <View style={styles.container}>
      <Text>Admin: Store Fill Reports Overview</Text>
      {/* List of store cards goes here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
