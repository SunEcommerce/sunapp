import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchProfile, updateProfile } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  username: string;
  balance: string;
  currency_balance: string;
  image: string;
  role_id: number;
  country_code: string;
  order: number;
  create_date: string;
  update_date: string;
}

export default function EditProfile() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();

  if (!themeContext) {
    return null;
  }

  const { colorScheme } = themeContext;
  const themeColors = Colors[colorScheme];

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+95');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Fetch profile from API
      const response = await fetchProfile();
      
      if (response?.data) {
        const profileData = response.data;
        setProfile(profileData);
        setName(profileData.name || '');
        setPhone(profileData.phone || '');
        setEmail(profileData.email || '');
        setCountryCode(profileData.country_code || '+95');
        setImageUri(profileData.image || null);
        
        // Update AsyncStorage with latest data
        await AsyncStorage.setItem('user_profile', JSON.stringify(profileData));
      }
    } catch (error) {
      console.error('Failed to load profile from API:', error);
      
      // Fallback to AsyncStorage if API fails
      try {
        const cachedProfile = await AsyncStorage.getItem('user_profile');
        if (cachedProfile) {
          const profileData = JSON.parse(cachedProfile);
          setProfile(profileData);
          setName(profileData.name || '');
          setPhone(profileData.phone || '');
          setEmail(profileData.email || '');
          setCountryCode(profileData.country_code || '+95');
          setImageUri(profileData.image || null);
          
          Alert.alert('Notice', 'Loaded profile from cache. Please check your internet connection.');
        } else {
          Alert.alert('Error', 'Failed to load profile data. Please try again.');
        }
      } catch (cacheError) {
        console.error('Failed to load from cache:', cacheError);
        Alert.alert('Error', 'Failed to load profile data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setNewImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Phone is required');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('country_code', countryCode);

      // Add image if a new one was selected
      if (newImage) {
        const imageFile = {
          uri: newImage.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any;
        formData.append('image', imageFile);
      }

      const response = await updateProfile(formData);

      if (response?.data) {
        // Update AsyncStorage with new profile data
        await AsyncStorage.setItem('user_profile', JSON.stringify(response.data));
        
        Alert.alert('Success', 'Profile updated successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: themeColors.icon }]}>
                <Ionicons name="person" size={60} color={themeColors.background} />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.imageHint}>Tap to change profile picture</ThemedText>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <View style={[styles.inputWrapper, { 
              backgroundColor: themeColors.background,
              borderColor: themeColors.icon 
            }]}>
              <Ionicons name="person-outline" size={20} color={themeColors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={themeColors.icon}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <View style={[styles.inputWrapper, { 
              backgroundColor: themeColors.background,
              borderColor: themeColors.icon 
            }]}>
              <Ionicons name="mail-outline" size={20} color={themeColors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={themeColors.icon}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Country Code Field */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Country Code</ThemedText>
            <View style={[styles.inputWrapper, { 
              backgroundColor: themeColors.background,
              borderColor: themeColors.icon 
            }]}>
              <Ionicons name="flag-outline" size={20} color={themeColors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                value={countryCode}
                onChangeText={setCountryCode}
                placeholder="Country code (e.g., +95)"
                placeholderTextColor={themeColors.icon}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Phone Number</ThemedText>
            <View style={[styles.inputWrapper, { 
              backgroundColor: themeColors.background,
              borderColor: themeColors.icon 
            }]}>
              <Ionicons name="call-outline" size={20} color={themeColors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                placeholderTextColor={themeColors.icon}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#2b5fe2',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2b5fe2',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2b5fe2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  formSection: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  saveButton: {
    backgroundColor: '#2b5fe2',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
