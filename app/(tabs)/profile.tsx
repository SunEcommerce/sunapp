import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Reusable component for the menu list items
const MenuItem: React.FC<{
  iconName: any;
  label: string;
  color?: string;
  onPress?: () => void;
  borderColor?: string;
}> = ({ iconName, label, color, onPress, borderColor }) => (
  <TouchableOpacity
    style={[styles.menuItemContainer, { borderBottomColor: borderColor }]}
    onPress={onPress}
  >
    <View style={styles.menuItemLeft}>
      {/* Icon */}
      <Ionicons
        name={iconName}
        size={24}
        color={color}
        style={styles.menuIcon}
      />
      {/* Label */}
      <ThemedText style={[styles.menuLabel, { color: color }]}>
        {label}
      </ThemedText>
    </View>

    {/* Right Arrow */}
    <Ionicons name="chevron-forward-outline" size={20} color="#B0B0B0" />
  </TouchableOpacity>
);

export default function TabTwoScreen() {
  const themeContext = useContext(ThemeContext);

  if (!themeContext) {
    return null; // Or a loading indicator
  }
  const { colorScheme } = themeContext;
  const themeColors = Colors[colorScheme];

  const separatorColor = themeColors.icon; // Use theme's icon color for separator
  const navigation = useNavigation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const router = useRouter();
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token'); // adjust key to your auth token key
        setIsLoggedIn(!!token);
      } catch (e) {
        setIsLoggedIn(false);
      }
    };
    checkLogin();
  }, []);

  if (isLoggedIn !== null || !isLoggedIn) {
    useEffect(() => {
      const fetchUserProfile = async () => {
        try {
          const profileString = await AsyncStorage.getItem('user_profile');
          if (profileString) {
            const profile = JSON.parse(profileString);
            setUserProfile(profile);
          }
        } catch (e) {
          console.error('Failed to load user profile:', e);
        }
      };
      fetchUserProfile();
    }, []);
  }

  const menuItems: Array<{
    label: string;
    icon: string;
    action: () => void;
    color?: string;
  }> = [
    {
      label: 'Language',
      icon: 'globe-outline',
      action: () => console.log('Language pressed'),
    },
    {
      label: 'App Setting',
      icon: 'cog-outline',
      action: () => router.push('/screens/settings'),
    },
    {
      label: 'Warranty',
      icon: 'shield-checkmark-outline',
      action: () => console.log('Warranty pressed'),
    },
    {
      label: 'Apply Hire Purchase',
      icon: 'card-outline',
      action: () => console.log('Apply Hire Purchase pressed'),
    },
    {
      label: 'Loyalty Program',
      icon: 'gift-outline',
      action: () => console.log('Loyalty Program pressed'),
    },
    {
      label: 'Call Center',
      icon: 'call-outline',
      action: () => console.log('Call Center pressed'),
    },
    {
      label: 'Privacy Policy',
      icon: 'cube',
      action: () => console.log('Clear cache pressed'),
    },
    {
      label: 'Terms & Condition',
      icon: 'document-text',
      action: () => console.log('Clear history pressed'),
    },
  ];

  const ActionButton: React.FC<{
    iconName: any;
    label: string;
    color?: string;
  }> = ({ iconName, label }) => (
    <TouchableOpacity style={styles.actionButton}>
      <Ionicons name={iconName} size={28} color="#4A4A4A" />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user_profile');
      setIsLoggedIn(false);
      router.push('/Auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return (
    <ThemedView style={styles.safeArea}>
      <ThemedView>
        <LinearGradient
          colors={['#2b5fe2ff', '#D8BFD8']} // Purple and light pink gradient
          start={{ x: 0.1, y: 0.2 }}
          end={{ x: 0.8, y: 0.9 }}
          style={styles.gradientContainer}
        ></LinearGradient>

        <View style={styles.profileCard}>
          {isLoggedIn ? (
            <>
              <Image
                source={{ uri: userProfile != null ? userProfile.image : 'https://i.pravatar.cc/150?img=47' }}
                style={styles.avatar}
              />

              <View style={styles.detailsContainer}>
                <Text style={styles.nameText}>
                  {userProfile != null ? userProfile.name : ''} <Text style={styles.verifyTag}>(Verify)</Text>
                </Text>
                <View style={styles.phoneContainer}>
                  <Text style={styles.phoneText}>{userProfile != null ? userProfile.country_code+' '+userProfile.phone : ''}</Text>
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/FavoriteProducts')}>
                  <Ionicons name="heart-circle" size={28} color="#4A4A4A" />
                  <Text style={styles.actionLabel}>Favorite</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/OrderList')}>
                  <Ionicons name="list-circle-sharp" size={28} color="#4A4A4A" />
                  <Text style={styles.actionLabel}>My Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/Address')}>
                  <Ionicons name="navigate-circle-sharp" size={28} color="#4A4A4A" />
                  <Text style={styles.actionLabel}>Address</Text>
                </TouchableOpacity>
                <ActionButton iconName="person-circle" label="Edit Profile" />
              </View>
            </>
          ) : (
            <View style={styles.guestContainer}>
              <Text style={styles.guestTitle}>Welcome</Text>
              <Text style={styles.guestSubtitle}>
                Please register or login to access your profile
              </Text>

              <View style={styles.authButtonsRow}>
                <TouchableOpacity
                  style={[styles.authButton, styles.loginButton]}
                  onPress={() => navigation.navigate('Auth' as never)}
                >
                  <Text style={styles.loginButtonText}>Login</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.authButton, styles.registerButton]}
                  onPress={() => navigation.navigate('Auth' as never)}
                >
                  <Text style={styles.authButtonText}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ThemedView>

      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 2. MENU LIST SECTION */}
          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <MenuItem
                key={index}
                iconName={item.icon}
                label={item.label}
                color={item.color || themeColors.text} // Main icon and text color
                onPress={item.action}
                borderColor={separatorColor}
              />
            ))}
            {isLoggedIn ? (
            <MenuItem
                key={menuItems.length}
                iconName="log-out-outline"
                label="Logout"
                color="#E95757" // Keep specific red for logout
                onPress={() => handleLogout()}
                borderColor={separatorColor}
              />
            ):<></>}
          </View>
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 0,
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 15,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#959595',
    borderRadius: 10,
    padding: 3,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#E95757',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    height: 38,
    marginLeft: 20,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  menuList: {
    marginTop: 10,
  },
  menuItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 30,
  },
  menuLabel: {
    fontSize: 16,
    marginLeft: 10,
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  gradientContainer: {
    height: 180,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 10,
    marginTop: -100,
    marginBlock: 10,
    paddingHorizontal: 20,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'absolute',
    alignSelf: 'center',
    top: -50,
    zIndex: 5,
    borderWidth: 5,
    borderColor: '#fff',
  },
  detailsContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 50,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  verifyTag: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 5,
    color: '#4A4A4A',
  },
  bottomSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  interestHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  interestList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  interestTile: {
    width: '32%',
    height: 100,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  interestGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  interestLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },

  guestContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 10,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 18,
  },
  authButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  authButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  registerButton: {
    backgroundColor: '#2b5fe2',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2b5fe2',
  },
  authButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loginButtonText: {
    color: '#2b5fe2',
    fontWeight: '600',
  }
});
