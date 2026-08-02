import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { ShieldCheck, ShieldAlert, Clock, Info } from 'lucide-react-native';

export type BlockchainStatus = 'SYNCED' | 'CONFIRMED' | 'PENDING' | 'FAILED' | 'REVERTED' | 'SUBMITTED' | 'CONFIRMING' | 'RETRYING';

interface BlockchainBadgeProps {
  status: BlockchainStatus;
  txHash?: string;
  showText?: boolean;
}

export const BlockchainBadge = React.memo(function BlockchainBadge({ status, txHash, showText = true }: BlockchainBadgeProps) {
  const badgeConfig = React.useMemo(() => {
    let Icon = Info;
    let bgColor = "#f3f4f6"; // gray-100
    let textColor = "#1f2937"; // gray-800
    let borderColor = "#e5e7eb"; // gray-200
    let label = status;

    switch (status) {
      case 'SYNCED':
      case 'CONFIRMED':
        Icon = ShieldCheck;
        bgColor = "#dcfce7"; // green-100
        textColor = "#166534"; // green-800
        borderColor = "#bbf7d0"; // green-200
        label = "Verified";
        break;
      case 'PENDING':
      case 'SUBMITTED':
      case 'CONFIRMING':
      case 'RETRYING':
        Icon = Clock;
        bgColor = "#dbeafe"; // blue-100
        textColor = "#1e40af"; // blue-800
        borderColor = "#bfdbfe"; // blue-200
        label = "Securing...";
        break;
      case 'FAILED':
      case 'REVERTED':
        Icon = ShieldAlert;
        bgColor = "#fee2e2"; // red-100
        textColor = "#991b1b"; // red-800
        borderColor = "#fecaca"; // red-200
        label = "Unverified";
        break;
    }
    return { Icon, bgColor, textColor, borderColor, label };
  }, [status]);

  const { Icon, bgColor, textColor, borderColor, label } = badgeConfig;

  const handlePress = React.useCallback(() => {
    if (txHash) {
      Linking.openURL(`https://amoy.polygonscan.com/tx/${txHash}`);
    }
  }, [txHash]);

  return (
    <Pressable 
      onPress={handlePress}
      disabled={!txHash}
      style={({ pressed }) => [
        styles.badge,
        { backgroundColor: bgColor, borderColor },
        pressed && txHash ? styles.pressed : null
      ]}
    >
      <Icon size={12} color={textColor} />
      {showText && (
        <Text style={[styles.text, { color: textColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.7,
  }
});
