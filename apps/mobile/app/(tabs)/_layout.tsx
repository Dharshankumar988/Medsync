import { Tabs } from 'expo-router';
import { Home, FileText, Brain } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#2563eb' }}>
      <Tabs.Screen 
        name="patient/dashboard" 
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Home color={color} /> }} 
      />
      <Tabs.Screen 
        name="doctor/dashboard" 
        options={{ title: 'Doc Panel', tabBarIcon: ({ color }) => <FileText color={color} /> }} 
      />
    </Tabs>
  );
}
