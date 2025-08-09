import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme} from '@/contexts/ThemeContext'
const { width: screenWidth } = Dimensions.get('window');

interface SkeletonLoaderProps {
  viewMode: 'grid' | 'list';
}

export function SkeletonLoader({ viewMode }: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const {colors} = useTheme()
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getItemWidth = () => {
    const availableWidth = screenWidth * 0.9 - 18; // 70% minus padding
    console.log('width',availableWidth)
    if (availableWidth >= 1200) return (availableWidth - 24) / 4; // 4 columns
    if (availableWidth >= 768) return (availableWidth - 16) / 3; // 3 columns
    return (availableWidth - 8) / 2; // 2 columns
  };

  // LIST SKELETON
  if (viewMode === 'list') {
    return (
      <View style={[styles.listSkeleton, {backgroundColor: colors.card}]}>
        <Animated.View style={[styles.listImage, { opacity }]} />
        <View style={styles.listContent}>
          <Animated.View style={[styles.listTitle, { opacity }]} />
          <Animated.View style={[styles.listPrice, { opacity }]} />
          <Animated.View style={[styles.listDescription, { opacity }]} />
        </View>
        <Animated.View style={[styles.listButton, { opacity }]} />
      </View>
    );
  }

  return (
    <View style={[styles.gridSkeleton, { width: getItemWidth() }, {backgroundColor: colors.card}]}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <Animated.View style={[styles.skeletonTitle, { opacity }]} />
      <Animated.View style={[styles.skeletonPrice, { opacity }]} />
      <Animated.View style={[styles.skeletonButton, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  gridSkeleton: {
    borderRadius: 12,
    padding: 12,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 200,
    
  },
  deskTopgridSkeleton: {

  },
  listSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  listImage: {
    width: 60,
    height: 60,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 12,
  },
  listContent: {
    flex: 1,
    marginRight: 12,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
    width: '80%',
  },
  listTitle: {
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
    width: '70%',
  },
  skeletonPrice: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    width: '40%',
  },
  listPrice: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 4,
    width: '30%',
  },
  listDescription: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '90%',
  },
  skeletonButton: {
    width: 32,
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  listButton: {
    width: 40,
    height: 40,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
});