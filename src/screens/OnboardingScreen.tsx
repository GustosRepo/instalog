/**
 * Onboarding Screen
 * Language picker → 4 slides introducing current features
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
import {useLanguageStore, SUPPORTED_LANGUAGES, AppLanguage} from '../stores/useLanguageStore';
import {MOODS} from '../utils/moods';
import {ImageSourcePropType} from 'react-native';
import {isIPad, CONTENT_MAX_WIDTH} from '../utils/layout';

const {width} = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  mascot: ImageSourcePropType;
}

const OnboardingScreen: React.FC = () => {
  const {t} = useTranslation();
  const {language, setLanguage} = useLanguageStore();
  const [showSlides, setShowSlides] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const {completeOnboarding} = useOnboardingStore();

  const slides: OnboardingSlide[] = [
    {id: 1, title: t('onboarding.slide1Title'), subtitle: t('onboarding.slide1Subtitle'), mascot: MOODS.happy},
    {id: 2, title: t('onboarding.slide2Title'), subtitle: t('onboarding.slide2Subtitle'), mascot: MOODS.cheerful},
    {id: 3, title: t('onboarding.slide3Title'), subtitle: t('onboarding.slide3Subtitle'), mascot: MOODS.chill},
    {id: 4, title: t('onboarding.slide4Title'), subtitle: t('onboarding.slide4Subtitle'), mascot: MOODS.heart},
  ];

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Mascot entrance + float animations
  const mascotScale = useRef(new Animated.Value(0.6)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;
  const floatLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startMascotAnimation = () => {
    // Stop any running float loop
    floatLoopRef.current?.stop();
    mascotFloat.setValue(0);

    // Spring entrance
    Animated.parallel([
      Animated.spring(mascotScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle float loop after entrance settles
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(mascotFloat, {toValue: -10, duration: 1400, useNativeDriver: true}),
          Animated.timing(mascotFloat, {toValue: 0,  duration: 1400, useNativeDriver: true}),
        ])
      );
      floatLoopRef.current = loop;
      loop.start();
    });
  };

  // Reset + play mascot animation whenever the active slide changes
  React.useEffect(() => {
    mascotScale.setValue(0.6);
    mascotOpacity.setValue(0);
    startMascotAnimation();
    return () => { floatLoopRef.current?.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentIndex) {
      setCurrentIndex(slideIndex);
      Haptics.light();
    }
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({x: (currentIndex + 1) * width, animated: true});
      Haptics.light();
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    Haptics.success();
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 0, duration: 300, useNativeDriver: true}),
      Animated.timing(scaleAnim, {toValue: 0.9, duration: 300, useNativeDriver: true}),
    ]).start(() => completeOnboarding());
  };

  const isLastSlide = currentIndex === slides.length - 1;

  // ── Language Picker ──────────────────────────────────────────────────────
  if (!showSlides) {
    return (
      <View style={{flex: 1, backgroundColor: '#0B0D10', justifyContent: 'center'}}>
        <View style={{paddingHorizontal: 32, maxWidth: isIPad ? CONTENT_MAX_WIDTH : undefined, width: '100%', alignSelf: isIPad ? 'center' : undefined}}>
        <Image
          source={MOODS.cheerful}
          style={{width: 100, height: 100, alignSelf: 'center', marginBottom: 20}}
          resizeMode="contain"
        />
        <Text style={{color: '#EDEEF0', fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8}}>
          Instalog
        </Text>
        <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8}}>
          {t('onboarding.languageTitle')}
        </Text>
        <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', marginBottom: 40}}>
          {t('onboarding.languageSubtitle')}
        </Text>

        <View style={{gap: 12, marginBottom: 48}}>
          {SUPPORTED_LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => { setLanguage(lang.code as AppLanguage); Haptics.light(); }}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: language === lang.code ? '#6E6AF2' : '#1F2330',
                backgroundColor: language === lang.code ? '#6E6AF222' : '#141821',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600'}}>
                {lang.nativeLabel}
              </Text>
              {language === lang.code && (
                <Text style={{color: '#6E6AF2', fontSize: 18}}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => { setShowSlides(true); Haptics.light(); }}
          activeOpacity={0.8}
          style={{backgroundColor: '#6E6AF2', paddingVertical: 18, borderRadius: 14, alignItems: 'center'}}>
          <Text style={{color: '#FFFFFF', fontSize: 18, fontWeight: '600'}}>
            {t('onboarding.continueButton')}
          </Text>
        </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Slides ───────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={{flex: 1, backgroundColor: '#0B0D10', opacity: fadeAnim, transform: [{scale: scaleAnim}]}}>

      {/* Skip */}
      <TouchableOpacity
        onPress={handleGetStarted}
        style={{position: 'absolute', top: 60, right: 24, zIndex: 10, padding: 8}}>
        <Text style={{color: '#9AA0A6', fontSize: 16, fontWeight: '500'}}>
          {t('onboarding.skipButton')}
        </Text>
      </TouchableOpacity>

      {/* Mascot watermark */}
      <Image
        source={require('../../assets/logonobg.png')}
        style={{position: 'absolute', bottom: 100, left: -50, width: 250, height: 250, opacity: 0.08}}
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
        bounces={false}>
        {slides.map((slide, idx) => (
          <View
            key={slide.id}
            style={{width, flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <View style={{width: '100%', maxWidth: isIPad ? Math.min(560, width - 80) : width, alignSelf: 'center', paddingHorizontal: 40, alignItems: 'center'}}>
            <Animated.Image
              source={slide.mascot}
              style={[
                {width: 130, height: 130, marginBottom: 28},
                idx === currentIndex
                  ? {transform: [{scale: mascotScale}, {translateY: mascotFloat}], opacity: mascotOpacity}
                  : {opacity: 0},
              ]}
              resizeMode="contain"
            />
            <Text style={{color: '#EDEEF0', fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 16}}>
              {slide.title}
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 18, textAlign: 'center', lineHeight: 26}}>
              {slide.subtitle}
            </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={{paddingHorizontal: 24, paddingBottom: 60}}>
        <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 32}}>
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
        <TouchableOpacity
          onPress={goToNext}
          activeOpacity={0.8}
          style={{backgroundColor: '#6E6AF2', paddingVertical: 18, borderRadius: 14, alignItems: 'center'}}>
          <Text style={{color: '#FFFFFF', fontSize: 18, fontWeight: '600'}}>
            {isLastSlide ? t('onboarding.getStartedButton') : t('onboarding.nextButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default OnboardingScreen;

