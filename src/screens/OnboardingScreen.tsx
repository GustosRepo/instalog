/**
 * Onboarding Screen
 * 3-screen flow introducing core value propositions
 */

import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from 'react-native';
import {useOnboardingStore} from '../stores/useOnboardingStore';
import {Haptics} from '../utils/haptics';
import {useTranslation} from 'react-i18next';

const {width, height} = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
}

const OnboardingScreen: React.FC = () => {
  const {t} = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const {completeOnboarding} = useOnboardingStore();

  const slides: OnboardingSlide[] = [
    {id: 1, title: t('onboarding.slide1Title'), subtitle: t('onboarding.slide1Subtitle'), emoji: '⚡'},
    {id: 2, title: t('onboarding.slide2Title'), subtitle: t('onboarding.slide2Subtitle'), emoji: '🪣'},
    {id: 3, title: t('onboarding.slide3Title'), subtitle: t('onboarding.slide3Subtitle'), emoji: '🕐'},
    {id: 4, title: t('onboarding.slide4Title'), subtitle: t('onboarding.slide4Subtitle'), emoji: '📈'},
  ];
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentIndex) {
      setCurrentIndex(slideIndex);
      Haptics.light();
    }
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
      Haptics.light();
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    Haptics.success();
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      completeOnboarding();
    });
  };

  const handleSkip = () => {
    Haptics.light();
    completeOnboarding();
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <Animated.View 
      style={{
        flex: 1, 
        backgroundColor: '#0B0D10',
        opacity: fadeAnim,
        transform: [{scale: scaleAnim}],
      }}
    >
      {/* Skip button */}
      <TouchableOpacity
        onPress={handleSkip}
        style={{
          position: 'absolute',
          top: 60,
          right: 24,
          zIndex: 10,
          padding: 8,
        }}
      >
        <Text style={{color: '#9AA0A6', fontSize: 16, fontWeight: '500'}}>
          {t('onboarding.skipButton')}
        </Text>
      </TouchableOpacity>

      {/* Mascot watermark */}
      <Image
        source={require('../../assets/logonobg.png')}
        style={{
          position: 'absolute',
          bottom: 100,
          left: -50,
          width: 250,
          height: 250,
          opacity: 0.08,
        }}
        resizeMode="contain"
      />

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={{
              width,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 40,
            }}
          >
            <Text style={{fontSize: 80, marginBottom: 32}}>
              {slide.emoji}
            </Text>
            <Text
              style={{
                color: '#EDEEF0',
                fontSize: 32,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {slide.title}
            </Text>
            <Text
              style={{
                color: '#9AA0A6',
                fontSize: 18,
                textAlign: 'center',
                lineHeight: 26,
              }}
            >
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={{paddingHorizontal: 24, paddingBottom: 60}}>
        {/* Dots */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {slides.map((_, index) => (
            <View
              key={index}
              style={{
                width: currentIndex === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: currentIndex === index ? '#6E6AF2' : '#3A3F47',
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={goToNext}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#6E6AF2',
            paddingVertical: 18,
            borderRadius: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{color: '#FFFFFF', fontSize: 18, fontWeight: '600'}}>
            {isLastSlide ? t('onboarding.getStartedButton') : t('onboarding.nextButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default OnboardingScreen;
