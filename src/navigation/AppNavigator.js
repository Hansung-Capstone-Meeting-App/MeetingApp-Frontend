import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MeetingListScreen from '../screens/MeetingListScreen';
import AddMeetingScreen from '../screens/AddMeetingScreen';
import MeetingDetailScreen from '../screens/MeetingDetailScreen';
import MessengerScreen from '../screens/MessengerScreen';
import MyInfoScreen from '../screens/MyInfoScreen';
import { useAppContext } from '../context/AppContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#4F46E5',
  inactive: '#94A3B8',
  background: '#FFFFFF',
  border: '#E2E8F0',
};

// 커스텀 하단 탭바
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isCenter = index === 1; // Home이 가운데

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName;
        let label;
        if (route.name === 'Messenger') {
          iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
          label = '메신저';
        } else if (route.name === 'Home') {
          iconName = isFocused ? 'home' : 'home-outline';
          label = '홈';
        } else if (route.name === 'MyInfo') {
          iconName = isFocused ? 'person' : 'person-outline';
          label = '내 정보';
        }

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.centerTabButton}
            >
              <View style={[styles.centerIconWrapper, isFocused && styles.centerIconWrapperActive]}>
                <Ionicons name={iconName} size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.centerTabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tabButton}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? COLORS.primary : COLORS.inactive}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// 홈 스택 (홈 → 회의 목록 → 회의 추가 → 회의 상세)
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1E293B',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="MeetingList"
        component={MeetingListScreen}
        options={{ title: '내 회의', headerShown: true }}
      />
      <Stack.Screen
        name="AddMeeting"
        component={AddMeetingScreen}
        options={{ title: '새 회의 만들기', presentation: 'modal' }}
      />
      <Stack.Screen
        name="MeetingDetail"
        component={MeetingDetailScreen}
        options={({ route }) => ({ title: route.params?.meetingName || '회의 상세' })}
      />
    </Stack.Navigator>
  );
}

// 메인 탭 네비게이터
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Messenger" component={MessengerScreen} />
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="MyInfo" component={MyInfoScreen} />
    </Tab.Navigator>
  );
}

// 루트 네비게이터
export default function AppNavigator() {
  const { user } = useAppContext();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  centerTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  centerIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerIconWrapperActive: {
    backgroundColor: '#3730A3',
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.inactive,
    marginTop: 4,
    fontWeight: '500',
  },
  centerTabLabel: {
    fontSize: 10,
    color: COLORS.inactive,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
