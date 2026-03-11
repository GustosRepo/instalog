/**
 * Mood images for micro-interactions
 *
 * Each mood maps to one of 8 character illustrations.
 * Use getMood() for specific moments, getRandomPositiveMood() for celebrations.
 */

import {ImageSourcePropType} from 'react-native';

export const MOODS = {
  happy: require('../../assets/mood-happy.png') as ImageSourcePropType,
  upset: require('../../assets/mood-upset.png') as ImageSourcePropType,
  chill: require('../../assets/mood-chill.png') as ImageSourcePropType,
  confused: require('../../assets/mood-confused.png') as ImageSourcePropType,
  shocked: require('../../assets/mood-shocked.png') as ImageSourcePropType,
  sad: require('../../assets/mood-sad.png') as ImageSourcePropType,
  cheerful: require('../../assets/mood-cheerful.png') as ImageSourcePropType,
  heart: require('../../assets/mood-heart.png') as ImageSourcePropType,
};

export type MoodName = keyof typeof MOODS;

const POSITIVE_MOODS: MoodName[] = ['happy', 'cheerful', 'heart'];

export const getRandomPositiveMood = (): ImageSourcePropType => {
  const pick = POSITIVE_MOODS[Math.floor(Math.random() * POSITIVE_MOODS.length)];
  return MOODS[pick];
};
