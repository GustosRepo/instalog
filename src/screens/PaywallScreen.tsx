/**
 * Paywall Screen
 * Apple-style upgrade prompt — 2026 best practices
 */

import React, {useMemo, useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {Haptics} from '../utils/haptics';

// Product IDs - must match App Store Connect
const PRODUCT_IDS = {
  monthly: 'com.instalog.pro.monthly',
  yearly: 'com.instalog.pro.yearly',
};

interface PaywallScreenProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
}

const PaywallScreen: React.FC<PaywallScreenProps> = ({
  onDismiss,
  showDismiss = true,
}) => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const featureParam: string | undefined = route.params?.feature;

  const {
    setPro, 
    markPaywallSeen, 
    products,
    loadProducts,
    purchase,
    restorePurchases,
    isLoadingProducts,
  } = useSubscriptionStore();
  
  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  // Get product prices from loaded products
  const monthlyProduct = products.find(p => p.id === PRODUCT_IDS.monthly);
  const yearlyProduct = products.find(p => p.id === PRODUCT_IDS.yearly);

  // Yearly savings vs 12x monthly
  const savingsPercent = useMemo(() => {
    const monthly = parseFloat(monthlyProduct?.price ?? '3.99');
    const yearly = parseFloat(yearlyProduct?.price ?? '19.99');
    if (!monthly || !yearly) return 0;
    return Math.round((1 - yearly / (monthly * 12)) * 100);
  }, [monthlyProduct, yearlyProduct]);

  // Per-month equivalent for yearly plan
  const yearlyPerMonth = useMemo(() => {
    const yearly = parseFloat(yearlyProduct?.price ?? '19.99');
    const perMonth = (yearly / 12).toFixed(2);
    const symbol = (yearlyProduct?.displayPrice ?? '$19.99').replace(/[\d.,\s]/g, '')[0] ?? '$';
    return `${symbol}${perMonth}`;
  }, [yearlyProduct]);

  const selectedProduct = selectedPlan === 'monthly' ? monthlyProduct : yearlyProduct;
  const selectedDisplayPrice = selectedProduct?.displayPrice ?? (selectedPlan === 'yearly' ? '$19.99' : '$3.99');
  const selectedBillingPeriod = selectedPlan === 'yearly' ? 'year' : 'month';
  
  const handlePurchase = async () => {
    setIsLoading(true);
    Haptics.light();
    
    const productId = selectedPlan === 'monthly' ? PRODUCT_IDS.monthly : PRODUCT_IDS.yearly;
    
    try {
      const success = await purchase(productId);
      
      if (success) {
        markPaywallSeen();
        Haptics.success();
        
        Alert.alert(
          t('paywall.alertWelcomeTitle'),
          t('paywall.alertWelcomeMessage'),
          [{text: t('paywall.alertWelcomeContinue'), onPress: () => onDismiss?.() || navigation.goBack()}]
        );
      } else {
        Alert.alert(t('paywall.alertPurchaseFailedTitle'), t('paywall.alertPurchaseFailedMessage'));
      }
    } catch (error) {
      Alert.alert(t('paywall.alertPurchaseFailedTitle'), t('paywall.alertPurchaseFailedMessage'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestore = async () => {
    setIsRestoring(true);
    Haptics.light();
    
    try {
      const restored = await restorePurchases();
      
      if (restored) {
        Haptics.success();
        Alert.alert(t('paywall.alertRestoredTitle'), t('paywall.alertRestoredMessage'));
        onDismiss?.() || navigation.goBack();
      } else {
        Alert.alert(t('paywall.alertNoSubTitle'), t('paywall.alertNoSubMessage'));
      }
    } catch (error) {
      Alert.alert(t('paywall.alertRestoreFailedTitle'), t('paywall.alertRestoreFailedMessage'));
    } finally {
      setIsRestoring(false);
    }
  };
  
  const handleDismiss = () => {
    markPaywallSeen();
    Haptics.light();
    onDismiss?.() || navigation.goBack();
  };

  const handleSelectPlan = (plan: 'monthly' | 'yearly') => {
    if (plan !== selectedPlan) {
      Haptics.light();
      setSelectedPlan(plan);
    }
  };
  
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}} edges={['top']}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{paddingHorizontal: 24, paddingBottom: 20}}
        showsVerticalScrollIndicator={false}
      >
        {/* Dismiss button */}
        {showDismiss && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={{alignSelf: 'flex-end', paddingVertical: 12}}
          >
            <Text style={{color: '#9AA0A6', fontSize: 16}}>{t('paywall.dismissButton')}</Text>
          </TouchableOpacity>
        )}

        {!showDismiss && <View style={{height: 20}} />}

        {/* Icon */}
        <View style={{alignItems: 'center', marginBottom: 20}}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: '#6E6AF2',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{fontSize: 36}}>✓</Text>
          </View>
        </View>

        {/* Headline — context-aware */}
        <Text style={{
          color: '#EDEEF0',
          fontSize: 32,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 10,
        }}>
          {featureParam ? t('paywall.contextHeadline', {feature: featureParam}) : t('paywall.headline')}
        </Text>

        {/* Subheadline */}
        <Text style={{
          color: '#9AA0A6',
          fontSize: 17,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 24,
          paddingHorizontal: 16,
        }}>
          {t('paywall.subheadline')}
        </Text>

        {/* Benefits */}
        <View style={{marginBottom: 24}}>
          {[
            t('paywall.benefit1'),
            t('paywall.benefit2'),
            t('paywall.benefit3'),
            t('paywall.benefit4'),
            t('paywall.benefit5'),
          ].map((benefit, index) => (
            <View key={index} style={{flexDirection: 'row', marginBottom: 12, paddingHorizontal: 8}}>
              <Text style={{color: '#EDEEF0', fontSize: 15, flex: 1, lineHeight: 22}}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing Options */}
        <View style={{marginBottom: 20}}>
          {isLoadingProducts ? (
            <View style={{alignItems: 'center', paddingVertical: 32}}>
              <ActivityIndicator color="#6E6AF2" />
              <Text style={{color: '#9AA0A6', marginTop: 8}}>{t('paywall.loadingPrices')}</Text>
            </View>
          ) : (
            <>
              {/* Yearly */}
              <TouchableOpacity
                onPress={() => handleSelectPlan('yearly')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: selectedPlan === 'yearly' ? '#1A1D24' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedPlan === 'yearly' ? '#6E6AF2' : '#2A2D34',
                  borderRadius: 12,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  marginBottom: 12,
                }}
              >
                <View style={{flex: 1, paddingRight: 12}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4}}>
                    <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600'}}>
                      {t('paywall.planYearlyTitle')}
                    </Text>
                    {/* Most Popular badge */}
                    <View style={{
                      backgroundColor: '#6E6AF2',
                      borderRadius: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}>
                      <Text style={{color: '#FFFFFF', fontSize: 11, fontWeight: '600'}}>
                        {t('paywall.planYearlyBadge')}
                      </Text>
                    </View>
                  </View>
                  <Text style={{color: '#9AA0A6', fontSize: 13}}>
                    {t('paywall.planYearlySubtitle')}
                    {savingsPercent > 0 ? `  ·  ${t('paywall.planYearlySavings', {percent: savingsPercent})}` : ''}
                  </Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '800'}}>
                    {yearlyProduct?.displayPrice ?? '$19.99'}
                  </Text>
                  <Text style={{color: '#9AA0A6', fontSize: 12, marginTop: 2}}>
                    {t('paywall.planYearlyPerMonth', {price: yearlyPerMonth})}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                onPress={() => handleSelectPlan('monthly')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: selectedPlan === 'monthly' ? '#1A1D24' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedPlan === 'monthly' ? '#6E6AF2' : '#2A2D34',
                  borderRadius: 12,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}
              >
                <View style={{flex: 1, paddingRight: 12}}>
                  <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600', marginBottom: 4}}>
                    {t('paywall.planMonthlyTitle')}
                  </Text>
                  <Text style={{color: '#9AA0A6', fontSize: 13}}>
                    {t('paywall.planMonthlySubtitle')}
                  </Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '800'}}>
                    {monthlyProduct?.displayPrice ?? '$3.99'}
                  </Text>
                  <Text style={{color: '#9AA0A6', fontSize: 12, marginTop: 2}}>
                    {t('paywall.planMonthlyPerPeriod')}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={{
          color: '#9AA0A6',
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 19,
          paddingHorizontal: 8,
        }}>
          {t('paywall.legalChargeNotice', {price: selectedDisplayPrice, period: selectedBillingPeriod})}
        </Text>
      </ScrollView>

      {/* ── Sticky CTA strip ─────────────────────────────────────────────── */}
      <View style={{
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: insets.bottom + 12,
        backgroundColor: '#0B0D10',
        borderTopWidth: 1,
        borderTopColor: '#1A1D24',
      }}>
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={isLoading}
          style={{
            backgroundColor: '#6E6AF2',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 14,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{color: '#FFFFFF', fontSize: 17, fontWeight: '600'}}>
              {t('paywall.ctaButton', {price: selectedDisplayPrice, period: selectedBillingPeriod})}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore · EULA · Privacy — single compact row */}
        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 10}}>
          <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
            {isRestoring ? (
              <ActivityIndicator color="#9AA0A6" size="small" />
            ) : (
              <Text style={{color: '#9AA0A6', fontSize: 12}}>{t('paywall.restoreButton')}</Text>
            )}
          </TouchableOpacity>
          <Text style={{color: '#3A3D44', fontSize: 12}}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
            <Text style={{color: '#9AA0A6', fontSize: 12}}>{t('paywall.legalEULA')}</Text>
          </TouchableOpacity>
          <Text style={{color: '#3A3D44', fontSize: 12}}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.code-werx.com/instalog-privacy')}>
            <Text style={{color: '#9AA0A6', fontSize: 12}}>{t('paywall.legalPrivacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PaywallScreen;
