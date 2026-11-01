import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  MapPin,
  Search,
  Navigation,
  Check,
  X,
  Compass,
  Building,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

interface DeliveryLocationPickerModalProps {
  visible: boolean;
  initialAddress?: string;
  onClose: () => void;
  onLocationSelected: (address: string, coordinates?: { lat: number; lng: number }) => void;
}

interface LocationPreset {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const BANGALORE_PRESETS: LocationPreset[] = [
  {
    name: 'Indiranagar 100ft Road',
    address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    lat: 12.9716,
    lng: 77.6412,
  },
  {
    name: 'Koramangala 4th Block',
    address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    name: 'HSR Layout Sector 2',
    address: '27th Main Rd, Sector 2, HSR Layout, Bengaluru, Karnataka 560102',
    lat: 12.9116,
    lng: 77.6536,
  },
  {
    name: 'Whitefield Main Road',
    address: 'ITPB Main Road, Whitefield, Bengaluru, Karnataka 560066',
    lat: 12.9698,
    lng: 77.7499,
  },
  {
    name: 'Jayanagar 4th Block',
    address: '11th Main Rd, 4th Block, Jayanagar, Bengaluru, Karnataka 560011',
    lat: 12.9299,
    lng: 77.5824,
  },
  {
    name: 'Hesaraghatta Main Road',
    address: 'Hesaraghatta Main Rd, T. Dasarahalli, Bengaluru, Karnataka 560057',
    lat: 13.0456,
    lng: 77.5098,
  },
];

export function DeliveryLocationPickerModal({
  visible,
  initialAddress,
  onClose,
  onLocationSelected,
}: DeliveryLocationPickerModalProps) {
  const { theme, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
  }>({
    address: initialAddress || BANGALORE_PRESETS[0].address,
    lat: BANGALORE_PRESETS[0].lat,
    lng: BANGALORE_PRESETS[0].lng,
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialAddress) {
      setSelectedLocation((prev) => ({ ...prev, address: initialAddress }));
    }
  }, [initialAddress]);

  // Live OpenStreetMap geocoding search
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          text.trim()
        )}&countrycodes=in&limit=4`,
        {
          headers: {
            'User-Agent': 'MedSync-Mobile-Patient/1.0',
          },
        }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      }
    } catch {
      // Fallback: filter local presets
      const filtered = BANGALORE_PRESETS.filter(
        (p) =>
          p.name.toLowerCase().includes(text.toLowerCase()) ||
          p.address.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(
        filtered.map((p) => ({
          display_name: p.address,
          lat: p.lat,
          lon: p.lng,
        }))
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSelectedLocation({
      address: item.display_name,
      lat,
      lng,
    });
    setSearchResults([]);
    setSearchQuery('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleSelectPreset = (preset: LocationPreset) => {
    setSelectedLocation({
      address: preset.address,
      lat: preset.lat,
      lng: preset.lng,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onLocationSelected(selectedLocation.address, {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    });
    onClose();
  };

  // Generate OpenStreetMap static tile preview URL
  const mapPreviewUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${selectedLocation.lat},${selectedLocation.lng}&zoom=15&size=600x320&maptype=mapnik`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? '#09090B' : '#FFFFFF' },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: isDark ? '#27272A' : '#E4E4E7' },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: isDark ? '#18181B' : '#F4F4F5' },
                ]}
              >
                <Compass size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>
                  Select Delivery Pin
                </Text>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                  Pin your exact doorstep on the map
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Search Input Bar */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                  borderColor: isDark ? '#27272A' : '#E4E4E7',
                },
              ]}
            >
              <Search size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search area, landmark, street name..."
                placeholderTextColor={theme.inputPlaceholder}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 8 }} />
              )}
            </View>

            {/* Search Auto-Complete Dropdown */}
            {searchResults.length > 0 && (
              <View
                style={[
                  styles.searchResultsBox,
                  {
                    backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                    borderColor: isDark ? '#27272A' : '#E4E4E7',
                  },
                ]}
              >
                {searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.place_id || idx}`}
                    style={[
                      styles.searchItem,
                      {
                        borderBottomColor: isDark ? '#27272A' : '#F1F5F9',
                        borderBottomWidth: idx < searchResults.length - 1 ? 1 : 0,
                      },
                    ]}
                    onPress={() => handleSelectPlace(item)}
                    activeOpacity={0.8}
                  >
                    <MapPin size={16} color="#3B82F6" style={{ marginTop: 2, marginRight: 8 }} />
                    <Text style={[styles.searchItemText, { color: theme.text }]} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Visual Interactive Map Preview with Center Pin */}
            <View
              style={[
                styles.mapContainer,
                { borderColor: isDark ? '#27272A' : '#E4E4E7' },
              ]}
            >
              <Image
                source={{ uri: mapPreviewUrl }}
                style={styles.mapImage}
                resizeMode="cover"
              />

              {/* Center Floating Pin Marker */}
              <View style={styles.centerPinWrapper} pointerEvents="none">
                <View style={styles.pinShadow} />
                <View style={styles.pinHead}>
                  <MapPin size={26} color="#EF4444" fill="#EF4444" />
                </View>
                <View style={styles.pinPulseRing} />
              </View>

              {/* Coordinates Badge */}
              <View
                style={[
                  styles.coordsBadge,
                  { backgroundColor: isDark ? 'rgba(9, 9, 11, 0.85)' : 'rgba(255, 255, 255, 0.9)' },
                ]}
              >
                <Navigation size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                <Text style={[styles.coordsText, { color: theme.text }]}>
                  {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
                </Text>
              </View>
            </View>

            {/* Selected Address Display Box */}
            <View
              style={[
                styles.addressCard,
                {
                  backgroundColor: isDark ? '#121215' : '#F8FAFC',
                  borderColor: isDark ? '#27272A' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.addressCardHeader}>
                <MapPin size={16} color="#10B981" />
                <Text style={[styles.addressCardLabel, { color: theme.textMuted }]}>
                  SELECTED DELIVERY DESTINATION
                </Text>
              </View>
              <Text style={[styles.addressCardValue, { color: theme.text }]}>
                {selectedLocation.address}
              </Text>
            </View>

            {/* Quick Preset Delivery Hubs */}
            <Text style={[styles.presetsSectionTitle, { color: theme.textMuted }]}>
              QUICK SELECT POPULAR HUBS
            </Text>
            <View style={styles.presetsGrid}>
              {BANGALORE_PRESETS.map((preset) => {
                const isSelected = selectedLocation.lat === preset.lat;
                return (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : '#EFF6FF'
                          : isDark
                          ? '#18181B'
                          : '#FFFFFF',
                        borderColor: isSelected
                          ? '#3B82F6'
                          : isDark
                          ? '#27272A'
                          : '#E4E4E7',
                      },
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.8}
                  >
                    <Building
                      size={13}
                      color={isSelected ? '#3B82F6' : theme.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: isSelected ? '#3B82F6' : theme.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {preset.name}
                    </Text>
                    {isSelected && (
                      <Check size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Confirm Button Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: isDark ? '#27272A' : '#E4E4E7' },
            ]}
          >
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>Set & Pin Delivery Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  scroll: {
    padding: 20,
    paddingBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    height: '100%',
  },
  searchResultsBox: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  searchItemText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  mapContainer: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -32 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHead: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  pinShadow: {
    position: 'absolute',
    bottom: -4,
    width: 14,
    height: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pinPulseRing: {
    position: 'absolute',
    bottom: -6,
    width: 24,
    height: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  coordsBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  coordsText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  addressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  addressCardValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  presetsSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
  },
  footer: {
    padding: 18,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
