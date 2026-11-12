import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface MedSyncLogoProps {
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  showBorder?: boolean;
}

const APP_LOGO = require('../../assets/images/app-logo.png');

export const MedSyncLogo: React.FC<MedSyncLogoProps> = React.memo(function MedSyncLogo({
  size = 48,
  borderRadius,
  style,
  showBorder = true,
}) {
  const radius = borderRadius ?? Math.round(size * 0.28);

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: showBorder ? 1 : 0,
        },
        style,
      ]}
    >
      <Image
        source={APP_LOGO}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
        fadeDuration={0}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#00040D',
    borderColor: 'rgba(56, 189, 248, 0.28)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

