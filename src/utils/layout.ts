import {Platform} from 'react-native';

export const isIPad = Platform.OS === 'ios' && Platform.isPad;

/** Max content width for iPad — keeps everything readable and well-spaced. */
export const CONTENT_MAX_WIDTH = 680;
