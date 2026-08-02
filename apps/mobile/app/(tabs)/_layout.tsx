import { Tabs } from 'expo-router';
import { Shield, Activity, Calendar, User } from 'lucide-react-native';

const SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: '#2563EB',
  tabBarInactiveTintColor: '#64748B',
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  }
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={SCREEN_OPTIONS as any}>
      <Tabs.Screen
        name="patient/dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color }) => <Shield size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/appointments"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patient/profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
