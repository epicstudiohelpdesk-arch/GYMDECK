/**
 * GymDeck Owner Mobile - Standardized Avatar
 *
 * Renders member/staff photo or high-fidelity stylized vector portrait matching GymDeck Desktop.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '../../theme';
import { getDefaultAvatarXml } from '../../utils/avatarGenerator';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  gender?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showStatusDot?: boolean;
  statusDotColor?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoUrl,
  gender,
  size = 'md',
  showStatusDot = false,
  statusDotColor,
  style,
}) => {
  const { colors, radii } = useTheme();
  const [imgError, setImgError] = useState(false);

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { boxSize: 32, dotSize: 8 };
      case 'lg':
        return { boxSize: 52, dotSize: 12 };
      case 'md':
      default:
        return { boxSize: 42, dotSize: 10 };
    }
  };

  const dim = getDimensions();
  const hasValidPhoto = Boolean(photoUrl && photoUrl.trim().length > 0 && !imgError);

  // Generate deterministic premium SVG vector avatar matching desktop
  const defaultSvg = getDefaultAvatarXml(gender, name);

  return (
    <View style={[styles.wrapper, { width: dim.boxSize, height: dim.boxSize }, style]}>
      {hasValidPhoto ? (
        <Image
          source={{ uri: photoUrl! }}
          style={[
            styles.image,
            {
              width: dim.boxSize,
              height: dim.boxSize,
              borderRadius: radii.full,
              borderColor: colors.border,
            },
          ]}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.svgContainer,
            {
              width: dim.boxSize,
              height: dim.boxSize,
              borderRadius: radii.full,
              borderColor: colors.border,
              overflow: 'hidden',
            },
          ]}
        >
          <SvgXml xml={defaultSvg} width={dim.boxSize} height={dim.boxSize} />
        </View>
      )}

      {showStatusDot && (
        <View
          style={[
            styles.dot,
            {
              width: dim.dotSize,
              height: dim.dotSize,
              borderRadius: dim.dotSize / 2,
              backgroundColor: statusDotColor || colors.success,
              borderColor: colors.surface,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderWidth: 1,
  },
  svgContainer: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  dot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
  },
});
