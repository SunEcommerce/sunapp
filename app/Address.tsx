import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Address = {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
};

export default function AddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromCheckout = params.fromCheckout === 'true';

  // Sample addresses (in real app, fetch from user profile/database)
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: '1',
      name: 'John Doe',
      phone: '+95 9 123 456 789',
      address: '123 Main Street, Yangon, Myanmar',
      isDefault: true,
    },
    {
      id: '2',
      name: 'John Doe',
      phone: '+95 9 987 654 321',
      address: '456 Second Avenue, Mandalay, Myanmar',
      isDefault: false,
    },
  ]);

  const handleAddAddress = () => {
    // Navigate to add address form (to be created)
    Alert.alert('Add Address', 'Navigate to Add Address Form');
  };

  const handleSelectAddress = (address: Address) => {
    if (fromCheckout) {
      // Return to Checkout with selected address
      router.back();
      // In real app, you would pass the selected address via state management or params
      // For now, we'll use router.setParams or a global state
      router.setParams({ selectedAddressId: address.id });
    }
  };

  const handleEditAddress = (id: string) => {
    Alert.alert('Edit Address', `Edit address ${id}`);
  };

  const handleDeleteAddress = (id: string, name: string) => {
    Alert.alert(
      'Delete Address',
      `Delete address for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAddresses(addresses.filter((addr) => addr.id !== id));
          },
        },
      ]
    );
  };

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  return (
    <ThemedView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>My Addresses</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Add Address Button */}
        <TouchableOpacity
          style={styles.addAddressButton}
          onPress={handleAddAddress}
        >
          <View style={styles.addAddressContent}>
            <Ionicons name="add-circle-outline" size={32} color="#2196F3" />
            <ThemedText style={styles.addAddressText}>Add New Address</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Address List */}
        <View style={styles.addressList}>
          {addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={styles.addressCard}
              onPress={() => handleSelectAddress(address)}
              activeOpacity={fromCheckout ? 0.7 : 1}
            >
              <View style={styles.addressHeader}>
                <View style={styles.addressHeaderLeft}>
                  <ThemedText style={styles.addressName}>{address.name}</ThemedText>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <ThemedText style={styles.defaultText}>Default</ThemedText>
                    </View>
                  )}
                </View>
                {!address.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleSetDefault(address.id)}
                    style={styles.setDefaultButton}
                  >
                    <ThemedText style={styles.setDefaultText}>Set Default</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.addressBody}>
                <View style={styles.addressInfoRow}>
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <ThemedText style={styles.addressPhone}>{address.phone}</ThemedText>
                </View>
                <View style={styles.addressInfoRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <ThemedText style={styles.addressText}>{address.address}</ThemedText>
                </View>
              </View>

              <View style={styles.addressActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditAddress(address.id)}
                >
                  <Ionicons name="create-outline" size={18} color="#2196F3" />
                  <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteAddress(address.id, address.name)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <ThemedText style={[styles.actionButtonText, styles.deleteText]}>
                    Delete
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  // Add Address Button
  addAddressButton: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
  },
  addAddressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  // Address List
  addressList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  addressBody: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    flex: 1,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  deleteText: {
    color: '#FF3B30',
  },
});
