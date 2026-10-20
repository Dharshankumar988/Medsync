import { Role } from '../providers/role-provider';
import { Colors } from '../constants/theme';

export interface TabRouteConfig {
  name: string;
  title: string;
  iconName: 'LayoutDashboard' | 'FileText' | 'Calendar' | 'Activity' | 'User' | 'Users' | 'ShoppingBag' | 'Package' | 'Shield' | 'Server';
  role: Role;
}

export const ROLE_TAB_ROUTES: Record<Role, TabRouteConfig[]> = {
  patient: [
    { name: 'patient/dashboard', title: 'Dashboard', iconName: 'LayoutDashboard', role: 'patient' },
    { name: 'patient/records', title: 'Records', iconName: 'FileText', role: 'patient' },
    { name: 'patient/appointments', title: 'Appointments', iconName: 'Calendar', role: 'patient' },
    { name: 'patient/pulse-ai', title: 'Pulse AI', iconName: 'Activity', role: 'patient' },
    { name: 'patient/profile', title: 'Profile', iconName: 'User', role: 'patient' },
  ],
  doctor: [
    { name: 'doctor/dashboard', title: 'Dashboard', iconName: 'LayoutDashboard', role: 'doctor' },
    { name: 'doctor/patients', title: 'Patients', iconName: 'Users', role: 'doctor' },
    { name: 'doctor/appointments', title: 'Schedule', iconName: 'Calendar', role: 'doctor' },
    { name: 'doctor/pulse-ai', title: 'Pulse AI', iconName: 'Activity', role: 'doctor' },
    { name: 'doctor/profile', title: 'Profile', iconName: 'User', role: 'doctor' },
  ],
  pharmacy: [
    { name: 'pharmacy/dashboard', title: 'Dashboard', iconName: 'LayoutDashboard', role: 'pharmacy' },
    { name: 'pharmacy/orders', title: 'Orders', iconName: 'ShoppingBag', role: 'pharmacy' },
    { name: 'pharmacy/inventory', title: 'Inventory', iconName: 'Package', role: 'pharmacy' },
    { name: 'pharmacy/pulse-ai', title: 'Pulse AI', iconName: 'Activity', role: 'pharmacy' },
    { name: 'pharmacy/profile', title: 'Profile', iconName: 'User', role: 'pharmacy' },
  ],
  hospital: [
    { name: 'hospital/dashboard', title: 'Dashboard', iconName: 'LayoutDashboard', role: 'hospital' },
    { name: 'hospital/doctors', title: 'Doctors', iconName: 'Users', role: 'hospital' },
    { name: 'hospital/appointments', title: 'Schedule', iconName: 'Calendar', role: 'hospital' },
    { name: 'hospital/profile', title: 'Profile', iconName: 'User', role: 'hospital' },
  ],
  admin: [
    { name: 'admin/dashboard', title: 'Dashboard', iconName: 'LayoutDashboard', role: 'admin' },
    { name: 'admin/users', title: 'Users', iconName: 'Users', role: 'admin' },
    { name: 'admin/security', title: 'Security', iconName: 'Shield', role: 'admin' },
    { name: 'admin/system', title: 'System', iconName: 'Server', role: 'admin' },
    { name: 'admin/profile', title: 'Profile', iconName: 'User', role: 'admin' },
  ],
};

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  pharmacy: 'Pharmacy',
  hospital: 'Hospital',
  admin: 'Administrator',
};

export const getRoleDisplayName = (role: Role | string | null | undefined): string => {
  if (!role) return 'User';
  return ROLE_DISPLAY_NAMES[role.toLowerCase() as Role] ?? 'User';
};
